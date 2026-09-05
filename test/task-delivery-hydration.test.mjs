import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildStandardDeliveryContinuityState,
  bootstrapStandardDeliveryContinuity,
  classifyDeliveryEvidence,
  classifyLocalDeliveryContracts,
  createStandardDeliveryContinuityCheckpoint,
  createGitHubEvidenceClient,
  createInvocationCommandCache,
  createPublicReleaseClients,
  discoverLocalDeliveryOutcomes,
  discoverRequiredStandardDeliveries,
  evaluateDeliveryEvidence,
  freezePublicReleaseTuple,
  hydratePriorStandardDeliveries,
  hydratePublicReleaseContext,
  inspectTaskQueue,
  normalizeHardenedDeliveryEvidence,
  parseStandardDeliveryContinuityTransitionToken,
  parseKywCiEvidence,
  redactPublicReleaseDiagnostics,
  runPublicRelease as executePublicRelease,
  STANDARD_DELIVERY_CONTINUITY_FILE,
} from "../src/core/task-artifacts.mjs";
import {
  gitPorcelainText,
  gitScalarText,
  parseHardenedWorkflowContract,
  parseProtectedMergeTaskIdentity,
  parseTerminalArtifactGitEntries,
  parseTerminalPairWorktreeStatus,
  probeCurrentStandardDeliveryState,
  reconcileAuthoritativeJobs,
  terminalArtifactGitModeClass,
  terminalArtifactNewlineEquivalent,
} from "../src/core/task-artifact-hydration.mjs";
import {
  classifyGitHubRelease,
  classifyGitTag,
  classifyNpmPublication,
  classifyPublicationWorkflow,
  derivePublicReleaseWorkflowInputs,
  recoverPublicReleaseSigningTuple,
} from "../src/core/task-artifact-public-release.mjs";
import { runTaskArtifactCommand } from "../skills/kyw-task/scripts/task-artifacts.mjs";
import {
  createSyntheticStandardDeliveryProbe,
  deriveStandardDeliveryFrontier,
  readAlignedMainStandardDeliveryCheckpoint,
  readRepositoryPorcelainStatus,
} from "./support/task-delivery-frontier.mjs";

const runPublicRelease = (options) => executePublicRelease({
  invocation: `$kyw-deliver --release ${options.tuple.package.version} --sha ${options.tuple.target.mergeSha}`,
  ...options,
});

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const REPOSITORY_TASKS_ROOT = path.join(REPOSITORY_ROOT, "docs", "tasks");

function retargetHardenedFixtureMerge(fixture, mergeSha) {
  fixture.outcome.mergeSha = mergeSha;
  fixture.snapshot.pullRequest.merge_commit_sha = mergeSha;
  fixture.snapshot.postMergeRun.headSha = mergeSha;
  for (const job of fixture.snapshot.postMergeJobs) {
    job.headSha = mergeSha;
    if (job.evidence) {
      job.evidence.expected_sha = mergeSha;
      job.evidence.actual_sha = mergeSha;
    }
  }
  return fixture;
}

function publicReleaseLocalRunner(trace) {
  return async ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    trace.push({ command, args: [...args], cwd });
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
      timeout: timeoutMs,
      maxBuffer,
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  };
}

function publicClientTuple({ archive, keyId = "SHA256:fixture", keyIds }) {
  const mergeSha = "d".repeat(40);
  const treeSha = "e".repeat(40);
  const sha256 = createHash("sha256").update(archive).digest("hex");
  return freezePublicReleaseTuple({
    schemaVersion: 1,
    taskId: "0085",
    repository: "owner/repository",
    baseBranch: "main",
    target: { mergeSha, treeSha },
    publishWorkflow: {
      id: 77,
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
      name: "kyw-dev",
      version: "2.0.0",
      repository: "git+https://github.com/owner/repository.git",
      access: "public",
      registry: "https://registry.npmjs.org/",
      tarball: {
        bytes: archive.length,
        integrity: `sha512-${createHash("sha512").update(archive).digest("base64")}`,
        shasum: createHash("sha1").update(archive).digest("hex"),
        sha256,
        entries: [".codex-plugin/plugin.json", "package.json", "src/index.mjs"],
      },
      signature: { required: true, keyId, ...(keyIds ? { keyIds } : {}) },
      provenance: {
        required: true,
        sourceRepository: "owner/repository",
        workflowPath: ".github/workflows/publish.yml",
        workflowRef: "refs/heads/main",
        sourceCommit: mergeSha,
        subjectSha256: sha256,
      },
      priorVersions: ["1.0.0"],
      priorLatest: "1.0.0",
    },
    plugin: { name: "kyw-dev", version: "2.0.0" },
    tag: { name: "v2.0.0", ref: "refs/tags/v2.0.0" },
    release: {
      tagName: "v2.0.0",
      title: "v2.0.0",
      body: "",
      draft: false,
      prerelease: false,
      generateReleaseNotes: false,
      assets: [],
    },
  });
}

function publicClientStandardFinal(tuple) {
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

async function publicClientHarness({
  useDefaultProvenanceVerifier = false,
  provenanceModuleLoader,
  multipleSigningKeys = false,
} = {}) {
  const archive = Buffer.from("exact fixture npm archive bytes", "utf8");
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const keyId = "SHA256:fixture";
  const rotatedKeyPair = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const tuple = publicClientTuple({ archive, keyId,
    ...(multipleSigningKeys ? { keyIds: [keyId, "SHA256:rotated"] } : {}) });
  const workflowText = (await readFile(
    path.join(REPOSITORY_ROOT, ".github", "workflows", "publish.yml"),
    "utf8",
  )).replaceAll("kimyeongwoo/kyw-dev", tuple.repository);
  const packageJson = {
    name: tuple.package.name,
    version: tuple.package.version,
    private: false,
    repository: { type: "git", url: tuple.package.repository },
    files: [".codex-plugin/", "src/"],
    publishConfig: { access: "public", registry: tuple.package.registry },
  };
  const pluginJson = { name: tuple.plugin.name, version: tuple.plugin.version };
  const state = {
    remoteHeadSha: tuple.target.mergeSha,
    workflow: "absent",
    npm: "absent",
    tag: "absent",
    release: "absent",
    runsIncomplete: false,
    jobsIncomplete: false,
    tagPageFull: false,
    releasePageFull: false,
    treeSha: tuple.target.treeSha,
    tarballTampered: false,
    compareStatus: "ahead",
    provenanceThrows: false,
    provenanceValid: true,
    tarballOrigin: "https://registry.npmjs.org",
    tarballPath: `/${tuple.package.name}/-/${tuple.package.name}-${tuple.package.version}.tgz`,
    indexVersionConflict: false,
    releaseByTagConflict: false,
    releaseAssetsMissing: false,
    workflowHeadSha: tuple.target.mergeSha,
    workflowHeadBranch: tuple.baseBranch,
    indexName: tuple.package.name,
    malformedTagEntry: false,
    malformedReleaseByTag: false,
    malformedReleaseListEntry: false,
    malformedSigningKey: false,
    extraActiveSigningKey: multipleSigningKeys,
    signingKeyMaterial: "valid",
    registrySignatureMode: "single",
    indexSignatureMode: undefined,
    registrySignatureSuffix: "",
    malformedProvenance: false,
    malformedUntypedAttestation: false,
    duplicateProvenance: false,
    signedStatementType: "https://in-toto.io/Statement/v1",
    signedPredicateType: "https://slsa.dev/provenance/v1",
    provenancePayloadType: "application/vnd.in-toto+json",
    provenancePayloadSuffix: "",
    provenanceSignatureSuffix: "",
    duplicateProvenanceSubject: false,
    dependencyField: undefined,
    publishConfigExtra: undefined,
    workflowId: tuple.publishWorkflow.id,
    runId: 501,
    runAttempt: 1,
    priorPublishConclusions: {},
    latestPublishConclusion: "success",
    jobRunId: undefined,
    jobId: 601,
    releaseId: 701,
  };
  const trace = [];
  const publicKeyBytes = publicKey.export({ type: "spki", format: "der" });
  const primarySignature = sign(
    "sha256",
    Buffer.from(
      `${tuple.package.name}@${tuple.package.version}:${tuple.package.tarball.integrity}`,
    ),
    privateKey,
  ).toString("base64");
  const secondarySignature = sign(
    "sha256",
    Buffer.from(
      `${tuple.package.name}@${tuple.package.version}:${tuple.package.tarball.integrity}`,
    ),
    privateKey,
  ).toString("base64");
  const rotatedSignature = sign("sha256", Buffer.from(
    `${tuple.package.name}@${tuple.package.version}:${tuple.package.tarball.integrity}`,
  ), rotatedKeyPair.privateKey).toString("base64");
  const wrongMessageSignature = sign(
    "sha256",
    Buffer.from(
      `${tuple.package.name}@${tuple.package.version}:sha512-${Buffer.alloc(64, 9).toString("base64")}`,
    ),
    privateKey,
  ).toString("base64");
  const registrySignatures = (mode = state.registrySignatureMode) => {
    const primary = {
      keyid: keyId,
      sig: `${primarySignature}${state.registrySignatureSuffix}`,
    };
    const secondary = { keyid: keyId, sig: secondarySignature };
    if (mode === "empty") return [];
    if (mode === "two-valid") return [primary, secondary];
    if (mode === "two-keys") return [primary, { keyid: "SHA256:rotated", sig: rotatedSignature }];
    if (mode === "bad-rotated") return [primary, { keyid: "SHA256:rotated", sig: secondarySignature }];
    if (mode === "mixed-key") {
      return [primary, { ...secondary, keyid: "SHA256:other-key" }];
    }
    if (mode === "wrong-first") {
      return [{ ...primary, keyid: "SHA256:other-key" }, secondary];
    }
    if (mode === "wrong-message") {
      return [{ keyid: keyId, sig: wrongMessageSignature }];
    }
    if (mode === "invalid-first") {
      return [
        { keyid: keyId, sig: Buffer.from("invalid first signature").toString("base64") },
        secondary,
      ];
    }
    if (mode === "invalid-second") {
      return [
        primary,
        { keyid: keyId, sig: Buffer.from("invalid second signature").toString("base64") },
      ];
    }
    return [primary];
  };
  const provenanceStatement = {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://slsa.dev/provenance/v1",
    subject: [
      {
        name: `pkg:npm/${tuple.package.name}@${tuple.package.version}`,
        digest: { sha512: createHash("sha512").update(archive).digest("hex") },
      },
    ],
    predicate: {
      buildDefinition: {
        buildType:
          "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1",
        externalParameters: {
          workflow: {
            repository: `https://github.com/${tuple.repository}`,
            path: tuple.publishWorkflow.path,
            ref: tuple.publishWorkflow.ref,
          },
        },
        resolvedDependencies: [
          { digest: { gitCommit: tuple.target.mergeSha } },
        ],
        internalParameters: { github: { event_name: "workflow_dispatch" } },
      },
      runDetails: {
        builder: { id: "https://github.com/actions/runner/github-hosted" },
        metadata: {
          invocationId: `https://github.com/${tuple.repository}/actions/runs/501/attempts/1`,
        },
      },
    },
  };
  const attestationBundle = {
    dsseEnvelope: {
      payloadType: "application/vnd.in-toto+json",
      payload: Buffer.from(JSON.stringify(provenanceStatement)).toString("base64"),
      signatures: [
        { sig: Buffer.from("fixture DSSE signature").toString("base64") },
      ],
    },
    verificationMaterial: { tlogEntries: [{}] },
  };
  const currentAttestationBundle = () => {
    const statement = structuredClone(provenanceStatement);
    statement.predicate.runDetails.metadata.invocationId = `https://github.com/${tuple.repository}/actions/runs/${state.runId}/attempts/${state.runAttempt}`;
    statement._type = state.signedStatementType;
    statement.predicateType = state.signedPredicateType;
    if (state.duplicateProvenanceSubject) {
      statement.subject.push(structuredClone(statement.subject[0]));
    }
    const bundle = {
      ...attestationBundle,
      dsseEnvelope: {
        ...attestationBundle.dsseEnvelope,
        payloadType: state.provenancePayloadType,
        payload: `${Buffer.from(JSON.stringify(statement)).toString("base64")}${state.provenancePayloadSuffix}`,
        signatures: attestationBundle.dsseEnvelope.signatures.map(
          (signatureEntry) => ({
            ...signatureEntry,
            sig: `${signatureEntry.sig}${state.provenanceSignatureSuffix}`,
          }),
        ),
      },
    };
    if (state.provenancePayloadType === undefined) {
      delete bundle.dsseEnvelope.payloadType;
    }
    return bundle;
  };

  const versionMetadata = (signatureMode = state.registrySignatureMode) => ({
    name: tuple.package.name,
    version: tuple.package.version,
    repository: { url: tuple.package.repository },
    gitHead: state.indexVersionConflict ? "c".repeat(40) : tuple.target.mergeSha,
    dist: {
      tarball: `${state.tarballOrigin}${state.tarballPath}`,
      integrity: tuple.package.tarball.integrity,
      shasum: tuple.package.tarball.shasum,
      signatures: registrySignatures(signatureMode),
    },
  });

  function jsonResult(value, status = 0, stderr = "") {
    return { status, stdout: status === 0 ? JSON.stringify(value) : "", stderr };
  }

  const commandRunner = async ({ command, args, cwd }) => {
    trace.push({ kind: "command", command, args: [...args], cwd });
    if (command === "git") {
      if (args[0] === "rev-parse") {
        return { status: 0, stdout: `${state.treeSha}\n`, stderr: "" };
      }
      if (args[0] === "show" && args[1].endsWith(":package.json")) {
        return {
          status: 0,
          stdout: JSON.stringify({
            ...packageJson,
            publishConfig: {
              ...packageJson.publishConfig,
              ...(state.publishConfigExtra
                ? { [state.publishConfigExtra]: "fixture-extra" }
                : {}),
            },
            ...(state.dependencyField
              ? { [state.dependencyField]: {} }
              : {}),
          }),
          stderr: "",
        };
      }
      if (args[0] === "show" && args[1].endsWith(":.codex-plugin/plugin.json")) {
        return { status: 0, stdout: JSON.stringify(pluginJson), stderr: "" };
      }
      if (args[0] === "show" && args[1].endsWith(`:${tuple.publishWorkflow.path}`)) {
        return { status: 0, stdout: workflowText, stderr: "" };
      }
      if (args[0] === "cat-file") return { status: 1, stdout: "", stderr: "" };
    }
    if (command === "gh" && args[0] === "run") {
      assert.equal(args[args.indexOf("--repo") + 1], `github.com/${tuple.repository}`);
      const dispatchInputs = Object.entries(
        derivePublicReleaseWorkflowInputs(tuple),
      )
        .map(([name, value]) => `${name}=${value}`)
        .join(" ");
      return {
        status: 0,
        stdout: [
          `KYWPUBLISHEVIDENCE schema=1 stage=dispatch repository=${tuple.repository} event=workflow_dispatch ref=${tuple.publishWorkflow.ref} ${dispatchInputs}`,
          `KYWPUBLISHEVIDENCE schema=1 stage=source expected_sha=${tuple.target.mergeSha} actual_sha=${tuple.target.mergeSha} package=${tuple.package.name} version=${tuple.package.version}`,
        ].join("\n"),
        stderr: "",
      };
    }
    if (command !== "gh" || args[0] !== "api") {
      throw new Error(`unexpected local fixture command ${command}`);
    }
    assert.equal(args[args.indexOf("--hostname") + 1], "github.com");
    const methodIndex = args.indexOf("--method");
    const method = args[methodIndex + 1];
    const endpoint = method === "GET" ? args.at(-1) : args[methodIndex + 2];
    if (method === "POST") {
      trace.push({ kind: "post", endpoint, args: [...args] });
      if (endpoint.endsWith("/dispatches")) state.workflow = "active";
      else if (endpoint.endsWith("/git/refs")) state.tag = "exact";
      else if (endpoint.endsWith("/releases")) state.release = "exact";
      return jsonResult({ id: 9001 });
    }
    if (endpoint.includes("/git/ref/heads/main")) {
      return jsonResult({
        ref: tuple.publishWorkflow.ref,
        object: { type: "commit", sha: state.remoteHeadSha },
      });
    }
    if (endpoint.includes("/compare/")) {
      return jsonResult({
        status: state.compareStatus,
        base_commit: { sha: tuple.target.mergeSha },
        merge_base_commit: { sha: tuple.target.mergeSha },
      });
    }
    if (endpoint.includes("/actions/workflows/publish.yml")) {
      return jsonResult({
        id: state.workflowId,
        name: tuple.publishWorkflow.name,
        path: tuple.publishWorkflow.path,
        state: "active",
      });
    }
    if (endpoint.includes("/actions/workflows/77/runs?")) {
      const run = {
        id: state.runId,
        run_attempt: state.runAttempt,
        event: "workflow_dispatch",
        ...(state.workflowHeadBranch === undefined
          ? {}
          : { head_branch: state.workflowHeadBranch }),
        ...(state.workflowHeadSha === undefined
          ? {}
          : { head_sha: state.workflowHeadSha }),
        status: state.workflow === "active" ? "queued" : "completed",
        conclusion: state.workflow === "success" ? "success" : state.workflow === "failed" ? "failure" : null,
      };
      const runs = state.workflow === "absent" ? [] : [run];
      return jsonResult({
        total_count: state.runsIncomplete ? runs.length + 1 : runs.length,
        workflow_runs: runs,
      });
    }
    const attemptMatch = /\/actions\/runs\/501\/attempts\/(\d+)\/jobs\?/.exec(endpoint);
    if (attemptMatch) {
      const attempt = Number(attemptMatch[1]);
      const jobs = [
        {
          id: state.jobId,
          run_id: state.jobRunId ?? state.runId,
          head_sha: tuple.target.mergeSha,
          name: "Publish exact npm checkout",
          run_attempt: attempt,
          steps: [
            {
              name: "Publish the exact checkout directory through OIDC",
              status: "completed",
              conclusion: attempt < state.runAttempt
                ? state.priorPublishConclusions[attempt] ?? "skipped"
                : state.latestPublishConclusion,
            },
          ],
        },
      ];
      return jsonResult({
        total_count: state.jobsIncomplete ? 2 : 1,
        jobs,
      });
    }
    if (endpoint.includes("/git/matching-refs/tags/")) {
      if (state.tagPageFull) {
        return jsonResult(
          Array.from({ length: 100 }, (_, index) => ({
            ref: `refs/tags/v2.0.0-prefix-${index}`,
            object: { type: "commit", sha: tuple.target.mergeSha },
          })),
        );
      }
      return jsonResult([
        ...(state.malformedTagEntry ? [{}] : []),
        ...([
          "exact",
          "annotated",
          "annotatedMissingIdentity",
          "annotatedWrongName",
          "nested",
        ].includes(state.tag)
          ? [
              {
                ref: tuple.tag.ref,
                object:
                  state.tag === "exact"
                    ? { type: "commit", sha: tuple.target.mergeSha }
                    : { type: "tag", sha: "9".repeat(40) },
              },
            ]
          : []),
        ...(state.tag === "namespace"
          ? [
              {
                ref: `${tuple.tag.ref}/child`,
                object: { type: "commit", sha: tuple.target.mergeSha },
              },
            ]
          : []),
        {
          ref: "refs/tags/v2.0.00",
          object: { type: "commit", sha: "f".repeat(40) },
        },
      ]);
    }
    if (endpoint.includes("/git/tags/")) {
      if (state.tag === "annotatedMissingIdentity") {
        return jsonResult({
          object: { type: "commit", sha: tuple.target.mergeSha },
        });
      }
      return jsonResult({
        sha: "9".repeat(40),
        tag:
          state.tag === "annotatedWrongName" ? "v9.9.9" : tuple.tag.name,
        object:
          state.tag === "nested"
            ? { type: "tag", sha: "8".repeat(40) }
            : { type: "commit", sha: tuple.target.mergeSha },
      });
    }
    if (endpoint.includes("/releases/tags/")) {
      if (state.malformedReleaseByTag) return jsonResult({ id: 701 });
      return state.release === "exact"
        ? jsonResult({
            id: state.releaseByTagConflict ? 702 : state.releaseId,
            tag_name: tuple.release.tagName,
            name: tuple.release.title,
            body: "",
            draft: false,
            prerelease: false,
            ...(!state.releaseAssetsMissing ? { assets: [] } : {}),
          })
        : jsonResult(null, 1, "HTTP 404 Not Found");
    }
    if (endpoint.includes("/releases?")) {
      if (state.releasePageFull) {
        return jsonResult(
          Array.from({ length: 100 }, (_, index) => ({
            id: index + 1,
            tag_name: `other-${index}`,
          })),
        );
      }
      return jsonResult(
        state.malformedReleaseListEntry
          ? [{}]
          : state.release === "exact"
          ? [
              {
                id: state.releaseId,
                tag_name: tuple.release.tagName,
                name: tuple.release.title,
                body: "",
                draft: false,
                prerelease: false,
                ...(!state.releaseAssetsMissing ? { assets: [] } : {}),
              },
            ]
          : [],
      );
    }
    throw new Error(`unexpected fixture GitHub endpoint ${endpoint}`);
  };

  const index = (includeTarget) => ({
    name: state.indexName,
    versions: {
      "1.0.0": {},
      ...(includeTarget
        ? {
            [tuple.package.version]: versionMetadata(
              state.indexSignatureMode ?? state.registrySignatureMode,
            ),
          }
        : {}),
    },
    "dist-tags": { latest: includeTarget ? tuple.package.version : "1.0.0" },
    time: { [tuple.package.version]: "2026-09-01T00:00:00.000Z" },
  });
  const fetchImpl = async (url, options) => {
    trace.push({ kind: "fetch", url: String(url), options });
    assert.equal(url.hostname, "registry.npmjs.org");
    assert.equal(options.cache, "no-store");
    assert.match(url.search, /kyw-public-read=/u);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === `/${tuple.package.name}/${tuple.package.version}`) {
      if (state.npm === "absent") return new Response("", { status: 404 });
      const metadata = versionMetadata();
      if (state.indexVersionConflict) metadata.gitHead = tuple.target.mergeSha;
      return Response.json(metadata);
    }
    if (pathname === `/${tuple.package.name}`) {
      return Response.json(index(state.npm === "exact"));
    }
    if (pathname === "/-/npm/v1/keys") {
      const keyMaterial =
        state.signingKeyMaterial === "noncanonical"
          ? "not canonical base64"
          : state.signingKeyMaterial === "unsupported"
            ? generateKeyPairSync("ed25519")
                .publicKey.export({ type: "spki", format: "der" })
                .toString("base64")
            : publicKeyBytes.toString("base64");
      return Response.json({
        keys: [
          {
            keyid: keyId,
            key: keyMaterial,
            expires: null,
          },
          ...(state.malformedSigningKey ? [{}] : []),
          ...(state.extraActiveSigningKey
            ? [
                {
                  keyid: "SHA256:rotated",
                  key: rotatedKeyPair.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
                  expires: null,
                },
              ]
            : []),
        ],
      });
    }
    if (pathname.startsWith("/-/npm/v1/attestations/")) {
      const currentBundle = currentAttestationBundle();
      return Response.json({
        attestations: [
          {
            predicateType: "https://slsa.dev/provenance/v1",
            bundle: currentBundle,
          },
          ...(state.malformedProvenance
            ? [
                {
                  predicateType: "https://slsa.dev/provenance/v1",
                  bundle: { dsseEnvelope: { payload: "not-json" } },
                },
              ]
            : []),
          ...(state.malformedUntypedAttestation ? [{}] : []),
          ...(state.duplicateProvenance
            ? [
                {
                  predicateType: "https://slsa.dev/provenance/v1",
                  bundle: currentBundle,
                },
              ]
            : []),
        ],
      });
    }
    if (pathname.endsWith(`/${tuple.package.name}-${tuple.package.version}.tgz`)) {
      return new Response(
        state.tarballTampered
          ? Buffer.concat([archive.subarray(0, -1), Buffer.from("X")])
          : archive,
      );
    }
    throw new Error(`unexpected fixture registry URL ${url}`);
  };
  let provenanceVerifications = 0;
  const expectedTarball = {
    archiveBytes: Buffer.from(archive),
    entries: [...tuple.package.tarball.entries],
  };
  const clientOptions = {
    repositoryRoot: REPOSITORY_ROOT,
    commandRunner,
    fetchImpl,
    expectedTarball,
    ...(useDefaultProvenanceVerifier
      ? { provenanceModuleLoader }
      : {
          provenanceVerifier: async (bundle, candidate) => {
            provenanceVerifications += 1;
            if (state.provenanceThrows) {
              const error = new Error("fixture verifier unavailable");
              error.code = "PUBLIC_RELEASE_PROVENANCE_VERIFIER_UNAVAILABLE";
              throw error;
            }
            assert.deepEqual(bundle, currentAttestationBundle());
            assert.deepEqual(candidate, tuple);
            return state.provenanceValid;
          },
        }),
  };
  const clients = createPublicReleaseClients(clientOptions);
  return { archive, clients, expectedTarball, state, trace, tuple, get provenanceVerifications() {
    return provenanceVerifications;
  } };
}

function assertBoundedLiveQueryCounts(diagnostics) {
  const { queryCounts, queryPolicy } = diagnostics;
  for (const key of [
    "commands",
    "gitCommands",
    "githubApiCommands",
    "jobLogFetches",
  ]) {
    assert.ok(Number.isInteger(queryCounts[key]) && queryCounts[key] >= 0, key);
  }
  assert.equal(queryPolicy.retries, 0);
  assert.ok(queryCounts.commands <= queryPolicy.maxCommands);
  assert.ok(queryCounts.gitCommands <= queryCounts.commands);
  assert.ok(queryCounts.githubApiCommands <= queryCounts.commands);
  assert.ok(queryCounts.jobLogFetches <= queryCounts.commands);
}

function task({
  id,
  status = "DONE",
  testStatus = status === "DONE" ? "PASSED" : status === "READY" ? "READY" : "RUNNING",
  delivery = "STANDARD",
  dependencies = [],
  contractVersion = 2,
  releaseVersion,
}) {
  return {
    id,
    number: Number(id),
    taskStatus: status,
    testStatus,
    contractVersion,
    dependencies,
    deliveryRequirement:
      delivery === "STANDARD"
        ? {
            kind: "STANDARD",
            ...(releaseVersion ? { releaseVersion } : {}),
          }
        : { kind: "NONE", reason: "fixture has no external delivery" },
  };
}

function publicReleaseTaskPair(id, releaseVersion) {
  const title = "Public release fixture";
  return Object.freeze({
    task: `# TASK ${id} — ${title}

<!-- kyw-task-contract: 4 -->

## Status

DONE

## Goal

Exercise immutable public-release hydration.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Hydrate one release tuple.

## Out of Scope

- Live external mutation.

## Acceptance Criteria

- [x] AC-01: Public-release hydration remains immutable.

## Plan

- [x] Hydrate the fixture.

## Decisions

- Keep the fixture deterministic.

## Risks

- Not applicable — the fixture uses injected clients.

## Discoveries and Changes

- Not applicable — no discovery changed the fixture.

## Documentation Impact

- SPEC: Unaffected.
- ARCHITECTURE: Unaffected.
- README: Unaffected.
- AGENTS: Unaffected.

## Delivery

- Requirement: STANDARD
- Release version: ${releaseVersion}
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Repository outcome verified.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
`,
    test: `# TEST ${id} — ${title}

<!-- kyw-task-contract: 4 -->

## Status

PASSED

## Test Basis

- Task: \`./TASK.md\`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 hydration | Run the fixture | Integration | PASS | Fixture passed. |

## Regression Coverage

- Terminal pair immutability.

## Commands

- Focused fixture.

## Results

- Fixture passed.

## Unverified

- Not applicable — no residual risk remains.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
`,
  });
}

function rejectingPublicClients(calls) {
  const reject = (method) => async () => {
    calls.push(method);
    throw new Error(`${method} must not run before Task-owned release identity is proven`);
  };
  return Object.fromEntries(
    [
      "readPublishWorkflowIdentity",
      "readPackageIndex",
      "readSigningKeys",
      "readWorkflowRuns",
      "readNpmVersion",
      "readTag",
      "readRelease",
      "dispatchPublishWorkflow",
      "createTag",
      "createRelease",
    ].map((method) => [method, reject(method)]),
  );
}

async function publicReleaseHydrationGuardFixture(
  t,
  {
    taskVersion = "2.0.0",
    packageVersion = taskVersion,
    pluginVersion = packageVersion,
  } = {},
) {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), "kyw-public-task-guard-"),
  );
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const tasksRoot = path.join(repositoryRoot, "docs", "tasks");
  const fixture = hardenedFixture();
  const taskId = fixture.outcome.taskId;
  const pair = publicReleaseTaskPair(taskId, taskVersion);
  const pairRoot = path.join(tasksRoot, `${taskId}-fixture`);
  const taskPath = path.join(pairRoot, "TASK.md");
  const repository = "owner/repository";
  const packageJson = {
    name: "kyw-dev",
    version: packageVersion,
    private: false,
    repository: {
      type: "git",
      url: `git+https://github.com/${repository}.git`,
    },
    type: "module",
    files: [".codex-plugin/", "src/"],
    publishConfig: {
      access: "public",
      registry: "https://registry.npmjs.org/",
    },
  };
  const workflowText = (await readFile(
    path.join(REPOSITORY_ROOT, ".github", "workflows", "publish.yml"),
    "utf8",
  )).replaceAll("kimyeongwoo/kyw-dev", repository);
  await Promise.all([
    mkdir(pairRoot, { recursive: true }),
    mkdir(path.join(repositoryRoot, ".github", "workflows"), {
      recursive: true,
    }),
    mkdir(path.join(repositoryRoot, ".codex-plugin"), { recursive: true }),
    mkdir(path.join(repositoryRoot, "src"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(repositoryRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`),
    writeFile(
      path.join(repositoryRoot, ".codex-plugin", "plugin.json"),
      `${JSON.stringify({ name: "kyw-dev", version: pluginVersion }, null, 2)}\n`,
    ),
    writeFile(
      path.join(repositoryRoot, ".github", "workflows", "publish.yml"),
      workflowText,
    ),
    writeFile(path.join(repositoryRoot, "src", "index.mjs"), "export const ok = true;\n"),
    writeFile(taskPath, pair.task),
    writeFile(path.join(pairRoot, "TEST.md"), pair.test),
  ]);
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "freeze public-release guard fixture"]);
  const mergeSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  retargetHardenedFixtureMerge(fixture, mergeSha);
  const normalized = normalizeFixture(fixture);
  return {
    tasksRoot,
    taskId,
    taskPath,
    pair,
    normalized,
    commandRunner: publicReleaseLocalRunner([]),
  };
}

function git(repositoryRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function futureTerminalFixture(
  t,
  {
    taskId = "0001",
    canonicalLineEndings = "LF",
    canonicalExecutable = false,
    contractVersion = 3,
    releaseVersion = contractVersion === 4 ? "2.0.0" : undefined,
  } = {},
) {
  const root = await mkdtemp(path.join(tmpdir(), "kyw-future-terminal-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tasksRoot = path.join(root, "docs", "tasks");
  const directoryName = `${taskId}-immutable`;
  const directory = path.join(tasksRoot, directoryName);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  const workflowPath = path.join(root, ".github", "workflows", "ci.yml");
  const taskLfBytes = `# TASK ${taskId} — Immutable

<!-- kyw-task-contract: ${contractVersion} -->

## Status

DONE

## Goal

Prove immutable terminal delivery behavior.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Exercise terminal pair enforcement.

## Out of Scope

- Do not mutate external state.

## Acceptance Criteria

- [x] AC-01: The immutable fixture is delivered.

## Plan

- [x] Deliver and verify the fixture.

## Decisions

- Keep the fixture deterministic.

## Risks

- Preserve exact terminal bytes.
- Reject semantic drift.

## Discoveries and Changes

- The fixture uses one expected-head PR merge.

## Documentation Impact

- SPEC: Unaffected.
- ARCHITECTURE: Unaffected.
- README: Unaffected.
- AGENTS: Unaffected.

## Delivery

- Requirement: STANDARD
${contractVersion === 4 ? `- Release version: ${releaseVersion}\n` : ""}- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Repository outcome verified.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
`;
  const testLfBytes = `# TEST ${taskId} — Immutable

<!-- kyw-task-contract: ${contractVersion} -->

## Status

PASSED

## Test Basis

- Task: \`./TASK.md\`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — immutable fixture delivery | Run the focused fixture. | Integration | PASS | Focused fixture passed. |

## Regression Coverage

- Preserve terminal delivery behavior.

## Commands

- Focused fixture.

## Results

- Focused fixture passed.

## Unverified

- Not applicable — no residual risk remains.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
`;
  assert.match(canonicalLineEndings, /^(?:LF|CRLF)$/);
  const taskBytes =
    canonicalLineEndings === "CRLF"
      ? taskLfBytes.replaceAll("\n", "\r\n")
      : taskLfBytes;
  const testBytes =
    canonicalLineEndings === "CRLF"
      ? testLfBytes.replaceAll("\n", "\r\n")
      : testLfBytes;
  await mkdir(path.dirname(workflowPath), { recursive: true });
  await writeFile(
    workflowPath,
    await readFile(path.join(REPOSITORY_ROOT, ".github", "workflows", "ci.yml"), "utf8"),
    "utf8",
  );
  await writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
  await writeFile(
    path.join(root, ".gitattributes"),
    canonicalLineEndings === "CRLF" ? "*.md -text\n" : "*.md text eol=lf\n",
    "utf8",
  );
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Future Terminal Fixture"]);
  git(root, ["config", "user.email", "future-terminal@example.invalid"]);
  git(root, ["config", "core.autocrlf", "false"]);
  git(root, ["add", "README.md", ".gitattributes", ".github/workflows/ci.yml"]);
  git(root, ["commit", "-m", "Initialize immutable delivery fixture"]);
  const canonicalBranch = `task/${taskId}-immutable`;
  git(root, ["switch", "-c", canonicalBranch]);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(taskPath, taskBytes, "utf8"),
    writeFile(testPath, testBytes, "utf8"),
  ]);
  git(root, ["add", `docs/tasks/${directoryName}`]);
  if (canonicalExecutable) {
    if (process.platform !== "win32") {
      await Promise.all([chmod(taskPath, 0o755), chmod(testPath, 0o755)]);
    }
    git(root, [
      "update-index",
      "--chmod=+x",
      "--",
      `docs/tasks/${directoryName}/TASK.md`,
      `docs/tasks/${directoryName}/TEST.md`,
    ]);
  }
  git(root, ["commit", "-m", "Complete immutable Task"]);
  const outcomeSha = git(root, ["rev-parse", "HEAD"]);
  git(root, ["switch", "main"]);
  git(root, [
    "merge",
    "--no-ff",
    canonicalBranch,
    "-m",
    `Merge pull request #1 from owner/${canonicalBranch}`,
  ]);
  let alignedMainSha = git(root, ["rev-parse", "HEAD"]);
  git(root, [
    "remote",
    "add",
    "origin",
    "https://github.com/owner/repository.git",
  ]);
  git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
  git(root, ["config", "branch.main.remote", "origin"]);
  git(root, ["config", "branch.main.merge", "refs/heads/main"]);
  let worktreeStatusOverride;
  const queueTask = {
    ...task({ id: taskId, contractVersion, releaseVersion }),
    name: directoryName,
    directory,
    taskPath,
    testPath,
  };
  const commandRunner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (
      command === "git" &&
      args[0] === "status" &&
      args.includes("--porcelain=v1") &&
      worktreeStatusOverride !== undefined
    ) {
      return {
        status: 0,
        signal: null,
        stdout: worktreeStatusOverride,
        stderr: "",
      };
    }
    if (command === "git" && args[0] === "ls-remote") {
      return {
        status: 0,
        signal: null,
        stdout: `${alignedMainSha}\trefs/heads/main\n`,
        stderr: "",
      };
    }
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer,
      shell: false,
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  };
  const deliveryCollector = async ({ local }) => {
    const outcome = local.outcomes[0];
    const created = createStandardDeliveryContinuityCheckpoint({
      repository: local.repository,
      sourceMainSha: local.currentMainSha,
      coveredRecords: [
        {
          taskId: queueTask.id,
          taskSha256: sha256(taskBytes),
          testSha256: sha256(testBytes),
          taskStatus: "DONE",
          testStatus: "PASSED",
          classification: "HARDENED_EXACT_HEAD",
          outcomeSha: outcome.outcomeSha,
          mergeSha: outcome.mergeSha,
          evidenceSha256: "a".repeat(64),
        },
      ],
    });
    const state = buildStandardDeliveryContinuityState({
      checkpoint: created.checkpoint,
      coveredTasks: [queueTask],
      coverageTasks: [queueTask],
    });
    return {
      ...state,
      classifications: Object.freeze({
        [queueTask.id]: "HARDENED_EXACT_HEAD",
      }),
      chronology: Object.freeze([]),
      githubMainSha: local.currentMainSha,
    };
  };
  const hydrate = () =>
    hydratePriorStandardDeliveries({
      tasksRoot,
      invocation: `$kyw-impl ${taskId}`,
      commandRunner,
      queueInspector: async () => ({ tasks: [queueTask], errors: [] }),
      deliveryCollector,
      allowUncheckpointedCompatibility: true,
    });
  const hydrateFromQueue = () =>
    hydratePriorStandardDeliveries({
      tasksRoot,
      invocation: `$kyw-impl ${taskId}`,
      commandRunner,
      deliveryCollector,
      allowUncheckpointedCompatibility: true,
    });
  return {
    root,
    tasksRoot,
    directory,
    taskPath,
    testPath,
    taskBytes,
    testBytes,
    outcomeSha,
    queueTask,
    hydrate,
    hydrateFromQueue,
    discover: () =>
      discoverLocalDeliveryOutcomes({
        tasksRoot,
        requiredTasks: [queueTask],
        contractTasks: [queueTask],
        commandCache: createInvocationCommandCache({ runner: commandRunner }),
      }),
    setWorktreeStatusOverride(value) {
      worktreeStatusOverride = value;
    },
    async checkpointDelivery() {
      const checkpoint = createStandardDeliveryContinuityCheckpoint({
        repository: "owner/repository",
        sourceMainSha: alignedMainSha,
        coveredRecords: [
          {
            taskId: queueTask.id,
            taskSha256: sha256(taskBytes),
            testSha256: sha256(testBytes),
            taskStatus: "DONE",
            testStatus: "PASSED",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha,
            mergeSha: alignedMainSha,
            evidenceSha256: "b".repeat(64),
          },
        ],
      }).checkpoint;
      await writeFile(
        path.join(tasksRoot, STANDARD_DELIVERY_CONTINUITY_FILE),
        `${JSON.stringify(checkpoint, null, 2)}\n`,
        "utf8",
      );
      git(root, ["add", `docs/tasks/${STANDARD_DELIVERY_CONTINUITY_FILE}`]);
      git(root, ["commit", "-m", "Record immutable delivery continuity"]);
      alignedMainSha = git(root, ["rev-parse", "HEAD"]);
      git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
      const githubClient = {
        async getMainRef() {
          return { object: { sha: alignedMainSha } };
        },
      };
      return () =>
        hydratePriorStandardDeliveries({
          tasksRoot,
          invocation: `$kyw-impl ${taskId}`,
          commandRunner,
          githubClient,
        });
    },
    advanceMain() {
      alignedMainSha = git(root, ["rev-parse", "HEAD"]);
      git(root, ["update-ref", "refs/remotes/origin/main", alignedMainSha]);
      return alignedMainSha;
    },
    async addProtectedMerge({ branch, subject, fileName }) {
      git(root, ["switch", "-c", branch]);
      await writeFile(path.join(root, fileName), `${subject}\n`, "utf8");
      git(root, ["add", fileName]);
      git(root, ["commit", "-m", `Prepare ${branch}`]);
      git(root, ["switch", "main"]);
      git(root, ["merge", "--no-ff", branch, "-m", subject]);
      return this.advanceMain();
    },
  };
}

test("required delivery discovery is empty when the selected Task has no prior outcome", () => {
  const tasks = [task({ id: "0001", status: "READY" })];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-impl 0001",
      managedRoutingAvailable: false,
    }).map(({ id }) => id),
    [],
  );
});

test("required delivery discovery retains implementation candidates for evidence-relative frontier selection", () => {
  const tasks = [
    task({ id: "0001" }),
    task({ id: "0002", delivery: "NONE" }),
    task({ id: "0003", status: "BLOCKED", testStatus: "BLOCKED" }),
    task({ id: "0004", dependencies: ["0001"] }),
    task({ id: "0005", status: "READY", dependencies: ["0004"] }),
    task({ id: "0006" }),
  ];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-impl 0005",
      managedRoutingAvailable: false,
    }).map(({ id }) => id),
    ["0001", "0004"],
  );
});

test("exact delivery discovery returns predecessors only and keeps selected evidence separate", async () => {
  const tasks = [
    task({ id: "0001" }),
    task({ id: "0002", dependencies: ["0001"] }),
  ];
  assert.deepEqual(
    discoverRequiredStandardDeliveries({
      tasks,
      invocation: "$kyw-deliver 0002",
    }).map(({ id }) => id),
    ["0001"],
  );

  let currentCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-deliver 0002",
    allowUncheckpointedCompatibility: true,
    queueInspector: async () => ({ tasks: [tasks[1]], errors: [] }),
    localDiscovery: async () => {
      throw new Error("prior discovery must remain empty");
    },
    currentDeliveryHydrator: async ({ task: selected, contractTasks }) => {
      currentCalls += 1;
      assert.equal(selected.id, "0002");
      assert.deepEqual(contractTasks.map(({ id }) => id), ["0002"]);
      return {
        deliveryLedger: {},
        deliveryExpectations: {},
        classifications: { "0002": "PENDING" },
        chronology: [],
        diagnostics: {
          taskId: "0002",
          state: "RESUMABLE",
          source: "IN_FLIGHT_NO_CANONICAL_MERGE",
        },
      };
    },
  });
  assert.equal(currentCalls, 1);
  assert.deepEqual(hydrated.diagnostics.requiredTaskIds, []);
  assert.equal(hydrated.diagnostics.currentDelivery.taskId, "0002");
  assert.deepEqual(hydrated.deliveryLedger, {});
});

test("only exact delivery invokes branch-bound partial current probing", async () => {
  const selected = task({ id: "0001" });
  const localDiscovery = async () => {
    const error = new Error(
      "Task 0001 LOCAL_GIT: could not map the terminal pair to an exact two-parent Task delivery merge",
    );
    error.code = "DELIVERY_HYDRATION_FAILED";
    throw error;
  };
  let probeCalls = 0;
  const currentDeliveryProbe = async ({ task: current }) => {
    probeCalls += 1;
    return {
      deliveryLedger: {},
      deliveryExpectations: {},
      classifications: { [current.id]: "PENDING" },
      chronology: [],
      diagnostics: {
        taskId: current.id,
        state: "RESUMABLE",
        source: "DELIVERY_PARTIAL_PROBE",
      },
    };
  };
  const implementation = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-impl 0001",
    allowUncheckpointedCompatibility: true,
    queueInspector: async () => ({ tasks: [selected], errors: [] }),
    localDiscovery,
    currentDeliveryProbe,
  });
  assert.equal(probeCalls, 0);
  assert.equal(
    implementation.diagnostics.currentDelivery.source,
    "IMPLEMENTATION_DELIVERY_HANDOFF",
  );

  const delivery = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-deliver 0001",
    allowUncheckpointedCompatibility: true,
    queueInspector: async () => ({ tasks: [selected], errors: [] }),
    localDiscovery,
    currentDeliveryProbe,
  });
  assert.equal(probeCalls, 1);
  assert.equal(
    delivery.diagnostics.currentDelivery.source,
    "DELIVERY_PARTIAL_PROBE",
  );
});

test("canonical merged delivery resumes at post-main CI without partial branch probing", async () => {
  const selected = task({ id: "0001" });
  let partialProbeCalls = 0;
  const pending = new Error("required post-main workflow is still in progress");
  pending.code = "DELIVERY_HYDRATION_PENDING";
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-deliver 0001",
    allowUncheckpointedCompatibility: true,
    queueInspector: async () => ({ tasks: [selected], errors: [] }),
    localDiscovery: async () => ({
      outcomes: [{ taskId: "0001" }],
    }),
    deliveryCollector: async () => {
      throw pending;
    },
    currentDeliveryProbe: async () => {
      partialProbeCalls += 1;
      throw new Error("partial pre-merge probe must not run after canonical merge");
    },
  });
  assert.equal(partialProbeCalls, 0);
  assert.equal(
    hydrated.diagnostics.currentDelivery.stage,
    "OBSERVE_POST_MAIN_CI",
  );
  assert.equal(
    hydrated.diagnostics.currentDelivery.source,
    "CANONICAL_DELIVERY_GRAPH_PENDING",
  );
});

test("managed implementation routes stop at the earliest pending delivery frontier", async () => {
  const tasks = [
    task({ id: "0100" }),
    task({ id: "0101" }),
    task({ id: "0102" }),
  ];
  for (const invocation of ["task 진행해줘", "남은 task 계속 실행해줘"]) {
    assert.deepEqual(
      discoverRequiredStandardDeliveries({
        tasks,
        invocation,
        managedRoutingAvailable: true,
      }).map(({ id }) => id),
      ["0100", "0101", "0102"],
      invocation,
    );
    const checkpoint = createStandardDeliveryContinuityCheckpoint({
      repository: "owner/repository",
      sourceMainSha: "f".repeat(40),
      coveredRecords: [],
    }).checkpoint;
    let currentCalls = 0;
    const hydrated = await hydratePriorStandardDeliveries({
      tasksRoot: "C:\\fixture\\docs\\tasks",
      invocation,
      managedRoutingAvailable: true,
      queueInspector: async () => ({ tasks, errors: [] }),
      continuityLoader: async ({ maxUncoveredTasks }) => {
        assert.equal(maxUncoveredTasks, 128);
        return {
          checkpoint,
          partition: { coveredTasks: [], uncoveredTasks: tasks },
          coveragePartition: { coveredTasks: [], uncoveredTasks: tasks },
          coverageTasks: tasks,
          recoveredImmutableTaskIds: [],
          source: "ALIGNED_MAIN",
          identity: {
            repository: "owner/repository",
            currentMainSha: "f".repeat(40),
            upstreamSha: "f".repeat(40),
            cachedMainSha: "f".repeat(40),
            directRemoteSha: "f".repeat(40),
            githubMainSha: "f".repeat(40),
            githubClient: {},
          },
        };
      },
      localDiscovery: async ({ requiredTasks }) => {
        const [selected] = requiredTasks;
        const error = new Error(
          `Task ${selected.id} LOCAL_GIT: could not map the terminal pair to an exact two-parent Task delivery merge`,
        );
        error.code = "DELIVERY_HYDRATION_FAILED";
        throw error;
      },
      currentDeliveryHydrator: async ({ task: selected, contractTasks }) => {
        currentCalls += 1;
        assert.equal(selected.id, "0100", invocation);
        assert.deepEqual(contractTasks.map(({ id }) => id), ["0100"]);
        return {
          deliveryLedger: {},
          deliveryExpectations: {},
          classifications: { "0100": "PENDING" },
          chronology: [],
          diagnostics: {
            taskId: "0100",
            state: "RESUMABLE",
            source: "IN_FLIGHT_NO_CANONICAL_MERGE",
          },
        };
      },
    });
    assert.equal(currentCalls, 1, invocation);
    assert.equal(hydrated.diagnostics.currentDelivery.taskId, "0100");
    assert.deepEqual(hydrated.diagnostics.continuity.uncoveredTaskIds, [
      "0100",
      "0101",
    ]);
  }
});

test("exact implementation hands off an earlier pending terminal delivery", async () => {
  const covered = task({ id: "0100" });
  const pendingPredecessor = task({ id: "0101" });
  const laterSelected = task({ id: "0102" });
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "f".repeat(40),
    coveredRecords: [
      {
        taskId: "0100",
        taskSha256: "1".repeat(64),
        testSha256: "2".repeat(64),
        taskStatus: "DONE",
        testStatus: "PASSED",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "3".repeat(40),
        mergeSha: "4".repeat(40),
        evidenceSha256: "5".repeat(64),
      },
    ],
  }).checkpoint;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-impl 0102",
    queueInspector: async () => ({
      tasks: [covered, pendingPredecessor, laterSelected],
      errors: [],
    }),
    continuityLoader: async ({
      requiredTasks,
      currentDeliveryTaskId,
      maxUncoveredTasks,
    }) => {
      assert.deepEqual(requiredTasks.map(({ id }) => id), ["0100", "0101"]);
      assert.equal(currentDeliveryTaskId, "0102");
      assert.equal(maxUncoveredTasks, 1);
      return {
        checkpoint,
        partition: {
          coveredTasks: [covered],
          uncoveredTasks: [pendingPredecessor],
        },
        coveragePartition: {
          coveredTasks: [covered],
          uncoveredTasks: [pendingPredecessor],
        },
        coverageTasks: [covered, pendingPredecessor],
        recoveredImmutableTaskIds: [],
        source: "ALIGNED_MAIN",
        identity: {
          repository: "owner/repository",
          currentMainSha: "f".repeat(40),
          upstreamSha: "f".repeat(40),
          cachedMainSha: "f".repeat(40),
          directRemoteSha: "f".repeat(40),
          githubMainSha: "f".repeat(40),
          githubClient: {},
        },
      };
    },
    localDiscovery: async () => {
      const error = new Error(
        "Task 0101 LOCAL_GIT: could not map the terminal pair to an exact two-parent Task delivery merge",
      );
      error.code = "DELIVERY_HYDRATION_FAILED";
      throw error;
    },
    currentDeliveryHydrator: async ({ task: current }) => ({
      deliveryLedger: {},
      deliveryExpectations: {},
      classifications: { [current.id]: "PENDING" },
      chronology: [],
      diagnostics: {
        taskId: current.id,
        state: "RESUMABLE",
        source: "IMPLEMENTATION_DELIVERY_HANDOFF",
      },
    }),
  });
  assert.equal(hydrated.diagnostics.currentDelivery.taskId, "0101");
  assert.equal(hydrated.deliveryLedger["0102"], undefined);
});

test("exact later implementation still rejects more than one uncovered predecessor", async () => {
  const predecessors = [task({ id: "0100" }), task({ id: "0101" })];
  const selected = task({ id: "0102" });
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "f".repeat(40),
    coveredRecords: [],
  }).checkpoint;
  await assert.rejects(
    hydratePriorStandardDeliveries({
      tasksRoot: "C:\\fixture\\docs\\tasks",
      invocation: "$kyw-impl 0102",
      queueInspector: async () => ({
        tasks: [...predecessors, selected],
        errors: [],
      }),
      continuityLoader: async () => ({
        checkpoint,
        partition: {
          coveredTasks: [],
          uncoveredTasks: predecessors,
        },
        coveragePartition: {
          coveredTasks: [],
          uncoveredTasks: predecessors,
        },
        coverageTasks: predecessors,
        recoveredImmutableTaskIds: [],
        source: "ALIGNED_MAIN",
        identity: {
          repository: "owner/repository",
          currentMainSha: "f".repeat(40),
          upstreamSha: "f".repeat(40),
          cachedMainSha: "f".repeat(40),
          directRemoteSha: "f".repeat(40),
          githubMainSha: "f".repeat(40),
          githubClient: {},
        },
      }),
    }),
    (error) => error.code === "DELIVERY_CONTINUITY_REBASELINE_REQUIRED",
  );
});

test("current delivery probe preserves safe PR resume and rejects latest failure or review drift", async () => {
  const selected = task({ id: "0084", contractVersion: 3 });
  const mainSha = "a".repeat(40);
  const headSha = "b".repeat(40);
  const branch = "task/0084-current-delivery-probe";
  const workflowText = await readFile(
    path.join(REPOSITORY_ROOT, ".github", "workflows", "ci.yml"),
    "utf8",
  );
  const workflowContract = parseHardenedWorkflowContract(workflowText);
  const commandCache = {
    async run({ args }) {
      const key = args.join("\u0000");
      const stdout =
        key === "rev-parse\u0000--show-toplevel"
          ? `${REPOSITORY_ROOT}\n`
          : key === "rev-parse\u0000refs/heads/main" ||
              key === "rev-parse\u0000main@{upstream}" ||
              key === "rev-parse\u0000refs/remotes/origin/main"
            ? `${mainSha}\n`
            : key === "remote\u0000get-url\u0000origin"
              ? "https://github.com/owner/repository.git\n"
              : key === "ls-remote\u0000--heads\u0000origin\u0000refs/heads/main"
                ? `${mainSha}\trefs/heads/main\n`
                : key === "symbolic-ref\u0000--quiet\u0000--short\u0000HEAD"
                  ? `${branch}\n`
                  : key === "rev-parse\u0000HEAD"
                    ? `${headSha}\n`
                    : key ===
                        `ls-remote\u0000--heads\u0000origin\u0000refs/heads/${branch}`
                      ? `${headSha}\trefs/heads/${branch}\n`
                      : key === `show\u0000${headSha}:.github/workflows/ci.yml`
                        ? workflowText
                        : "";
      return { status: 0, stdout, stderr: "" };
    },
    stats() {
      return { hits: 0, misses: 0, entries: 0, maxCommands: 1024 };
    },
  };
  const pullRequest = {
    number: 84,
    state: "open",
    merged: false,
    draft: false,
    mergeable: null,
    mergeable_state: "unknown",
    head: {
      sha: headSha,
      ref: branch,
      repo: { full_name: "owner/repository" },
    },
    base: {
      sha: mainSha,
      ref: "main",
      repo: { full_name: "owner/repository" },
    },
  };
  const run = (status, conclusion = null) => ({
    id: 8401,
    run_attempt: 2,
    workflow_id: 71,
    name: "CI",
    path: ".github/workflows/ci.yml",
    event: "pull_request",
    head_branch: branch,
    head_sha: headSha,
    status,
    conclusion,
    created_at: "2026-09-03T00:00:00Z",
    pull_requests: [{ number: 84 }],
  });
  let reviewFetches = 0;
  const client = ({
    runState = run("in_progress"),
    reviews = [],
    pullRequestState = pullRequest,
    pullRequests,
    jobs = [],
    workflowState = "active",
  } = {}) => ({
    async getMainRef() {
      return { object: { sha: mainSha } };
    },
    async getWorkflow() {
      return {
        id: 71,
        name: "CI",
        path: ".github/workflows/ci.yml",
        state: workflowState,
      };
    },
    async listPullRequests() {
      return structuredClone(pullRequests ?? [pullRequestState]);
    },
    async listReviews() {
      reviewFetches += 1;
      return structuredClone(reviews);
    },
    async listRuns() {
      return [structuredClone(runState)];
    },
    async listJobs() {
      return structuredClone(jobs);
    },
  });

  const pairStatusKey = [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    `:(glob)docs/tasks/${selected.id}-*/TASK.md`,
    `:(glob)docs/tasks/${selected.id}-*/TEST.md`,
  ].join("\u0000");
  const stageCache = ({
    localHead = headSha,
    remoteHead = headSha,
    pairStatus = "",
    unscopedWorktreeStatus = "",
  } = {}) => {
    const ancestryQueries = [];
    const statusQueries = [];
    return {
      ...commandCache,
      ancestryQueries,
      statusQueries,
      async run(request) {
        const key = request.args.join("\u0000");
        if (key === "rev-parse\u0000HEAD") {
          return { status: 0, stdout: `${localHead}\n`, stderr: "" };
        }
        if (
          key ===
          `ls-remote\u0000--heads\u0000origin\u0000refs/heads/${branch}`
        ) {
          return {
            status: 0,
            stdout: remoteHead
              ? `${remoteHead}\trefs/heads/${branch}\n`
              : "",
            stderr: "",
          };
        }
        if (key === pairStatusKey) {
          statusQueries.push(key);
          return { status: 0, stdout: pairStatus, stderr: "" };
        }
        if (key === "status\u0000--porcelain=v1\u0000--untracked-files=all") {
          statusQueries.push(key);
          return { status: 0, stdout: unscopedWorktreeStatus, stderr: "" };
        }
        if (key.startsWith("merge-base\u0000--is-ancestor\u0000")) {
          ancestryQueries.push(key);
          return { status: 0, stdout: "", stderr: "" };
        }
        if (key === `show\u0000${localHead}:.github/workflows/ci.yml`) {
          return { status: 0, stdout: workflowText, stderr: "" };
        }
        return commandCache.run(request);
      },
    };
  };
  for (const [expectedStage, cache] of [
    ["COMMIT", stageCache({ localHead: mainSha, remoteHead: null })],
    ["PUSH", stageCache({ remoteHead: null })],
    ["CREATE_PR", stageCache()],
  ]) {
    const staged = await probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache: cache,
      githubClient: client({ pullRequests: [] }),
    });
    assert.equal(staged.diagnostics.stage, expectedStage);
  }

  const dirtyExistingPullRequest = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache: stageCache({
      pairStatus: " M docs/tasks/0084-fixture/TASK.md\n",
    }),
    githubClient: client(),
  });
  assert.equal(dirtyExistingPullRequest.diagnostics.stage, "COMMIT");

  const unrelatedOnlyCache = stageCache({
    unscopedWorktreeStatus: "?? unrelated-user-note.txt\n",
  });
  const unrelatedOnlyWork = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache: unrelatedOnlyCache,
    githubClient: client(),
  });
  assert.equal(unrelatedOnlyWork.diagnostics.stage, "OBSERVE_ACTUAL_HEAD_CI");
  assert.deepEqual(unrelatedOnlyCache.statusQueries, [pairStatusKey]);

  const repairedHead = "d".repeat(40);
  const existingPullRequestUpdateCache = stageCache({ localHead: repairedHead });
  const existingPullRequestUpdate = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache: existingPullRequestUpdateCache,
    githubClient: client(),
  });
  assert.equal(existingPullRequestUpdate.diagnostics.stage, "PUSH");
  assert.ok(
    existingPullRequestUpdateCache.ancestryQueries.includes(
      `merge-base\u0000--is-ancestor\u0000${headSha}\u0000${repairedHead}`,
    ),
  );

  const repairedHeadWithoutPullRequest = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache: stageCache({ localHead: repairedHead }),
    githubClient: client({ pullRequests: [] }),
  });
  assert.equal(repairedHeadWithoutPullRequest.diagnostics.stage, "PUSH");

  const dirtyRepairedHead = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache: stageCache({
      localHead: repairedHead,
      pairStatus: " M docs/tasks/0084-fixture/TEST.md\n",
    }),
    githubClient: client(),
  });
  assert.equal(dirtyRepairedHead.diagnostics.stage, "COMMIT");

  const summaryDrifts = [
    (candidate) => {
      candidate.draft = true;
    },
    (candidate) => {
      candidate.state = "closed";
    },
    (candidate) => {
      candidate.merged = true;
    },
    (candidate) => {
      candidate.head.sha = "e".repeat(40);
    },
    (candidate) => {
      candidate.head.ref = "task/other";
    },
    (candidate) => {
      candidate.head.repo.full_name = "other/repository";
    },
    (candidate) => {
      candidate.base.sha = "e".repeat(40);
    },
    (candidate) => {
      candidate.base.ref = "trunk";
    },
    (candidate) => {
      candidate.base.repo.full_name = "other/repository";
    },
  ];
  for (const drift of summaryDrifts) {
    const unusablePullRequest = structuredClone(pullRequest);
    drift(unusablePullRequest);
    for (const cache of [
      stageCache({ localHead: repairedHead }),
      stageCache({
        pairStatus: " M docs/tasks/0084-fixture/TASK.md\n",
      }),
    ]) {
      await assert.rejects(
        probeCurrentStandardDeliveryState({
          tasksRoot: REPOSITORY_TASKS_ROOT,
          task: selected,
          commandCache: cache,
          githubClient: client({ pullRequestState: unusablePullRequest }),
        }),
        /CURRENT_PULL_REQUEST/,
      );
    }
  }

  const divergentRepairCache = {
    ...stageCache({ localHead: repairedHead }),
    async run(request) {
      if (
        request.args.join("\u0000") ===
        `merge-base\u0000--is-ancestor\u0000${headSha}\u0000${repairedHead}`
      ) {
        return { status: 1, stdout: "", stderr: "" };
      }
      return stageCache({ localHead: repairedHead }).run(request);
    },
  };
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache: divergentRepairCache,
      githubClient: client(),
    }),
    /remote selected head diverges from the local selected head/,
  );

  for (const [stage, cache] of [
    ["PUSH", stageCache({ remoteHead: null })],
    ["CREATE_PR", stageCache()],
  ]) {
    const malformedWorkflowCache = {
      ...cache,
      async run(request) {
        if (
          request.args.join("\u0000") ===
          `show\u0000${headSha}:.github/workflows/ci.yml`
        ) {
          return { status: 0, stdout: "name: malformed\n", stderr: "" };
        }
        return cache.run(request);
      },
    };
    await assert.rejects(
      probeCurrentStandardDeliveryState({
        tasksRoot: REPOSITORY_TASKS_ROOT,
        task: selected,
        commandCache: malformedWorkflowCache,
        githubClient: client({ pullRequests: [] }),
      }),
      /workflow contract/i,
      `${stage} must reject a malformed local workflow`,
    );
    await assert.rejects(
      probeCurrentStandardDeliveryState({
        tasksRoot: REPOSITORY_TASKS_ROOT,
        task: selected,
        commandCache: cache,
        githubClient: client({
          pullRequests: [],
          workflowState: "disabled_manually",
        }),
      }),
      /workflow ID\/name\/path\/state is malformed or unexpected/,
      `${stage} must reject an inactive GitHub workflow`,
    );
  }

  const pending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache,
    githubClient: client(),
  });
  assert.equal(pending.diagnostics.stage, "OBSERVE_ACTUAL_HEAD_CI");
  assert.equal(
    classifyDeliveryEvidence(
      "0084",
      pending.deliveryLedger["0084"],
      pending.deliveryExpectations["0084"],
    ).disposition,
    "RESUMABLE",
  );

  const partialJobs = [
    ...workflowContract.actualHeadJobs.map((name, index) => ({
      id: 8500 + index,
      run_id: 8401,
      run_attempt: 2,
      name,
      head_sha: headSha,
      status: "completed",
      conclusion: "success",
    })),
    {
      id: 8600,
      run_id: 8401,
      run_attempt: 2,
      name: workflowContract.mergeCompatibilityJob,
      head_sha: headSha,
      status: "in_progress",
      conclusion: null,
    },
  ];
  const syntheticPending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache,
    githubClient: client({ jobs: partialJobs }),
  });
  assert.equal(
    syntheticPending.diagnostics.stage,
    "OBSERVE_ACTUAL_HEAD_CI",
  );
  const failedKnownJob = {
    id: 8700,
    run_id: 8401,
    run_attempt: 2,
    name: workflowContract.mergeCompatibilityJob,
    head_sha: headSha,
    status: "completed",
    conclusion: "failure",
  };
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache,
      githubClient: client({ jobs: [failedKnownJob] }),
    }),
    (error) =>
      error.code === "DELIVERY_BLOCKED" &&
      /latest job .* is completed\/failure/.test(error.message),
  );

  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache,
      githubClient: client({ runState: run("completed", "failure") }),
    }),
    (error) =>
      error.code === "DELIVERY_BLOCKED" &&
      /latest run 8401 attempt 2 is completed\/failure/.test(error.message),
  );

  const driftedPullRequest = structuredClone(pullRequest);
  driftedPullRequest.head.sha = "c".repeat(40);
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache,
      githubClient: client({ pullRequestState: driftedPullRequest }),
    }),
    /CURRENT_PULL_REQUEST: head SHA must equal/,
  );

  const nestedPrefixCache = {
    ...commandCache,
    async run(request) {
      if (request.args.join("\u0000") === "symbolic-ref\u0000--quiet\u0000--short\u0000HEAD") {
        return {
          status: 0,
          stdout: "evil/task/0084-current-delivery-probe\n",
          stderr: "",
        };
      }
      return commandCache.run(request);
    },
  };
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache: nestedPrefixCache,
      githubClient: client(),
    }),
    /current branch does not prove selected-Task ownership/,
  );

  const missingRemoteCache = {
    ...commandCache,
    async run(request) {
      if (
        request.args.join("\u0000") ===
        `ls-remote\u0000--heads\u0000origin\u0000refs/heads/${branch}`
      ) {
        return { status: 0, stdout: "", stderr: "" };
      }
      return commandCache.run(request);
    },
  };
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: selected,
      commandCache: missingRemoteCache,
      githubClient: client(),
    }),
    /pull-request history exists but the exact remote selected branch is missing/,
  );

  const protectedBlockedPullRequest = structuredClone(pullRequest);
  protectedBlockedPullRequest.mergeable = false;
  protectedBlockedPullRequest.mergeable_state = "blocked";
  const protectedActualHeadPending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache,
    githubClient: client({
      pullRequestState: protectedBlockedPullRequest,
    }),
  });
  assert.equal(
    protectedActualHeadPending.diagnostics.stage,
    "OBSERVE_ACTUAL_HEAD_CI",
  );
  const protectedSyntheticPending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache,
    githubClient: client({
      pullRequestState: protectedBlockedPullRequest,
      jobs: partialJobs,
    }),
  });
  assert.equal(
    protectedSyntheticPending.diagnostics.stage,
    "OBSERVE_ACTUAL_HEAD_CI",
  );

  const requestedChanges = [
    {
      user: { login: "reviewer" },
      state: "CHANGES_REQUESTED",
      submitted_at: "2026-09-03T00:01:00Z",
    },
  ];
  const reviewActualHeadPending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache,
    githubClient: client({
      reviews: requestedChanges,
    }),
  });
  assert.equal(
    reviewActualHeadPending.diagnostics.stage,
    "OBSERVE_ACTUAL_HEAD_CI",
  );
  assert.equal(reviewFetches, 0);
  assert.equal(
    reviewActualHeadPending.deliveryLedger["0084"].pullRequest.review,
    "PENDING",
  );
  assert.equal(
    classifyDeliveryEvidence(
      "0084",
      reviewActualHeadPending.deliveryLedger["0084"],
      reviewActualHeadPending.deliveryExpectations["0084"],
    ).disposition,
    "RESUMABLE",
  );
  const reviewSyntheticPending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: selected,
    commandCache,
    githubClient: client({
      reviews: requestedChanges,
      jobs: partialJobs,
    }),
  });
  assert.equal(
    reviewSyntheticPending.diagnostics.stage,
    "OBSERVE_ACTUAL_HEAD_CI",
  );
  assert.equal(reviewFetches, 0);
  assert.equal(
    reviewSyntheticPending.deliveryLedger["0084"].pullRequest.review,
    "PENDING",
  );
  const reviewClassification = classifyDeliveryEvidence(
    "0084",
    reviewSyntheticPending.deliveryLedger["0084"],
    reviewSyntheticPending.deliveryExpectations["0084"],
  );
  assert.equal(reviewClassification.disposition, "RESUMABLE");
});

test("future terminal delivery binds canonical pair bytes and rejects worktree mutation before dispatch", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const unchanged = await fixture.hydrate();
  assert.equal(
    evaluateDeliveryEvidence(
      "0001",
      unchanged.deliveryLedger["0001"],
      unchanged.deliveryExpectations["0001"],
    ).satisfied,
    true,
  );

  for (const scenario of [
    {
      name: "TASK.md bytes",
      path: fixture.taskPath,
      mutate: () => writeFile(fixture.taskPath, `${fixture.taskBytes}\nchanged\n`, "utf8"),
      restore: () => writeFile(fixture.taskPath, fixture.taskBytes, "utf8"),
    },
    {
      name: "TEST.md bytes",
      path: fixture.testPath,
      mutate: () => writeFile(fixture.testPath, `${fixture.testBytes}\nchanged\n`, "utf8"),
      restore: () => writeFile(fixture.testPath, fixture.testBytes, "utf8"),
    },
    {
      name: "TASK.md deletion",
      path: fixture.taskPath,
      mutate: () => rm(fixture.taskPath),
      restore: () => writeFile(fixture.taskPath, fixture.taskBytes, "utf8"),
    },
    {
      name: "TASK.md rename",
      path: fixture.taskPath,
      mutate: () => rename(fixture.taskPath, `${fixture.taskPath}.moved`),
      restore: () => rename(`${fixture.taskPath}.moved`, fixture.taskPath),
    },
    {
      name: "TASK.md unsupported replacement",
      path: fixture.taskPath,
      mutate: async () => {
        await rm(fixture.taskPath);
        await mkdir(fixture.taskPath);
      },
      restore: async () => {
        await rm(fixture.taskPath, { recursive: true });
        await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
      },
    },
  ]) {
    await scenario.mutate();
    await assert.rejects(
      fixture.hydrate(),
      (error) =>
        error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
        error.message.includes("Task 0001") &&
        error.message.includes(
          path.relative(fixture.root, scenario.path).replaceAll("\\", "/"),
        ) &&
        error.message.includes('$kyw-task "<correction outcome>"'),
      scenario.name,
    );
    await scenario.restore();
  }

  const shadowDirectory = path.join(fixture.tasksRoot, "0001-shadow");
  await mkdir(shadowDirectory);
  await Promise.all([
    writeFile(path.join(shadowDirectory, "TASK.md"), fixture.taskBytes, "utf8"),
    writeFile(path.join(shadowDirectory, "TEST.md"), fixture.testBytes, "utf8"),
  ]);
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /0001-shadow\/(?:TASK|TEST)\.md/.test(error.message),
  );
});

test("production queue validation cannot mask delivered pair deletion or rename", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const unchanged = await fixture.hydrateFromQueue();
  assert.equal(
    evaluateDeliveryEvidence(
      "0001",
      unchanged.deliveryLedger["0001"],
      unchanged.deliveryExpectations["0001"],
    ).satisfied,
    true,
  );

  await rm(fixture.taskPath);
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message) &&
      error.message.includes('$kyw-task "<correction outcome>"'),
  );
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");

  const movedDirectory = path.join(fixture.tasksRoot, "0001-moved");
  await rename(fixture.directory, movedDirectory);
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message),
  );
  await rename(movedDirectory, fixture.directory);

  const confusedDirectory = path.join(
    fixture.tasksRoot,
    "0001-IMMUTABLE-SHADOW",
  );
  await mkdir(confusedDirectory);
  await Promise.all([
    writeFile(path.join(confusedDirectory, "TASK.md"), fixture.taskBytes, "utf8"),
    writeFile(path.join(confusedDirectory, "TEST.md"), fixture.testBytes, "utf8"),
  ]);
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /0001-IMMUTABLE-SHADOW\/(?:TASK|TEST)\.md/.test(error.message),
  );
});

test("production queue validation cannot mask a delivered pair link", async (t) => {
  const fixture = await futureTerminalFixture(t);
  await rm(fixture.taskPath);
  try {
    await symlink(path.basename(fixture.testPath), fixture.taskPath, "file");
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      t.skip("file symlink creation is unavailable on this host");
      return;
    }
    throw error;
  }
  await assert.rejects(
    fixture.hydrateFromQueue(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message) &&
      /link|symbolic|unsupported filesystem type/i.test(error.message) &&
      !/malformed|ambiguous/i.test(error.message),
  );
});

test("terminal artifact newline equivalence converts only worktree CRLF pairs toward canonical bytes", () => {
  for (const [canonical, worktree] of [
    ["line1\nline2\n", "line1\nline2\n"],
    ["line1\r\nline2\r\n", "line1\r\nline2\r\n"],
    ["line1\nline2\n", "line1\r\nline2\r\n"],
    ["line1\n\nline2\n", "line1\r\n\r\nline2\r\n"],
    ["line1\nline2", "line1\r\nline2"],
  ]) {
    assert.equal(terminalArtifactNewlineEquivalent(canonical, worktree), true);
  }
  for (const [canonical, worktree] of [
    ["line1\r\nline2\r\n", "line1\nline2\n"],
    ["line1\r\nline2", "line1\nline2"],
    ["line1\nline2\n", "line1\r\nchanged\r\n"],
    ["line1\nline2\n", "line1\r\nline2\r\nadded\r\n"],
    ["line1\nline2\n", "line1\r\n"],
    ["line1\nline2\n", "line1\r\nline2 \r\n"],
    ["line1 \nline2\n", "line1\r\nline2\r\n"],
    ["line1\nline2\n", "line1\r\nline2"],
    ["line1\nline2\n", "line1\rline2\n"],
    ["line1\r\nline2\r\n", "line1\r\r\nline2\r\r\n"],
    ["café\n", "cafe\u0301\r\n"],
  ]) {
    assert.equal(terminalArtifactNewlineEquivalent(canonical, worktree), false);
  }
});

test("terminal artifact Git entry parsing preserves regular-file mode classes and exact stages", () => {
  const taskRelative = "docs/tasks/0001-immutable/TASK.md";
  const testRelative = "docs/tasks/0001-immutable/TEST.md";
  assert.deepEqual(
    parseTerminalArtifactGitEntries(
      `100644 blob ${"a".repeat(40)}\t${taskRelative}\n100755 blob ${"b".repeat(40)}\t${testRelative}\n`,
      { source: "tree" },
    ),
    [
      {
        mode: "100644",
        type: "blob",
        objectSha: "a".repeat(40),
        relativePath: taskRelative,
      },
      {
        mode: "100755",
        type: "blob",
        objectSha: "b".repeat(40),
        relativePath: testRelative,
      },
    ],
  );
  assert.deepEqual(
    parseTerminalArtifactGitEntries(
      `100644 ${"a".repeat(40)} 0\t${taskRelative}\n100755 ${"b".repeat(40)} 0\t${testRelative}\n`,
      { source: "index" },
    ),
    [
      {
        mode: "100644",
        objectSha: "a".repeat(40),
        stage: 0,
        relativePath: taskRelative,
      },
      {
        mode: "100755",
        objectSha: "b".repeat(40),
        stage: 0,
        relativePath: testRelative,
      },
    ],
  );
  assert.equal(terminalArtifactGitModeClass("100644"), "REGULAR_FILE");
  assert.equal(terminalArtifactGitModeClass("100755"), "EXECUTABLE_FILE");
  assert.equal(terminalArtifactGitModeClass("120000"), undefined);
  assert.equal(
    parseTerminalArtifactGitEntries(
      `100644 ${"a".repeat(40)} 4\t${taskRelative}\n`,
      { source: "index" },
    ),
    undefined,
  );
});

test("terminal newline exception is directional and requires a real worktree byte difference", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const taskRelative = "docs/tasks/0001-immutable/TASK.md";

  fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /worktree state shadows the canonical terminal artifact/.test(error.message),
  );

  await writeFile(
    fixture.taskPath,
    fixture.taskBytes.replaceAll("\n", "\r\n"),
    "utf8",
  );
  fixture.setWorktreeStatusOverride("");
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /terminal artifact bytes differ from the canonical merge/.test(error.message),
  );
  fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
  await fixture.hydrate();
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
  fixture.setWorktreeStatusOverride(undefined);

  const hydrateCovered = await fixture.checkpointDelivery();
  fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /worktree state shadows the canonical terminal artifact/.test(error.message),
  );
  await writeFile(
    fixture.taskPath,
    fixture.taskBytes.replaceAll("\n", "\r\n"),
    "utf8",
  );
  fixture.setWorktreeStatusOverride("");
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /terminal artifact bytes differ from the canonical merge/.test(error.message),
  );
  fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
  await hydrateCovered();
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
  fixture.setWorktreeStatusOverride(undefined);

  const reverse = await futureTerminalFixture(t, {
    taskId: "0002",
    canonicalLineEndings: "CRLF",
  });
  const reverseRelative = "docs/tasks/0002-immutable/TASK.md";
  await writeFile(
    reverse.taskPath,
    reverse.taskBytes.replaceAll("\r\n", "\n"),
    "utf8",
  );
  reverse.setWorktreeStatusOverride(` M ${reverseRelative}\n`);
  await assert.rejects(
    reverse.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(reverseRelative) &&
      /terminal artifact bytes differ from the canonical merge/.test(error.message),
  );
  await writeFile(
    reverse.taskPath,
    reverse.taskBytes.replaceAll("\r\n", "\r\r\n"),
    "utf8",
  );
  reverse.setWorktreeStatusOverride(` M ${reverseRelative}\n`);
  await assert.rejects(
    reverse.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(reverseRelative) &&
      /terminal artifact bytes differ from the canonical merge/.test(error.message),
  );
  await writeFile(reverse.taskPath, reverse.taskBytes, "utf8");
  reverse.setWorktreeStatusOverride(undefined);
  const hydrateReverseCovered = await reverse.checkpointDelivery();
  await writeFile(
    reverse.taskPath,
    reverse.taskBytes.replaceAll("\r\n", "\n"),
    "utf8",
  );
  reverse.setWorktreeStatusOverride(` M ${reverseRelative}\n`);
  await assert.rejects(
    hydrateReverseCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(reverseRelative) &&
      /terminal artifact bytes differ from the canonical merge/.test(error.message),
  );
  await writeFile(
    reverse.taskPath,
    reverse.taskBytes.replaceAll("\r\n", "\r\r\n"),
    "utf8",
  );
  reverse.setWorktreeStatusOverride(` M ${reverseRelative}\n`);
  await assert.rejects(
    hydrateReverseCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(reverseRelative) &&
      /terminal artifact bytes differ from the canonical merge/.test(error.message),
  );
});

test("terminal-pair Git modes bind canonical, index, and supported worktree executable state", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const taskRelative = "docs/tasks/0001-immutable/TASK.md";
  const testRelative = "docs/tasks/0001-immutable/TEST.md";
  await fixture.hydrate();

  git(fixture.root, ["update-index", "--chmod=+x", "--", taskRelative]);
  fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /mode/i.test(error.message),
  );
  await writeFile(
    fixture.taskPath,
    fixture.taskBytes.replaceAll("\n", "\r\n"),
    "utf8",
  );
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /mode/i.test(error.message),
  );
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
  git(fixture.root, ["update-index", "--chmod=-x", "--", taskRelative]);
  fixture.setWorktreeStatusOverride(undefined);

  git(fixture.root, ["rm", "--cached", "--", testRelative]);
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(testRelative) &&
      !error.message.includes(taskRelative) &&
      /index mode or stage/i.test(error.message),
  );
  git(fixture.root, ["add", "--", testRelative]);

  const hydrateCovered = await fixture.checkpointDelivery();
  await hydrateCovered();
  git(fixture.root, ["update-index", "--chmod=+x", "--", taskRelative]);
  fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /mode/i.test(error.message),
  );
  await writeFile(
    fixture.taskPath,
    fixture.taskBytes.replaceAll("\n", "\r\n"),
    "utf8",
  );
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes(taskRelative) &&
      /mode/i.test(error.message),
  );
  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
  git(fixture.root, ["update-index", "--chmod=-x", "--", taskRelative]);
  fixture.setWorktreeStatusOverride(undefined);

  const executable = await futureTerminalFixture(t, {
    taskId: "0002",
    canonicalExecutable: true,
  });
  await executable.hydrate();
  const hydrateExecutableCovered = await executable.checkpointDelivery();
  await hydrateExecutableCovered();
});

test(
  "POSIX terminal-pair chmod wins over newline equivalence",
  {
    skip:
      process.platform === "win32"
        ? "POSIX executable-bit worktree state is unavailable on Windows"
        : false,
  },
  async (t) => {
    const fixture = await futureTerminalFixture(t);
    const taskRelative = "docs/tasks/0001-immutable/TASK.md";
    git(fixture.root, ["config", "core.filemode", "true"]);

    const assertWorktreeModeAttacks = async (hydrate, phase) => {
      await chmod(fixture.taskPath, 0o755);
      assert.equal(
        readRepositoryPorcelainStatus(fixture.root),
        ` M ${taskRelative}\n`,
        `${phase} chmod status`,
      );
      await assert.rejects(
        hydrate(),
        (error) =>
          error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
          error.message.includes(taskRelative) &&
          /mode/i.test(error.message),
        `${phase} chmod-only`,
      );
      await writeFile(
        fixture.taskPath,
        fixture.taskBytes.replaceAll("\n", "\r\n"),
        "utf8",
      );
      assert.equal(
        readRepositoryPorcelainStatus(fixture.root),
        ` M ${taskRelative}\n`,
        `${phase} chmod plus CRLF status`,
      );
      await assert.rejects(
        hydrate(),
        (error) =>
          error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
          error.message.includes(taskRelative) &&
          /mode/i.test(error.message),
        `${phase} chmod plus CRLF`,
      );
      await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
      await chmod(fixture.taskPath, 0o644);
      assert.equal(readRepositoryPorcelainStatus(fixture.root), "");
    };

    await assertWorktreeModeAttacks(fixture.hydrate, "fresh");
    const hydrateCovered = await fixture.checkpointDelivery();
    await assertWorktreeModeAttacks(hydrateCovered, "covered");
  },
);

test("terminal-pair type, rename, and copy states cannot use newline equivalence", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const taskRelative = "docs/tasks/0001-immutable/TASK.md";
  const testRelative = "docs/tasks/0001-immutable/TEST.md";
  const unsafeStates = [
    ["index type change", `T  ${taskRelative}\n`, taskRelative],
    ["worktree type change", ` T ${testRelative}\n`, testRelative],
    [
      "rename",
      `R  docs/tasks/0001-immutable/previous.md -> ${taskRelative}\n`,
      taskRelative,
    ],
    [
      "copy",
      `C  docs/tasks/0001-immutable/source.md -> ${testRelative}\n`,
      testRelative,
    ],
  ];
  const assertUnsafeStates = async (hydrate, phase) => {
    for (const [label, statusText, relativePath] of unsafeStates) {
      fixture.setWorktreeStatusOverride(statusText);
      await assert.rejects(
        hydrate(),
        (error) =>
          error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
          error.message.includes(relativePath) &&
          /worktree state shadows the canonical terminal artifact/.test(
            error.message,
          ) &&
          !/malformed|ambiguous/i.test(error.message),
        `${phase} ${label}`,
      );
    }
  };

  await assertUnsafeStates(fixture.hydrate, "fresh");
  fixture.setWorktreeStatusOverride(undefined);
  const hydrateCovered = await fixture.checkpointDelivery();
  await hydrateCovered();
  await assertUnsafeStates(hydrateCovered, "covered");
  fixture.setWorktreeStatusOverride(undefined);
});

test("terminal-pair porcelain parsing preserves exact first paths and rejects malformed records", () => {
  assert.deepEqual(
    parseTerminalPairWorktreeStatus(
      " M docs/tasks/0001-immutable/TASK.md\n M docs/tasks/0001-immutable/TEST.md\n",
      "0001",
    ),
    [
      {
        code: " M",
        relativePaths: ["docs/tasks/0001-immutable/TASK.md"],
      },
      {
        code: " M",
        relativePaths: ["docs/tasks/0001-immutable/TEST.md"],
      },
    ],
  );
  const typeChanges = parseTerminalPairWorktreeStatus(
    " T docs/tasks/0001-immutable/TASK.md\nT  docs/tasks/0001-immutable/TEST.md\n",
    "0001",
  );
  assert.deepEqual(typeChanges, [
    {
      code: " T",
      relativePaths: ["docs/tasks/0001-immutable/TASK.md"],
    },
    {
      code: "T ",
      relativePaths: ["docs/tasks/0001-immutable/TEST.md"],
    },
  ]);
  assert.equal(typeChanges[0].code[0], " ");
  assert.deepEqual(
    parseTerminalPairWorktreeStatus(
      "R  docs/tasks/0001-immutable/previous.md -> docs/tasks/0001-immutable/TASK.md\nC  docs/tasks/0001-immutable/source.md -> docs/tasks/0001-immutable/TEST.md\n",
      "0001",
    ),
    [
      {
        code: "R ",
        relativePaths: [
          "docs/tasks/0001-immutable/previous.md",
          "docs/tasks/0001-immutable/TASK.md",
        ],
      },
      {
        code: "C ",
        relativePaths: [
          "docs/tasks/0001-immutable/source.md",
          "docs/tasks/0001-immutable/TEST.md",
        ],
      },
    ],
  );
  for (const statusText of [
    " Mdocs/tasks/0001-immutable/TASK.md\n",
    " M \n",
    "XY docs/tasks/0001-immutable/TASK.md\n",
    "R  docs/tasks/0001-immutable/TASK.md\n",
    " M docs/tasks/0001-immutable/TASK.md\n\n",
  ]) {
    assert.throws(
      () => parseTerminalPairWorktreeStatus(statusText, "0001"),
      (error) =>
        error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
        error.message ===
          'Task 0001 TERMINAL_PAIR_IMMUTABILITY: docs/tasks/0001-*/: worktree porcelain status is malformed or ambiguous. Preserve the delivered pair byte-for-byte and use $kyw-task "<correction outcome>"; the correction Task must hard-depend on Task 0001',
    );
  }
});

test("fresh and checkpoint-covered future pairs remain exact without newline-normalization false positives", async (t) => {
  const fixture = await futureTerminalFixture(t);
  const taskRelative = "docs/tasks/0001-immutable/TASK.md";
  const byteDriftCases = [
    [
      "CRLF with a character change",
      fixture.taskBytes
        .replace(
          "Prove immutable terminal delivery behavior.",
          "Prove mutable terminal delivery behavior.",
        )
        .replaceAll("\n", "\r\n"),
    ],
    [
      "character change",
      fixture.taskBytes.replace("immutable terminal", "mutable terminal"),
    ],
    [
      "line addition",
      fixture.taskBytes.replace(
        "- Reject semantic drift.\n",
        "- Reject semantic drift.\n- Added terminal drift.\n",
      ),
    ],
    [
      "line deletion",
      fixture.taskBytes.replace("- Reject semantic drift.\n", ""),
    ],
    [
      "trailing space",
      fixture.taskBytes.replace(
        "# TASK 0001 — Immutable\n",
        "# TASK 0001 — Immutable \n",
      ),
    ],
    ["missing final newline", fixture.taskBytes.slice(0, -1)],
    [
      "bare carriage return",
      fixture.taskBytes.replace(
        "Prove immutable terminal delivery behavior.",
        "Prove immutable\rterminal delivery behavior.",
      ),
    ],
    [
      "Unicode drift",
      fixture.taskBytes.replace("— Immutable", "– Immutable"),
    ],
  ];
  const assertByteDriftMatrix = async (hydrate, phase) => {
    for (const [name, changedBytes] of byteDriftCases) {
      await writeFile(fixture.taskPath, changedBytes, "utf8");
      fixture.setWorktreeStatusOverride(` M ${taskRelative}\n`);
      await assert.rejects(
        hydrate(),
        (error) =>
          error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
          error.message.includes(taskRelative) &&
          /terminal artifact bytes differ from the canonical merge/.test(
            error.message,
          ),
        `${phase} ${name}`,
      );
      await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
    }
    fixture.setWorktreeStatusOverride(undefined);
  };

  await assertByteDriftMatrix(fixture.hydrate, "fresh");
  const hydrateCovered = await fixture.checkpointDelivery();
  const unchanged = await hydrateCovered();
  assert.equal(
    unchanged.diagnostics.classifications["0001"],
    "DURABLE_STANDARD_CONTINUITY",
  );

  for (const [label, target, canonical, relativePath] of [
    ["TASK.md", fixture.taskPath, fixture.taskBytes, taskRelative],
    [
      "TEST.md",
      fixture.testPath,
      fixture.testBytes,
      "docs/tasks/0001-immutable/TEST.md",
    ],
  ]) {
    await writeFile(target, canonical.replaceAll("\n", "\r\n"), "utf8");
    fixture.setWorktreeStatusOverride(` M ${relativePath}\n`);
    await hydrateCovered();
    await writeFile(target, canonical, "utf8");
    assert.equal(await readFile(target, "utf8"), canonical, label);
  }
  fixture.setWorktreeStatusOverride(undefined);

  await assertByteDriftMatrix(hydrateCovered, "covered");

  await rm(fixture.testPath);
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TEST\.md/.test(error.message),
  );
  await writeFile(fixture.testPath, fixture.testBytes, "utf8");

  await writeFile(fixture.testPath, `${fixture.testBytes}\nchanged\n`, "utf8");
  git(fixture.root, ["add", "docs/tasks/0001-immutable/TEST.md"]);
  git(fixture.root, ["commit", "-m", "Mutate checkpoint-covered evidence"]);
  fixture.advanceMain();
  await assert.rejects(
    hydrateCovered(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /terminal artifact/.test(error.message),
  );
});

test("future terminal history rejects committed mutation even after byte reversion", async (t) => {
  const fixture = await futureTerminalFixture(t);
  await writeFile(fixture.taskPath, `${fixture.taskBytes}\nchanged\n`, "utf8");
  git(fixture.root, ["add", "docs/tasks/0001-immutable/TASK.md"]);
  git(fixture.root, ["commit", "-m", "Mutate delivered Task evidence"]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message),
  );

  await writeFile(fixture.taskPath, fixture.taskBytes, "utf8");
  git(fixture.root, ["add", "docs/tasks/0001-immutable/TASK.md"]);
  git(fixture.root, ["commit", "-m", "Revert delivered Task evidence bytes"]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /terminal artifact/.test(error.message),
  );
});

test("contract-4 terminal history is discovered and remains immutable", async (t) => {
  const fixture = await futureTerminalFixture(t, { contractVersion: 4 });
  const local = await fixture.discover();
  assert.equal(local.outcomes.length, 1);
  assert.equal(local.outcomes[0].taskId, "0001");
  assert.equal(
    local.outcomes[0].terminalPair.taskPath,
    "docs/tasks/0001-immutable/TASK.md",
  );

  const hydrated = await fixture.hydrate();
  assert.equal(
    evaluateDeliveryEvidence(
      "0001",
      hydrated.deliveryLedger["0001"],
      hydrated.deliveryExpectations["0001"],
    ).satisfied,
    true,
  );

  await writeFile(fixture.taskPath, `${fixture.taskBytes}\nchanged\n`, "utf8");
  fixture.setWorktreeStatusOverride(" M docs/tasks/0001-immutable/TASK.md\n");
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      /docs\/tasks\/0001-immutable\/TASK\.md/.test(error.message),
  );
});

test("expected-head PR merge source branch has one leading Task identity", () => {
  const parents = ["a".repeat(40), "b".repeat(40)];
  for (const [subject, expected] of [
    [
      "Merge pull request #60 from kimyeongwoo/task/0072-retire-consumed-task-0070-rebaseline-shim",
      {
        pullRequestNumber: 60,
        owner: "kimyeongwoo",
        sourceBranch: "task/0072-retire-consumed-task-0070-rebaseline-shim",
        taskId: "0072",
      },
    ],
    [
      "Merge pull request #61 from owner/task/0070",
      {
        pullRequestNumber: 61,
        owner: "owner",
        sourceBranch: "task/0070",
        taskId: "0070",
      },
    ],
    [
      "Merge pull request #62 from owner/task-0070-correction",
      {
        pullRequestNumber: 62,
        owner: "owner",
        sourceBranch: "task-0070-correction",
        taskId: "0070",
      },
    ],
    [
      "Merge pull request #63 from owner/agent/task/0070-correction",
      {
        pullRequestNumber: 63,
        owner: "owner",
        sourceBranch: "agent/task/0070-correction",
        taskId: "0070",
      },
    ],
    [
      "Merge pull request #64 from owner/agent/task-0070",
      {
        pullRequestNumber: 64,
        owner: "owner",
        sourceBranch: "agent/task-0070",
        taskId: "0070",
      },
    ],
    [
      "Merge pull request #65 from task-0070/task/0072-owner-token-is-ignored",
      {
        pullRequestNumber: 65,
        owner: "task-0070",
        sourceBranch: "task/0072-owner-token-is-ignored",
        taskId: "0072",
      },
    ],
  ]) {
    assert.deepEqual(
      parseProtectedMergeTaskIdentity({ parents, subject }),
      expected,
      subject,
    );
  }

  for (const record of [
    {
      parents,
      subject: "Merge pull request #66 from owner/feature/task/0070-nested",
    },
    {
      parents,
      subject: "Merge pull request #67 from owner/team/agent/task-0070-nested",
    },
    { parents, subject: "Merge pull request #68 from owner/task/00700-near" },
    { parents, subject: "Merge pull request #69 from owner/task/00701-near" },
    { parents, subject: "Merge pull request #70 from owner/task/0070x-near" },
    { parents, subject: "Merge pull request #71 from owner/task/0070/nested" },
    { parents, subject: "Merge pull request #0 from owner/task/0070-invalid" },
    { parents, subject: "Merge pull request #72 from /task/0070-no-owner" },
    { parents, subject: "Merge pull request #73 from owner/" },
    { parents, subject: "Merge pull request #74 from owner/task/0070 trailing" },
    { parents, subject: "Complete Task 0070 (#75)" },
    {
      parents: [parents[0]],
      subject: "Merge pull request #76 from owner/task/0070-one-parent",
    },
    {
      parents: [...parents, "c".repeat(40)],
      subject: "Merge pull request #77 from owner/task/0070-three-parents",
    },
  ]) {
    assert.equal(parseProtectedMergeTaskIdentity(record), undefined, record.subject);
  }
});

test("PR #60-isomorphic expected-head merge ignores a later Task token in its slug", async (t) => {
  const fixture = await futureTerminalFixture(t, { taskId: "0070" });
  const branch = "task/0072-retire-consumed-task-0070-rebaseline-shim";
  const subject = `Merge pull request #60 from kimyeongwoo/${branch}`;
  const mergeSha = await fixture.addProtectedMerge({
    branch,
    subject,
    fileName: "task-0072-outcome.txt",
  });
  const local = await fixture.discover();
  assert.equal(local.currentMainSha, mergeSha);
  assert.deepEqual(local.outcomes[0].immutableDrift.additionalDeliveries, []);
  const hydrated = await fixture.hydrate();
  assert.equal(
    evaluateDeliveryEvidence(
      "0070",
      hydrated.deliveryLedger["0070"],
      hydrated.deliveryExpectations["0070"],
    ).satisfied,
    true,
  );
});

test("future terminal history rejects a second Task-scoped delivery graph", async (t) => {
  const fixture = await futureTerminalFixture(t, { taskId: "0070" });
  const branch = "task/0070-immutable-followup";
  const subject = `Merge pull request #61 from owner/${branch}`;
  const mergeSha = await fixture.addProtectedMerge({
    branch,
    subject,
    fileName: "followup.txt",
  });
  const local = await fixture.discover();
  assert.deepEqual(local.outcomes[0].immutableDrift.additionalDeliveries, [
    {
      mergeSha,
      path: "docs/tasks/0070-immutable/TASK.md",
    },
  ]);
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_PAIR_IMMUTABLE" &&
      error.message.includes("docs/tasks/0070-immutable/TASK.md") &&
      error.message.includes(mergeSha) &&
      /another Task-scoped PR merge/.test(error.message) &&
      error.message.includes('$kyw-task "<correction outcome>"') &&
      error.message.includes("hard-depend on Task 0070"),
  );
});

test("current tracked-main redelivery identity scan is read-only", async (t) => {
  const statusArgs = ["status", "--porcelain=v1", "--untracked-files=all"];
  const refNames = [
    "HEAD",
    "refs/heads/main",
    "main@{upstream}",
    "refs/remotes/origin/main",
  ];
  const trackedMainResults = refNames.slice(1).map((ref) =>
    spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
    }),
  );
  if (trackedMainResults.some(({ status }) => status !== 0)) {
    t.skip("aligned tracked-main refs are unavailable in this exact-SHA checkout");
    return;
  }
  const statusBefore = git(REPOSITORY_ROOT, statusArgs);
  const refsBefore = [
    git(REPOSITORY_ROOT, ["rev-parse", "HEAD"]),
    ...trackedMainResults.map(({ stdout }) => stdout.trim()),
  ];
  const mainSha = refsBefore[1];
  if (refsBefore[1] !== refsBefore[2] || refsBefore[1] !== refsBefore[3]) {
    t.skip("tracked main refs are available but not aligned in this checkout");
    return;
  }
  assert.equal(refsBefore[1], refsBefore[2]);
  assert.equal(refsBefore[1], refsBefore[3]);
  const checkpointPath = path.join(
    REPOSITORY_TASKS_ROOT,
    STANDARD_DELIVERY_CONTINUITY_FILE,
  );
  const checkpointBefore = sha256(await readFile(checkpointPath));
  const queue = await inspectTaskQueue(REPOSITORY_TASKS_ROOT);
  assert.deepEqual(queue.errors, []);
  const requiredTasks = ["0070", "0072"].map((taskId) => {
    const matched = queue.tasks.find(({ id }) => id === taskId);
    assert.ok(matched, `Task ${taskId} must exist in the current queue`);
    return matched;
  });
  const commandCache = createInvocationCommandCache({
    runner: ({ command, args, cwd, timeoutMs, maxBuffer }) => {
      assert.equal(command, "git");
      if (args[0] === "ls-remote") {
        return {
          status: 0,
          signal: null,
          stdout: `${mainSha}\trefs/heads/main\n`,
          stderr: "",
        };
      }
      const result = spawnSync(command, args, {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer,
        shell: false,
      });
      return {
        status: result.status,
        signal: result.signal,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        error: result.error,
      };
    },
  });
  const local = await discoverLocalDeliveryOutcomes({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    requiredTasks,
    contractTasks: requiredTasks,
    commandCache,
  });
  const outcomes = new Map(local.outcomes.map((outcome) => [outcome.taskId, outcome]));
  assert.deepEqual(outcomes.get("0070").immutableDrift.additionalDeliveries, []);
  assert.equal(
    outcomes.get("0070").terminalPair.taskPath,
    "docs/tasks/0070-repair-mixed-attempt-delivery-hydration-0d08b166/TASK.md",
  );
  assert.equal(outcomes.get("0072").pullRequestNumber, 60);
  assert.equal(
    git(REPOSITORY_ROOT, [
      "merge-base",
      "--is-ancestor",
      outcomes.get("0072").mergeSha,
      mainSha,
    ]),
    "",
  );
  assert.equal(
    outcomes.get("0072").headRefHint,
    "task/0072-retire-consumed-task-0070-rebaseline-shim",
  );

  const [mergeSha, parentText, ...subjectParts] = git(REPOSITORY_ROOT, [
    "log",
    "-1",
    "--first-parent",
    "--format=%H%x09%P%x09%s",
    outcomes.get("0072").mergeSha,
  ]).split("\t");
  assert.equal(mergeSha, outcomes.get("0072").mergeSha);
  assert.deepEqual(
    parseProtectedMergeTaskIdentity({
      parents: parentText.split(" "),
      subject: subjectParts.join("\t"),
    }),
    {
      pullRequestNumber: 60,
      owner: "kimyeongwoo",
      sourceBranch: "task/0072-retire-consumed-task-0070-rebaseline-shim",
      taskId: "0072",
    },
  );
  assert.equal(git(REPOSITORY_ROOT, statusArgs), statusBefore);
  assert.deepEqual(
    refNames.map((ref) => git(REPOSITORY_ROOT, ["rev-parse", ref])),
    refsBefore,
  );
  assert.equal(sha256(await readFile(checkpointPath)), checkpointBefore);
});

test("future terminal history rejects ambiguous canonical delivery candidates", async (t) => {
  const fixture = await futureTerminalFixture(t);
  git(fixture.root, ["switch", "-c", "task/0001-second"]);
  const secondDirectory = path.join(fixture.tasksRoot, "0001-second");
  await mkdir(secondDirectory);
  await Promise.all([
    writeFile(path.join(secondDirectory, "TASK.md"), fixture.taskBytes, "utf8"),
    writeFile(path.join(secondDirectory, "TEST.md"), fixture.testBytes, "utf8"),
  ]);
  git(fixture.root, ["add", "docs/tasks/0001-second"]);
  git(fixture.root, ["commit", "-m", "Add ambiguous terminal pair"]);
  git(fixture.root, ["switch", "main"]);
  git(fixture.root, [
    "merge",
    "--no-ff",
    "task/0001-second",
    "-m",
    "Merge pull request #3 from owner/task/0001-second",
  ]);
  fixture.advanceMain();
  await assert.rejects(
    fixture.hydrate(),
    (error) =>
      error.code === "FUTURE_TERMINAL_DELIVERY_AMBIGUOUS" &&
      /0001-immutable, 0001-second|0001-second, 0001-immutable/.test(error.message),
  );
});

test("real Task 0059 multi-merge history remains grandfathered under contract 2", async (t) => {
  const name = "0059-automatically-hydrate-prior-standard-de-0e0a8659";
  const tasksRoot = path.join(REPOSITORY_ROOT, "docs", "tasks");
  const directory = path.join(tasksRoot, name);
  const taskPath = path.join(directory, "TASK.md");
  const testPath = path.join(directory, "TEST.md");
  const mainResult = spawnSync(
    "git",
    ["rev-parse", "--verify", "refs/heads/main^{commit}"],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      windowsHide: true,
      shell: false,
    },
  );
  if (mainResult.status !== 0) {
    t.skip("complete local main history is unavailable in this exact-SHA checkout");
    return;
  }
  const mainSha = mainResult.stdout.trim();
  const trackedMainResults = ["main@{upstream}", "refs/remotes/origin/main"].map(
    (ref) =>
      spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
        cwd: REPOSITORY_ROOT,
        encoding: "utf8",
        windowsHide: true,
        shell: false,
      }),
  );
  if (
    trackedMainResults.some(
      ({ status, stdout }) => status !== 0 || stdout.trim() !== mainSha,
    )
  ) {
    t.skip("tracked main refs are not aligned for the real-history fixture");
    return;
  }
  const queueTask = {
    ...task({ id: "0059", contractVersion: 2 }),
    name,
    directory,
    taskPath,
    testPath,
  };
  const commandRunner = ({ command, args, cwd, timeoutMs, maxBuffer }) => {
    if (command === "git" && args[0] === "ls-remote") {
      return {
        status: 0,
        signal: null,
        stdout: `${mainSha}\trefs/heads/main\n`,
        stderr: "",
      };
    }
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer,
      shell: false,
    });
    return {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  };
  let observedOutcome;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot,
    invocation: "$kyw-impl 0059",
    commandRunner,
    queueInspector: async () => ({ tasks: [queueTask], errors: [] }),
    localDiscovery: discoverLocalDeliveryOutcomes,
    deliveryCollector: async ({ local }) => {
      [observedOutcome] = local.outcomes;
      const [taskBytes, testBytes] = await Promise.all([
        readFile(taskPath, "utf8"),
        readFile(testPath, "utf8"),
      ]);
      const checkpoint = createStandardDeliveryContinuityCheckpoint({
        repository: local.repository,
        sourceMainSha: local.currentMainSha,
        coveredRecords: [
          {
            taskId: queueTask.id,
            taskSha256: sha256(taskBytes),
            testSha256: sha256(testBytes),
            taskStatus: "DONE",
            testStatus: "PASSED",
            classification: "HARDENED_EXACT_HEAD",
            outcomeSha: observedOutcome.outcomeSha,
            mergeSha: observedOutcome.mergeSha,
            evidenceSha256: "c".repeat(64),
          },
        ],
      }).checkpoint;
      return {
        ...buildStandardDeliveryContinuityState({
          checkpoint,
          coveredTasks: [queueTask],
          coverageTasks: [queueTask],
        }),
        classifications: Object.freeze({
          [queueTask.id]: "HARDENED_EXACT_HEAD",
        }),
        chronology: Object.freeze([]),
        githubMainSha: local.currentMainSha,
      };
    },
    allowUncheckpointedCompatibility: true,
  });
  const mergeSubjects = git(REPOSITORY_ROOT, [
    "log",
    "--first-parent",
    "--format=%s",
    "refs/heads/main",
    "--",
    `docs/tasks/${name}`,
  ]).split(/\r?\n/);
  assert.equal(observedOutcome.mergeSha, "ffe51058a7e1adad1035a8fd2b9cde7215877d07");
  assert.equal(observedOutcome.terminalPair, undefined);
  assert.equal(
    evaluateDeliveryEvidence(
      "0059",
      hydrated.deliveryLedger["0059"],
      hydrated.deliveryExpectations["0059"],
    ).satisfied,
    true,
  );
  assert.ok(mergeSubjects.some((subject) => subject.includes("#46")));
  assert.ok(mergeSubjects.some((subject) => subject.includes("#47")));
});

test("legacy eligibility comes from ancestry around the hardened boundary, not Task numbers", async () => {
  const outcomes = [
    {
      taskId: "9000",
      baseSha: "a".repeat(40),
      outcomeSha: "b".repeat(40),
      mergeSha: "c".repeat(40),
      firstParentIndex: 1,
      hardenedWorkflow: false,
    },
    {
      taskId: "0001",
      baseSha: "c".repeat(40),
      outcomeSha: "d".repeat(40),
      mergeSha: "e".repeat(40),
      firstParentIndex: 2,
      hardenedWorkflow: true,
    },
  ];
  const ancestry = new Set([
    `${"b".repeat(40)}:${"c".repeat(40)}`,
    `${"c".repeat(40)}:${"c".repeat(40)}`,
    `${"c".repeat(40)}:${"e".repeat(40)}`,
  ]);
  const classified = await classifyLocalDeliveryContracts(outcomes, {
    currentMainSha: "e".repeat(40),
    isAncestor: async (ancestor, descendant) =>
      ancestor === descendant || ancestry.has(`${ancestor}:${descendant}`),
  });
  assert.equal(classified.contractAnchorSha, "c".repeat(40));
  assert.deepEqual(
    classified.outcomes.map(({ taskId, classification }) => [taskId, classification]),
    [
      ["9000", "LEGACY_PRE_CONTRACT"],
      ["0001", "HARDENED_EXACT_HEAD"],
    ],
  );
});

test("legacy-only and hardened-only histories derive their contract from ancestry and workflow truth", async () => {
  const legacy = await classifyLocalDeliveryContracts(
    [
      {
        taskId: "9001",
        baseSha: "1".repeat(40),
        outcomeSha: "2".repeat(40),
        mergeSha: "3".repeat(40),
        firstParentIndex: 1,
        hardenedWorkflow: false,
      },
    ],
    {
      currentMainSha: "4".repeat(40),
      isAncestor: async () => true,
    },
  );
  assert.equal(legacy.contractAnchorSha, "4".repeat(40));
  assert.equal(legacy.outcomes[0].classification, "LEGACY_PRE_CONTRACT");

  const hardened = await classifyLocalDeliveryContracts(
    [
      {
        taskId: "0001",
        baseSha: "5".repeat(40),
        outcomeSha: "6".repeat(40),
        mergeSha: "7".repeat(40),
        firstParentIndex: 1,
        hardenedWorkflow: true,
      },
    ],
    {
      currentMainSha: "7".repeat(40),
      isAncestor: async () => true,
    },
  );
  assert.equal(hardened.contractAnchorSha, "5".repeat(40));
  assert.equal(hardened.outcomes[0].classification, "HARDENED_EXACT_HEAD");
});

test("CI evidence parser ignores echoed commands and requires one emitted schema-2 record", () => {
  const sha = "a".repeat(40);
  const log = [
    "Job\tStep\t2026-01-01T00:00:00Z ^[[36;1mprintf 'KYWCIEVIDENCE schema=2 role=%s' \\^[[0m",
    `Job\tStep\t2026-01-01T00:00:01Z \u001b[36;1mKYWCIEVIDENCE schema=2 role=PR_ACTUAL_HEAD repository=owner/repo event=pull_request pr=7 workflow=CI run_id=11 run_attempt=1 job=behavioral expected_sha=${sha} actual_sha=${sha}\u001b[0m`,
  ].join("\n");
  assert.deepEqual(parseKywCiEvidence(log), {
    schema: 2,
    role: "PR_ACTUAL_HEAD",
    repository: "owner/repo",
    event: "pull_request",
    pr: "7",
    workflow: "CI",
    run_id: "11",
    run_attempt: "1",
    job: "behavioral",
    expected_sha: sha,
    actual_sha: sha,
  });
  assert.throws(
    () => parseKywCiEvidence("Job\tStep\tno emitted evidence"),
    /exactly one emitted KYWCIEVIDENCE record/,
  );
});

function hardenedFixture() {
  const repository = "owner/repository";
  const baseSha = "a".repeat(40);
  const outcomeSha = "b".repeat(40);
  const syntheticSha = "c".repeat(40);
  const mergeSha = "d".repeat(40);
  const workflow = { id: 71, name: "CI", path: ".github/workflows/ci.yml" };
  const names = [
    "Behavioral / fixture",
    "Quality / fixture",
    "Packed release / fixture",
  ];
  const workflowContract = {
    name: "CI",
    path: workflow.path,
    workflow,
    actualHeadJobs: names,
    postMergeJobs: [...names],
    mergeCompatibilityJob: "Merge compatibility / fixture",
    requiredGateJob: "Required / credential-free CI",
    jobKeys: {
      "Behavioral / fixture": "behavioral",
      "Quality / fixture": "quality",
      "Packed release / fixture": "packed-release",
      "Merge compatibility / fixture": "merge-compatibility",
      "Required / credential-free CI": "required",
    },
  };
  const outcome = {
    taskId: "0058",
    baseRef: "main",
    baseSha,
    outcomeSha,
    mergeSha,
    pullRequestNumber: 45,
    headRef: "task/0058-fixture",
    classification: "HARDENED_EXACT_HEAD",
    hardenedWorkflow: workflowContract,
  };
  const run = ({
    id,
    attempt,
    event,
    branch,
    sha,
  }) => ({
    id,
    runAttempt: attempt,
    workflowId: workflow.id,
    name: workflow.name,
    path: workflow.path,
    event,
    headBranch: branch,
    headSha: sha,
    status: "completed",
    conclusion: "success",
    pullRequestNumbers: event === "pull_request" ? [45] : [],
  });
  const prRun = run({
    id: 1001,
    attempt: 2,
    event: "pull_request",
    branch: outcome.headRef,
    sha: outcomeSha,
  });
  const postRun = run({
    id: 1002,
    attempt: 1,
    event: "push",
    branch: "main",
    sha: mergeSha,
  });
  const evidence = ({
    role,
    runValue,
    job,
    expectedSha,
    extras = {},
  }) => ({
    schema: 2,
    role,
    repository,
    event: role === "POST_MERGE_MAIN" ? "push" : "pull_request",
    pr: role === "POST_MERGE_MAIN" ? "0" : "45",
    workflow: "CI",
    run_id: String(runValue.id),
    run_attempt: String(runValue.runAttempt),
    job,
    expected_sha: expectedSha,
    actual_sha: expectedSha,
    ...extras,
  });
  let nextId = 2000;
  const job = ({ name, runValue, evidenceRecord }) => ({
    id: ++nextId,
    runId: runValue.id,
    runAttempt: runValue.runAttempt,
    name,
    headSha: runValue.headSha,
    status: "completed",
    conclusion: "success",
    ...(evidenceRecord ? { evidence: evidenceRecord } : {}),
  });
  const prJobs = names.map((name) =>
    job({
      name,
      runValue: prRun,
      evidenceRecord: evidence({
        role: "PR_ACTUAL_HEAD",
        runValue: prRun,
        job: workflowContract.jobKeys[name],
        expectedSha: outcomeSha,
      }),
    }),
  );
  prJobs.push(
    job({
      name: workflowContract.mergeCompatibilityJob,
      runValue: prRun,
      evidenceRecord: evidence({
        role: "PR_MERGE_COMPATIBILITY",
        runValue: prRun,
        job: "merge-compatibility",
        expectedSha: syntheticSha,
        extras: {
          expected_base_sha: baseSha,
          actual_base_sha: baseSha,
          expected_head_sha: outcomeSha,
          actual_head_sha: outcomeSha,
        },
      }),
    }),
    job({ name: workflowContract.requiredGateJob, runValue: prRun }),
  );
  const postJobs = names.map((name) =>
    job({
      name,
      runValue: postRun,
      evidenceRecord: evidence({
        role: "POST_MERGE_MAIN",
        runValue: postRun,
        job: workflowContract.jobKeys[name],
        expectedSha: mergeSha,
      }),
    }),
  );
  postJobs.push(job({ name: workflowContract.requiredGateJob, runValue: postRun }));
  return {
    outcome,
    repository,
    workflowContract,
    snapshot: {
      pullRequest: {
        number: 45,
        head: {
          sha: outcomeSha,
          ref: outcome.headRef,
          repo: { full_name: repository },
        },
        base: {
          sha: baseSha,
          ref: "main",
          repo: { full_name: repository },
        },
        merge_commit_sha: mergeSha,
        merged: true,
        draft: false,
      },
      reviews: [],
      pullRequestRun: prRun,
      pullRequestJobs: prJobs,
      syntheticCommit: {
        sha: syntheticSha,
        parents: [{ sha: baseSha }, { sha: outcomeSha }],
      },
      postMergeRun: postRun,
      postMergeJobs: postJobs,
      chronology: [
        {
          taskId: "0058",
          role: "PR_ATTEMPT",
          runId: 1001,
          runAttempt: 1,
          headSha: outcomeSha,
          status: "completed",
          conclusion: "failure",
        },
        {
          taskId: "0058",
          role: "PR_ATTEMPT",
          runId: 1001,
          runAttempt: 2,
          headSha: outcomeSha,
          status: "completed",
          conclusion: "success",
        },
      ],
    },
  };
}

function normalizeFixture(fixture) {
  return normalizeHardenedDeliveryEvidence(fixture);
}

function pr57MixedAttemptFixture() {
  const repository = "kimyeongwoo/kyw-dev";
  const baseSha = "caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0";
  const outcomeSha = "52bf834fd2ef19b4e56d5e9571cb50279dd34391";
  const syntheticSha = "a6a4e1ea360a329917ddbe8fe54b3fe2d365567d";
  const mergeSha = "184c0802a3327a1c287634e701206b31dec44b2f";
  const actualHeadJobs = [
    "Behavioral / Ubuntu / Node 22.x",
    "Behavioral / macOS / Node 22.x",
    "Behavioral / Windows / Node 22.x",
    "Behavioral / Ubuntu / Node 24.x",
    "Behavioral / macOS / Node 24.x",
    "Behavioral / Windows / Node 24.x",
    "Behavioral / Ubuntu / Node 26.x compatibility",
    "Quality / Ubuntu / Node 24.x",
    "Packed release / Ubuntu / Node 24.x",
  ];
  const mergeName = "Merge compatibility / Ubuntu / Node 24.x";
  const gateName = "Required / credential-free CI";
  const workflow = {
    id: 314856028,
    name: "CI",
    path: ".github/workflows/ci.yml",
  };
  const jobKeys = Object.fromEntries(
    actualHeadJobs.map((name) => [
      name,
      name.startsWith("Behavioral")
        ? "behavioral"
        : name.startsWith("Quality")
          ? "quality"
          : "packed-release",
    ]),
  );
  jobKeys[mergeName] = "merge-compatibility";
  jobKeys[gateName] = "required";
  const workflowContract = {
    name: workflow.name,
    path: workflow.path,
    workflow,
    actualHeadJobs,
    postMergeJobs: [...actualHeadJobs],
    mergeCompatibilityJob: mergeName,
    requiredGateJob: gateName,
    jobKeys,
  };
  const outcome = {
    taskId: "0069",
    baseRef: "main",
    baseSha,
    outcomeSha,
    mergeSha,
    pullRequestNumber: 57,
    headRef:
      "task/0069-publish-and-prove-kyw-dev-0-1-3-through-npm-oidc",
    classification: "HARDENED_EXACT_HEAD",
    hardenedWorkflow: workflowContract,
  };
  const run = ({
    id,
    attempt,
    event,
    branch,
    sha,
    startedAt,
    updatedAt,
  }) => ({
    id,
    runAttempt: attempt,
    workflowId: workflow.id,
    name: workflow.name,
    path: workflow.path,
    event,
    headBranch: branch,
    headSha: sha,
    status: "completed",
    conclusion: "success",
    runStartedAt: startedAt,
    updatedAt,
    pullRequestNumbers: event === "pull_request" ? [57] : [],
  });
  const prRun = run({
    id: 30593586295,
    attempt: 2,
    event: "pull_request",
    branch: outcome.headRef,
    sha: outcomeSha,
    startedAt: "2026-07-31T01:23:27Z",
    updatedAt: "2026-07-31T01:25:14Z",
  });
  const prAttempts = [
    {
      ...prRun,
      runAttempt: 1,
      conclusion: "failure",
      runStartedAt: "2026-07-31T00:27:23Z",
      updatedAt: "2026-07-31T00:29:33Z",
    },
    prRun,
  ];
  const postRun = run({
    id: 30599908879,
    attempt: 1,
    event: "push",
    branch: "main",
    sha: mergeSha,
    startedAt: "2026-07-31T02:47:51Z",
    updatedAt: "2026-07-31T02:50:13Z",
  });
  const rawJob = ({
    id,
    runId,
    attempt,
    name,
    sha,
    startedAt,
    completedAt,
    conclusion = "success",
    steps = true,
  }) => ({
    id,
    run_id: runId,
    run_attempt: attempt,
    name,
    head_sha: sha,
    status: "completed",
    conclusion,
    started_at: startedAt,
    completed_at: completedAt,
    runner_id: 1000000000 + (id % 1000),
    runner_name: `GitHub Actions ${1000000000 + (id % 1000)}`,
    runner_group_id: 0,
    runner_group_name: "GitHub Actions",
    labels: ["fixture"],
    steps: steps
      ? [
          {
            number: 1,
            name: `Execute ${name}`,
            status: "completed",
            conclusion,
            started_at: startedAt,
            completed_at: completedAt,
          },
        ]
      : [],
  });
  const evidenceLog = ({
    name,
    role,
    runId,
    attempt,
    key,
    expectedSha,
    extras = "",
  }) =>
    [
      `unique-log=${name}`,
      `KYWCIEVIDENCE schema=2 role=${role} repository=${repository} event=${
        role === "POST_MERGE_MAIN" ? "push" : "pull_request"
      } pr=${role === "POST_MERGE_MAIN" ? "0" : "57"} workflow=CI run_id=${runId} run_attempt=${attempt} job=${key} expected_sha=${expectedSha} actual_sha=${expectedSha}${extras}`,
    ].join("\n");

  const attempt1Ids = [
    91040965503,
    91040965495,
    91040965509,
    91040965530,
    91040965562,
    91040965567,
    91040965563,
    91040965553,
    91040965446,
  ];
  const attempt1Times = [
    ["2026-07-31T00:27:27Z", "2026-07-31T00:27:55Z"],
    ["2026-07-31T00:27:26Z", "2026-07-31T00:28:03Z"],
    ["2026-07-31T00:27:27Z", "2026-07-31T00:29:26Z"],
    ["2026-07-31T00:27:32Z", "2026-07-31T00:27:57Z"],
    ["2026-07-31T00:27:28Z", "2026-07-31T00:28:02Z"],
    ["2026-07-31T00:27:27Z", "2026-07-31T00:29:15Z"],
    ["2026-07-31T00:27:26Z", "2026-07-31T00:27:53Z"],
    ["2026-07-31T00:27:27Z", "2026-07-31T00:27:42Z"],
    ["2026-07-31T00:27:28Z", "2026-07-31T00:27:37Z"],
  ];
  const prAttempt1 = actualHeadJobs.map((name, index) =>
    rawJob({
      id: attempt1Ids[index],
      runId: prRun.id,
      attempt: 1,
      name,
      sha: outcomeSha,
      startedAt: attempt1Times[index][0],
      completedAt: attempt1Times[index][1],
      conclusion:
        name === "Behavioral / Windows / Node 22.x"
          ? "failure"
          : "success",
    }),
  );
  prAttempt1.push(
    rawJob({
      id: 91040965531,
      runId: prRun.id,
      attempt: 1,
      name: mergeName,
      sha: outcomeSha,
      startedAt: "2026-07-31T00:27:27Z",
      completedAt: "2026-07-31T00:27:57Z",
    }),
    rawJob({
      id: 91041268653,
      runId: prRun.id,
      attempt: 1,
      name: gateName,
      sha: outcomeSha,
      startedAt: "2026-07-31T00:29:29Z",
      completedAt: "2026-07-31T00:29:32Z",
      conclusion: "failure",
    }),
  );
  const projectionIds = new Map([
    ["Behavioral / Ubuntu / Node 22.x", 91049030029],
    ["Behavioral / macOS / Node 22.x", 91049018333],
    ["Behavioral / Ubuntu / Node 24.x", 91049035194],
    ["Behavioral / macOS / Node 24.x", 91049036986],
    ["Behavioral / Windows / Node 24.x", 91049033189],
    ["Behavioral / Ubuntu / Node 26.x compatibility", 91049018410],
    ["Quality / Ubuntu / Node 24.x", 91049037107],
    ["Packed release / Ubuntu / Node 24.x", 91049035818],
    [mergeName, 91049033766],
  ]);
  const prAttempt2 = prAttempt1
    .filter((job) => projectionIds.has(job.name))
    .map((job) => ({
      ...structuredClone(job),
      id: projectionIds.get(job.name),
      run_attempt: 2,
      runner_group_id: null,
    }));
  prAttempt2.push(
    rawJob({
      id: 91049018006,
      runId: prRun.id,
      attempt: 2,
      name: "Behavioral / Windows / Node 22.x",
      sha: outcomeSha,
      startedAt: "2026-07-31T01:23:31Z",
      completedAt: "2026-07-31T01:25:07Z",
    }),
    rawJob({
      id: 91049232063,
      runId: prRun.id,
      attempt: 2,
      name: gateName,
      sha: outcomeSha,
      startedAt: "2026-07-31T01:25:10Z",
      completedAt: "2026-07-31T01:25:13Z",
    }),
  );
  const prLogs = new Map();
  for (const job of prAttempt1) {
    if (job.name === gateName) {
      prLogs.set(`1:${job.id}`, "required-gate-attempt-1");
      continue;
    }
    const extras =
      job.name === mergeName
        ? ` expected_base_sha=${baseSha} actual_base_sha=${baseSha} expected_head_sha=${outcomeSha} actual_head_sha=${outcomeSha}`
        : "";
    prLogs.set(
      `1:${job.id}`,
      evidenceLog({
        name: job.name,
        role:
          job.name === mergeName
            ? "PR_MERGE_COMPATIBILITY"
            : "PR_ACTUAL_HEAD",
        runId: prRun.id,
        attempt: 1,
        key: jobKeys[job.name],
        expectedSha: job.name === mergeName ? syntheticSha : outcomeSha,
        extras,
      }),
    );
  }
  for (const job of prAttempt2) {
    const original = prAttempt1.find((candidate) => candidate.name === job.name);
    if (projectionIds.has(job.name)) {
      prLogs.set(`2:${job.id}`, prLogs.get(`1:${original.id}`));
    } else if (job.name === gateName) {
      prLogs.set(`2:${job.id}`, "required-gate-attempt-2");
    } else {
      prLogs.set(
        `2:${job.id}`,
        evidenceLog({
          name: job.name,
          role: "PR_ACTUAL_HEAD",
          runId: prRun.id,
          attempt: 2,
          key: jobKeys[job.name],
          expectedSha: outcomeSha,
        }),
      );
    }
  }

  const postIds = [
    91060129280,
    91060129335,
    91060129364,
    91060129289,
    91060129310,
    91060129295,
    91060129303,
    91060129203,
    91060129228,
  ];
  const postJobs = actualHeadJobs.map((name, index) =>
    rawJob({
      id: postIds[index],
      runId: postRun.id,
      attempt: 1,
      name,
      sha: mergeSha,
      startedAt: "2026-07-31T02:47:54Z",
      completedAt:
        name.includes("Windows / Node 24")
          ? "2026-07-31T02:50:05Z"
          : name.includes("Windows / Node 22")
            ? "2026-07-31T02:49:54Z"
            : "2026-07-31T02:48:27Z",
    }),
  );
  postJobs.push(
    rawJob({
      id: 91060408360,
      runId: postRun.id,
      attempt: 1,
      name: gateName,
      sha: mergeSha,
      startedAt: "2026-07-31T02:50:08Z",
      completedAt: "2026-07-31T02:50:12Z",
    }),
    rawJob({
      id: 91060129707,
      runId: postRun.id,
      attempt: 1,
      name: mergeName,
      sha: mergeSha,
      startedAt: "2026-07-31T02:47:52Z",
      completedAt: "2026-07-31T02:47:52Z",
      conclusion: "skipped",
      steps: false,
    }),
  );
  const postLogs = new Map();
  for (const job of postJobs) {
    if (job.name === gateName) {
      postLogs.set(`1:${job.id}`, "required-post-main-gate");
    } else if (job.name !== mergeName) {
      postLogs.set(
        `1:${job.id}`,
        evidenceLog({
          name: job.name,
          role: "POST_MERGE_MAIN",
          runId: postRun.id,
          attempt: 1,
          key: jobKeys[job.name],
          expectedSha: mergeSha,
        }),
      );
    }
  }
  const historyClient = (history) => ({
    async listJobs(runId, selector) {
      assert.equal(runId, history.run.id);
      if (selector === "all") return structuredClone(history.all);
      if (selector === "latest") return structuredClone(history.latest);
      return structuredClone(history.byAttempt.get(selector) ?? []);
    },
    async getJobLog(runId, attempt, jobId) {
      assert.equal(runId, history.run.id);
      const key = `${attempt}:${jobId}`;
      if (!history.logs.has(key)) {
        throw new Error(`missing fixture log ${key}`);
      }
      return history.logs.get(key);
    },
  });
  const prHistory = {
    run: prRun,
    attempts: prAttempts,
    byAttempt: new Map([
      [1, prAttempt1],
      [2, prAttempt2],
    ]),
    all: [...prAttempt1, ...prAttempt2],
    latest: prAttempt2,
    logs: prLogs,
  };
  const postHistory = {
    run: postRun,
    attempts: [postRun],
    byAttempt: new Map([[1, postJobs]]),
    all: postJobs,
    latest: postJobs,
    logs: postLogs,
  };
  return {
    repository,
    outcome,
    workflowContract,
    prHistory,
    postHistory,
    historyClient,
    baseSnapshot: {
      pullRequest: {
        number: 57,
        head: {
          sha: outcomeSha,
          ref: outcome.headRef,
          repo: { full_name: repository },
        },
        base: {
          sha: baseSha,
          ref: "main",
          repo: { full_name: repository },
        },
        merge_commit_sha: mergeSha,
        merged: true,
        draft: false,
      },
      reviews: [],
      pullRequestRun: prRun,
      syntheticCommit: {
        sha: syntheticSha,
        parents: [{ sha: baseSha }, { sha: outcomeSha }],
      },
      postMergeRun: postRun,
    },
  };
}

async function normalizePr57MixedAttemptFixture(fixture) {
  const prState = await reconcileAuthoritativeJobs({
    client: fixture.historyClient(fixture.prHistory),
    run: fixture.prHistory.run,
    attempts: fixture.prHistory.attempts,
    names: [
      ...fixture.workflowContract.actualHeadJobs,
      fixture.workflowContract.mergeCompatibilityJob,
      fixture.workflowContract.requiredGateJob,
    ],
    evidenceNames: [
      ...fixture.workflowContract.actualHeadJobs,
      fixture.workflowContract.mergeCompatibilityJob,
    ],
    gateName: fixture.workflowContract.requiredGateJob,
    taskId: fixture.outcome.taskId,
    role: "PR_ACCEPTED_JOB_LOG",
  });
  const postState = await reconcileAuthoritativeJobs({
    client: fixture.historyClient(fixture.postHistory),
    run: fixture.postHistory.run,
    attempts: fixture.postHistory.attempts,
    names: [
      ...fixture.workflowContract.postMergeJobs,
      fixture.workflowContract.requiredGateJob,
    ],
    evidenceNames: fixture.workflowContract.postMergeJobs,
    gateName: fixture.workflowContract.requiredGateJob,
    taskId: fixture.outcome.taskId,
    role: "POST_MAIN_JOB_LOG",
  });
  const normalized = normalizeHardenedDeliveryEvidence({
    outcome: fixture.outcome,
    repository: fixture.repository,
    workflowContract: fixture.workflowContract,
    snapshot: {
      ...fixture.baseSnapshot,
      pullRequestJobs: prState.jobs,
      postMergeJobs: postState.jobs,
      chronology: [...prState.chronology, ...postState.chronology],
    },
  });
  return { normalized, prState, postState };
}

test("current delivery probe reaches reviewed clean merge resume after exact CI evidence", async () => {
  const fixture = pr57MixedAttemptFixture();
  const workflowText = await readFile(
    path.join(REPOSITORY_ROOT, ".github", "workflows", "ci.yml"),
    "utf8",
  );
  const commandCache = createInvocationCommandCache({
    runner: ({ args }) => {
      const key = args.join("\u0000");
      const stdout =
        key === "rev-parse\u0000--show-toplevel"
          ? `${REPOSITORY_ROOT}\n`
          : key === "rev-parse\u0000refs/heads/main" ||
              key === "rev-parse\u0000main@{upstream}" ||
              key === "rev-parse\u0000refs/remotes/origin/main"
            ? `${fixture.outcome.baseSha}\n`
            : key === "remote\u0000get-url\u0000origin"
              ? `https://github.com/${fixture.repository}.git\n`
              : key === "ls-remote\u0000--heads\u0000origin\u0000refs/heads/main"
                ? `${fixture.outcome.baseSha}\trefs/heads/main\n`
                : key === "symbolic-ref\u0000--quiet\u0000--short\u0000HEAD"
                  ? `${fixture.outcome.headRef}\n`
                  : key === "rev-parse\u0000HEAD"
                    ? `${fixture.outcome.outcomeSha}\n`
                    : key ===
                        `ls-remote\u0000--heads\u0000origin\u0000refs/heads/${fixture.outcome.headRef}`
                      ? `${fixture.outcome.outcomeSha}\trefs/heads/${fixture.outcome.headRef}\n`
                      : key ===
                          `show\u0000${fixture.outcome.outcomeSha}:.github/workflows/ci.yml`
                        ? workflowText
                        : "";
      return { status: 0, stdout, stderr: "" };
    },
  });
  const history = fixture.historyClient(fixture.prHistory);
  const pullRequest = {
    number: fixture.outcome.pullRequestNumber,
    state: "open",
    merged: false,
    draft: false,
    mergeable: true,
    mergeable_state: "clean",
    head: {
      sha: fixture.outcome.outcomeSha,
      ref: fixture.outcome.headRef,
      repo: { full_name: fixture.repository },
    },
    base: {
      sha: fixture.outcome.baseSha,
      ref: "main",
      repo: { full_name: fixture.repository },
    },
  };
  const pullRequestSummary = structuredClone(pullRequest);
  delete pullRequestSummary.mergeable;
  delete pullRequestSummary.mergeable_state;
  let currentReviews = [];
  let latestAttemptOverride;
  const githubCallOrder = [];
  const githubClient = {
    async getMainRef() {
      return { object: { sha: fixture.outcome.baseSha } };
    },
    async getWorkflow() {
      return {
        ...fixture.workflowContract.workflow,
        state: "active",
      };
    },
    async listPullRequests() {
      return [structuredClone(pullRequestSummary)];
    },
    async getPullRequest(number, context) {
      githubCallOrder.push("pull-detail");
      assert.equal(number, fixture.outcome.pullRequestNumber);
      assert.equal(context.role, "CURRENT_PULL_REQUEST");
      return structuredClone(pullRequest);
    },
    async listReviews() {
      githubCallOrder.push("reviews");
      return structuredClone(currentReviews);
    },
    async listRuns() {
      githubCallOrder.push("runs");
      return [structuredClone(fixture.prHistory.run)];
    },
    async getRunAttempt(_runId, attempt) {
      if (
        latestAttemptOverride &&
        latestAttemptOverride.runAttempt === attempt
      ) {
        return structuredClone(latestAttemptOverride);
      }
      return structuredClone(
        fixture.prHistory.attempts.find(
          (candidate) => candidate.runAttempt === attempt,
        ),
      );
    },
    async listJobs(...args) {
      githubCallOrder.push("jobs");
      return history.listJobs(...args);
    },
    async getJobLog(...args) {
      return history.getJobLog(...args);
    },
    async getCommit() {
      return structuredClone(fixture.baseSnapshot.syntheticCommit);
    },
  };
  const pendingRunState = {
    status: fixture.prHistory.run.status,
    conclusion: fixture.prHistory.run.conclusion,
  };
  const pendingJobs = fixture.prHistory.byAttempt
    .get(fixture.prHistory.run.runAttempt)
    .filter((job) =>
      [
        fixture.workflowContract.mergeCompatibilityJob,
        fixture.workflowContract.requiredGateJob,
      ].includes(job.name),
    );
  const pendingJobStates = pendingJobs.map((job) => ({
    job,
    status: job.status,
    conclusion: job.conclusion,
  }));
  fixture.prHistory.run.status = "in_progress";
  fixture.prHistory.run.conclusion = null;
  for (const { job } of pendingJobStates) {
    job.status = "in_progress";
    job.conclusion = null;
  }
  pullRequest.mergeable = false;
  pullRequest.mergeable_state = "blocked";
  currentReviews = [
    {
      user: { login: "reviewer" },
      state: "CHANGES_REQUESTED",
      submitted_at: "2026-09-03T00:01:00Z",
    },
  ];
  const reviewCallsBeforePending = githubCallOrder.filter(
    (call) => call === "reviews",
  ).length;
  const exactActualHeadPending = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
    commandCache,
    githubClient,
  });
  assert.equal(
    exactActualHeadPending.diagnostics.stage,
    "OBSERVE_MERGE_COMPATIBILITY",
  );
  assert.equal(
    githubCallOrder.filter((call) => call === "reviews").length,
    reviewCallsBeforePending,
  );
  assert.equal(
    exactActualHeadPending.deliveryLedger[fixture.outcome.taskId].pullRequest
      .review,
    "PENDING",
  );
  assert.equal(
    githubCallOrder.filter((call) => call === "pull-detail").length,
    0,
  );

  latestAttemptOverride = {
    ...fixture.prHistory.attempts.at(-1),
    status: "completed",
    conclusion: "failure",
  };
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    (error) =>
      error.code === "DELIVERY_BLOCKED" &&
      /latest attempt 2 is completed\/failure/.test(error.message),
  );
  latestAttemptOverride = undefined;

  const latestActualJob = fixture.prHistory.byAttempt
    .get(fixture.prHistory.run.runAttempt)
    .find((job) =>
      job.name.includes("Behavioral / Windows / Node 22.x"),
    );
  const latestActualLogKey = `${fixture.prHistory.run.runAttempt}:${latestActualJob.id}`;
  const latestActualLog = fixture.prHistory.logs.get(latestActualLogKey);
  fixture.prHistory.logs.set(
    latestActualLogKey,
    latestActualLog.replace(
      "role=PR_ACTUAL_HEAD",
      "role=POST_MERGE_MAIN",
    ),
  );
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /evidence role must equal "PR_ACTUAL_HEAD"/,
  );
  fixture.prHistory.logs.set(latestActualLogKey, latestActualLog);
  fixture.prHistory.run.status = pendingRunState.status;
  fixture.prHistory.run.conclusion = pendingRunState.conclusion;
  for (const { job, status, conclusion } of pendingJobStates) {
    job.status = status;
    job.conclusion = conclusion;
  }
  pullRequest.mergeable = true;
  pullRequest.mergeable_state = "clean";
  currentReviews = [];

  const current = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
    commandCache,
    githubClient,
  });
  assert.equal(current.diagnostics.stage, "MERGE_EXPECTED_HEAD");
  assert.equal(githubCallOrder.filter((call) => call === "reviews").length, 1);
  assert.equal(
    githubCallOrder.filter((call) => call === "pull-detail").length,
    1,
  );
  assert.ok(
    githubCallOrder.lastIndexOf("reviews") >
      githubCallOrder.lastIndexOf("jobs"),
  );
  assert.ok(
    githubCallOrder.lastIndexOf("pull-detail") >
      githubCallOrder.lastIndexOf("jobs"),
  );
  assert.equal(
    classifyDeliveryEvidence(
      fixture.outcome.taskId,
      current.deliveryLedger[fixture.outcome.taskId],
      current.deliveryExpectations[fixture.outcome.taskId],
    ).disposition,
    "RESUMABLE",
  );
  currentReviews = [
    {
      user: { login: "reviewer" },
      state: "CHANGES_REQUESTED",
      submitted_at: "2026-09-03T00:01:00Z",
    },
  ];
  const reviewBlocked = await probeCurrentStandardDeliveryState({
    tasksRoot: REPOSITORY_TASKS_ROOT,
    task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
    commandCache,
    githubClient,
  });
  assert.equal(
    reviewBlocked.diagnostics.stage,
    "INSPECT_REVIEW_AND_MERGEABILITY",
  );
  assert.equal(githubCallOrder.filter((call) => call === "reviews").length, 2);
  assert.ok(
    githubCallOrder.lastIndexOf("reviews") >
      githubCallOrder.lastIndexOf("jobs"),
  );
  const reviewBlockedClassification = classifyDeliveryEvidence(
    fixture.outcome.taskId,
    reviewBlocked.deliveryLedger[fixture.outcome.taskId],
    reviewBlocked.deliveryExpectations[fixture.outcome.taskId],
  );
  assert.equal(reviewBlockedClassification.disposition, "BLOCKED");
  assert.equal(reviewBlockedClassification.blockerCode, "DELIVERY_BLOCKED");
  assert.match(
    reviewBlockedClassification.issues.join("\n"),
    /CHANGES_REQUESTED/,
  );
  currentReviews = [];
  for (const [mergeable, mergeableState, diagnosticState] of [
    [true, "has_hooks", "has_hooks"],
    [false, "blocked", "blocked"],
    [null, "unknown", "unknown"],
    [undefined, undefined, "UNKNOWN"],
  ]) {
    pullRequest.mergeable = mergeable;
    pullRequest.mergeable_state = mergeableState;
    await assert.rejects(
      probeCurrentStandardDeliveryState({
        tasksRoot: REPOSITORY_TASKS_ROOT,
        task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
        commandCache,
        githubClient,
      }),
      (error) =>
        error.code === "DELIVERY_BLOCKED" &&
        new RegExp(`not safely mergeable \\(${diagnosticState}\\)`).test(
          error.message,
        ),
    );
  }
  pullRequest.mergeable = true;
  pullRequest.mergeable_state = "clean";
  pullRequest.number += 1;
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: number must equal/,
  );
  pullRequest.number -= 1;
  pullRequest.head.sha = "f".repeat(40);
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: head SHA must equal/,
  );
  pullRequest.head.sha = fixture.outcome.outcomeSha;
  pullRequest.head.ref = "task/other";
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: head ref must equal/,
  );
  pullRequest.head.ref = fixture.outcome.headRef;
  pullRequest.head.repo.full_name = "other/repository";
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: head repository must equal/,
  );
  pullRequest.head.repo.full_name = fixture.repository;
  pullRequest.base.sha = "f".repeat(40);
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: base SHA must equal/,
  );
  pullRequest.base.sha = fixture.outcome.baseSha;
  pullRequest.base.ref = "trunk";
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: base ref must equal/,
  );
  pullRequest.base.ref = "main";
  pullRequest.base.repo.full_name = "other/repository";
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: base repository must equal/,
  );
  pullRequest.base.repo.full_name = fixture.repository;
  pullRequest.draft = true;
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /CURRENT_PULL_REQUEST: draft state must equal false/,
  );
  pullRequest.draft = false;
  pullRequest.merged = true;
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /requires one open, unmerged pull request/,
  );
  pullRequest.merged = false;
  pullRequest.state = "closed";
  await assert.rejects(
    probeCurrentStandardDeliveryState({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      task: task({ id: fixture.outcome.taskId, contractVersion: 3 }),
      commandCache,
      githubClient,
    }),
    /requires one open, unmerged pull request/,
  );
  pullRequest.state = "open";
});

test("complete hardened graph reaches the existing production evaluator", () => {
  const fixture = hardenedFixture();
  const normalized = normalizeFixture(fixture);
  const evaluation = evaluateDeliveryEvidence(
    fixture.outcome.taskId,
    normalized.entry,
    normalized.expectation,
  );
  assert.equal(evaluation.satisfied, true);
  assert.equal(evaluation.classification, "HARDENED_EXACT_HEAD");
  assert.deepEqual(
    normalized.chronology.map(({ runAttempt, conclusion }) => [
      runAttempt,
      conclusion,
    ]),
    [
      [1, "failure"],
      [2, "success"],
    ],
  );
});

test("authoritative job history accepts one-attempt, full-rerun, and exact PR 57 subset-rerun graphs", async () => {
  const subset = pr57MixedAttemptFixture();
  const subsetResult = await normalizePr57MixedAttemptFixture(subset);
  const subsetEvaluation = evaluateDeliveryEvidence(
    subset.outcome.taskId,
    subsetResult.normalized.entry,
    subsetResult.normalized.expectation,
  );
  assert.equal(subsetEvaluation.satisfied, true);
  assert.equal(subsetEvaluation.classification, "HARDENED_EXACT_HEAD");
  assert.equal(subsetResult.normalized.entry.actualHead.runAttempt, 2);
  const subsetByName = new Map(
    subsetResult.prState.jobs.map((job) => [job.name, job]),
  );
  assert.equal(
    subsetByName.get("Behavioral / Windows / Node 22.x").id,
    91049018006,
  );
  assert.equal(
    subsetByName.get("Behavioral / Windows / Node 22.x").runAttempt,
    2,
  );
  assert.equal(
    subsetByName.get("Required / credential-free CI").id,
    91049232063,
  );
  assert.equal(
    subsetByName.get("Required / credential-free CI").runAttempt,
    2,
  );
  assert.equal(
    subsetByName.get("Behavioral / macOS / Node 22.x").id,
    91040965495,
  );
  assert.equal(
    subsetByName.get("Behavioral / macOS / Node 22.x").runAttempt,
    1,
  );
  assert.equal(
    subsetByName.get("Merge compatibility / Ubuntu / Node 24.x").id,
    91040965531,
  );
  assert.equal(
    subsetByName.get("Merge compatibility / Ubuntu / Node 24.x")
      .evidence.run_attempt,
    "1",
  );
  assert.equal(
    subsetResult.postState.jobs.every((job) => job.runAttempt === 1),
    true,
  );

  const oneAttempt = pr57MixedAttemptFixture();
  const firstAttempt = oneAttempt.prHistory.byAttempt.get(1);
  for (const job of firstAttempt) {
    job.status = "completed";
    job.conclusion = "success";
    for (const step of job.steps) step.conclusion = "success";
  }
  const firstRun = {
    ...oneAttempt.prHistory.attempts[0],
    conclusion: "success",
  };
  oneAttempt.prHistory.run = firstRun;
  oneAttempt.prHistory.attempts = [firstRun];
  oneAttempt.prHistory.byAttempt = new Map([[1, firstAttempt]]);
  oneAttempt.prHistory.all = firstAttempt;
  oneAttempt.prHistory.latest = firstAttempt;
  oneAttempt.baseSnapshot.pullRequestRun = firstRun;
  const oneAttemptResult =
    await normalizePr57MixedAttemptFixture(oneAttempt);
  assert.equal(
    evaluateDeliveryEvidence(
      oneAttempt.outcome.taskId,
      oneAttemptResult.normalized.entry,
      oneAttemptResult.normalized.expectation,
    ).classification,
    "HARDENED_EXACT_HEAD",
  );
  assert.equal(
    oneAttemptResult.prState.jobs.every((job) => job.runAttempt === 1),
    true,
  );

  const fullRerun = pr57MixedAttemptFixture();
  const secondAttempt = fullRerun.prHistory.byAttempt.get(2);
  for (const job of secondAttempt) {
    if (job.name === fullRerun.workflowContract.requiredGateJob) continue;
    job.started_at = "2026-07-31T01:23:31Z";
    job.completed_at = "2026-07-31T01:24:00Z";
    job.status = "completed";
    job.conclusion = "success";
    job.steps = [
      {
        number: 1,
        name: `Execute ${job.name}`,
        status: "completed",
        conclusion: "success",
        started_at: job.started_at,
        completed_at: job.completed_at,
      },
    ];
    const original = fullRerun.prHistory.byAttempt
      .get(1)
      .find((candidate) => candidate.name === job.name);
    const originalLog = fullRerun.prHistory.logs.get(`1:${original.id}`);
    fullRerun.prHistory.logs.set(
      `2:${job.id}`,
      originalLog.replace("run_attempt=1", "run_attempt=2"),
    );
  }
  fullRerun.prHistory.all = [
    ...fullRerun.prHistory.byAttempt.get(1),
    ...secondAttempt,
  ];
  fullRerun.prHistory.latest = secondAttempt;
  const fullRerunResult =
    await normalizePr57MixedAttemptFixture(fullRerun);
  assert.equal(
    evaluateDeliveryEvidence(
      fullRerun.outcome.taskId,
      fullRerunResult.normalized.entry,
      fullRerunResult.normalized.expectation,
    ).classification,
    "HARDENED_EXACT_HEAD",
  );
  assert.equal(
    fullRerunResult.prState.jobs.every((job) => job.runAttempt === 2),
    true,
  );
});

test("authoritative job history rejects stale aliases, collection attacks, and later non-success without fallback", async () => {
  for (const [mutate, pattern] of [
    [
      (fixture) => {
        const job = fixture.prHistory.byAttempt
          .get(2)
          .find((candidate) =>
            candidate.name.includes("Windows / Node 22"),
          );
        job.conclusion = "failure";
        job.steps[0].conclusion = "failure";
      },
      /job conclusion must equal "success"/,
    ],
    [
      (fixture) => {
        const job = fixture.prHistory.byAttempt
          .get(2)
          .find((candidate) =>
            candidate.name.includes("Windows / Node 22"),
          );
        job.status = "in_progress";
      },
      /job status must equal "completed"/,
    ],
    [
      (fixture) => {
        const job = fixture.prHistory.byAttempt
          .get(2)
          .find((candidate) =>
            candidate.name.includes("Windows / Node 22"),
          );
        const key = `2:${job.id}`;
        fixture.prHistory.logs.set(
          key,
          fixture.prHistory.logs
            .get(key)
            .replace("run_attempt=2", "run_attempt=1"),
        );
      },
      /evidence actual execution attempt must equal "2"/,
    ],
    [
      (fixture) => {
        const alias = fixture.prHistory.byAttempt
          .get(2)
          .find((candidate) =>
            candidate.name.includes("macOS / Node 22"),
          );
        alias.completed_at = "2026-07-31T00:28:04Z";
        alias.steps[0].completed_at = alias.completed_at;
      },
      /projection does not match the latest actual execution/,
    ],
    [
      (fixture) => {
        const alias = fixture.prHistory.byAttempt
          .get(2)
          .find((candidate) =>
            candidate.name.includes("macOS / Node 22"),
          );
        fixture.prHistory.logs.set(`2:${alias.id}`, "stale projection log");
      },
      /projection log does not match its actual execution/,
    ],
    [
      (fixture) => {
        fixture.prHistory.all.pop();
      },
      /filter=all job collection is mismatched/,
    ],
    [
      (fixture) => {
        const duplicate = structuredClone(
          fixture.prHistory.byAttempt.get(2)[0],
        );
        duplicate.id += 999999;
        fixture.prHistory.byAttempt.get(2).push(duplicate);
      },
      /logical job name.*ambiguous/,
    ],
    [
      (fixture) => {
        const job = fixture.prHistory.byAttempt
          .get(2)
          .find((candidate) =>
            candidate.name.includes("Windows / Node 22"),
          );
        fixture.prHistory.logs.delete(`2:${job.id}`);
      },
      /missing fixture log/,
    ],
  ]) {
    const fixture = pr57MixedAttemptFixture();
    mutate(fixture);
    await assert.rejects(
      normalizePr57MixedAttemptFixture(fixture),
      pattern,
    );
  }
});

test("terminal delivery with a two-Task causal lag evaluates one predecessor and keeps current pending", async () => {
  const fixture = hardenedFixture();
  const normalized = normalizeFixture(fixture);
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: fixture.repository,
    sourceMainSha: "f".repeat(40),
    coveredRecords: [
      {
        taskId: "0057",
        taskSha256: "1".repeat(64),
        testSha256: "2".repeat(64),
        taskStatus: "DONE",
        testStatus: "PASSED",
        classification: "HARDENED_EXACT_HEAD",
        outcomeSha: "3".repeat(40),
        mergeSha: "4".repeat(40),
        evidenceSha256: "5".repeat(64),
      },
    ],
  }).checkpoint;
  const coveredTask = task({ id: "0057" });
  const uncoveredTask = task({ id: "0058" });
  const selectedTask = task({ id: "0059" });
  let localDiscoveryCalls = 0;
  let collectionCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
    invocation: "$kyw-deliver 0059",
    queueInspector: async () => ({
      tasks: [coveredTask, uncoveredTask, selectedTask],
      errors: [],
    }),
    continuityLoader: async ({ requiredTasks, currentDeliveryTaskId }) => {
      assert.deepEqual(requiredTasks.map(({ id }) => id), ["0057", "0058"]);
      assert.equal(currentDeliveryTaskId, "0059");
      return {
        checkpoint,
        partition: {
          coveredTasks: [coveredTask],
          uncoveredTasks: [uncoveredTask],
        },
        source: "ALIGNED_MAIN",
        identity: {
          repository: fixture.repository,
          repositoryRoot: REPOSITORY_ROOT,
          currentMainSha: "f".repeat(40),
          upstreamSha: "f".repeat(40),
          cachedMainSha: "f".repeat(40),
          directRemoteSha: "f".repeat(40),
          githubMainSha: "f".repeat(40),
          githubClient: {},
        },
      };
    },
    localDiscovery: async ({ requiredTasks, contractTasks }) => {
      localDiscoveryCalls += 1;
      assert.deepEqual(requiredTasks.map(({ id }) => id), ["0058"]);
      assert.deepEqual(contractTasks.map(({ id }) => id), ["0058"]);
      return {
        repository: fixture.repository,
        repositoryRoot: REPOSITORY_ROOT,
        currentMainSha: "f".repeat(40),
        upstreamSha: "f".repeat(40),
        cachedMainSha: "f".repeat(40),
        directRemoteSha: "f".repeat(40),
        contractAnchorSha: fixture.outcome.baseSha,
        outcomes: [fixture.outcome],
      };
    },
    deliveryCollector: async () => {
      collectionCalls += 1;
      return {
        deliveryLedger: { "0058": normalized.entry },
        deliveryExpectations: { "0058": normalized.expectation },
        classifications: { "0058": "HARDENED_EXACT_HEAD" },
        chronology: normalized.chronology,
        githubMainSha: "f".repeat(40),
      };
    },
    continuityRecordBuilder: async () => ({
      taskId: "0058",
      taskSha256: "6".repeat(64),
      testSha256: "7".repeat(64),
      taskStatus: "DONE",
      testStatus: "PASSED",
      classification: "HARDENED_EXACT_HEAD",
      outcomeSha: fixture.outcome.outcomeSha,
      mergeSha: fixture.outcome.mergeSha,
      evidenceSha256: "8".repeat(64),
    }),
    currentDeliveryHydrator: async ({ task: selected, contractTasks }) => {
      assert.equal(selected.id, "0059");
      assert.deepEqual(contractTasks.map(({ id }) => id), ["0059"]);
      return {
        deliveryLedger: {},
        deliveryExpectations: {},
        classifications: { "0059": "PENDING" },
        chronology: [],
        diagnostics: {
          taskId: "0059",
          state: "RESUMABLE",
          source: "IN_FLIGHT_NO_CANONICAL_MERGE",
        },
      };
    },
  });
  assert.equal(localDiscoveryCalls, 1);
  assert.equal(collectionCalls, 1);
  assert.equal(hydrated.diagnostics.continuity.coveredTaskCount, 1);
  assert.deepEqual(hydrated.diagnostics.continuity.uncoveredTaskIds, ["0058"]);
  assert.equal(hydrated.diagnostics.continuity.freshEvidenceTaskCount, 1);
  assert.equal(hydrated.preparedCheckpoint.coverage.taskCount, 2);
  assert.equal(hydrated.preparedCheckpoint.coverage.lastTaskId, "0058");
  assert.equal(
    hydrated.preparedCheckpoint.previousCheckpointDigest,
    checkpoint.checkpointDigest,
  );
  assert.equal(
    evaluateDeliveryEvidence(
      "0058",
      hydrated.deliveryLedger["0058"],
      hydrated.deliveryExpectations["0058"],
    ).satisfied,
    true,
  );
});

test("checkpoint-covered selected delivery remains durable report-only with prerequisites", async () => {
  const prerequisite = task({ id: "0099", contractVersion: 3 });
  const selected = task({
    id: "0100",
    dependencies: ["0099"],
    contractVersion: 3,
  });
  const record = (taskId, digit) => ({
    taskId,
    taskSha256: digit.repeat(64),
    testSha256: String(Number(digit) + 1).repeat(64),
    taskStatus: "DONE",
    testStatus: "PASSED",
    classification: "HARDENED_EXACT_HEAD",
    outcomeSha: digit.repeat(40),
    mergeSha: String(Number(digit) + 1).repeat(40),
    evidenceSha256: String(Number(digit) + 2).repeat(64),
  });
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "f".repeat(40),
    coveredRecords: [record("0099", "1"), record("0100", "4")],
  }).checkpoint;
  let currentCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-deliver 0100",
    queueInspector: async () => ({ tasks: [prerequisite, selected], errors: [] }),
    continuityLoader: async ({
      requiredTasks,
      coverageTasks,
      currentDeliveryTaskId,
    }) => {
      assert.deepEqual(requiredTasks.map(({ id }) => id), ["0099"]);
      assert.deepEqual(coverageTasks.map(({ id }) => id), ["0099", "0100"]);
      assert.equal(currentDeliveryTaskId, "0100");
      return {
        checkpoint,
        partition: { coveredTasks: [prerequisite], uncoveredTasks: [] },
        coveragePartition: {
          coveredTasks: [prerequisite, selected],
          uncoveredTasks: [],
        },
        coverageTasks: [prerequisite, selected],
        recoveredImmutableTaskIds: [],
        source: "ALIGNED_MAIN",
        identity: {
          repository: "owner/repository",
          repositoryRoot: REPOSITORY_ROOT,
          currentMainSha: "f".repeat(40),
          upstreamSha: "f".repeat(40),
          cachedMainSha: "f".repeat(40),
          directRemoteSha: "f".repeat(40),
          githubMainSha: "f".repeat(40),
          githubClient: {},
        },
      };
    },
    currentDeliveryHydrator: async () => {
      currentCalls += 1;
      throw new Error("checkpoint-covered current delivery must not refetch GitHub");
    },
  });
  assert.equal(currentCalls, 0);
  assert.equal(
    hydrated.deliveryLedger["0100"].classification,
    "DURABLE_STANDARD_CONTINUITY",
  );
  assert.equal(
    evaluateDeliveryEvidence(
      "0100",
      hydrated.deliveryLedger["0100"],
      hydrated.deliveryExpectations["0100"],
    ).satisfied,
    true,
  );
});

test("public-release hydration freshly revalidates a checkpoint-covered selected delivery", async () => {
  const prerequisite = task({ id: "0099", contractVersion: 3 });
  const selected = task({
    id: "0100",
    dependencies: ["0099"],
    contractVersion: 4,
    releaseVersion: "1.2.3",
  });
  const record = (taskId, digit) => ({
    taskId,
    taskSha256: digit.repeat(64),
    testSha256: String(Number(digit) + 1).repeat(64),
    taskStatus: "DONE",
    testStatus: "PASSED",
    classification: "HARDENED_EXACT_HEAD",
    outcomeSha: digit.repeat(40),
    mergeSha: String(Number(digit) + 1).repeat(40),
    evidenceSha256: String(Number(digit) + 2).repeat(64),
  });
  const checkpoint = createStandardDeliveryContinuityCheckpoint({
    repository: "owner/repository",
    sourceMainSha: "f".repeat(40),
    coveredRecords: [record("0099", "1"), record("0100", "4")],
  }).checkpoint;
  const freshEntry = Object.freeze({
    schemaVersion: 2,
    claim: "FINAL",
    source: "FRESH_PUBLIC_RELEASE_FIXTURE",
    taskId: "0100",
  });
  const freshExpectation = Object.freeze({
    source: "FRESH_PUBLIC_RELEASE_FIXTURE",
    taskId: "0100",
  });
  let currentCalls = 0;
  const hydrated = await hydratePriorStandardDeliveries({
    tasksRoot: "C:\\fixture\\docs\\tasks",
    invocation: "$kyw-deliver 0100",
    queueInspector: async () => ({ tasks: [prerequisite, selected], errors: [] }),
    continuityLoader: async () => ({
      checkpoint,
      partition: { coveredTasks: [prerequisite], uncoveredTasks: [] },
      coveragePartition: {
        coveredTasks: [prerequisite, selected],
        uncoveredTasks: [],
      },
      coverageTasks: [prerequisite, selected],
      recoveredImmutableTaskIds: [],
      source: "ALIGNED_MAIN",
      identity: {
        repository: "owner/repository",
        repositoryRoot: REPOSITORY_ROOT,
        currentMainSha: "f".repeat(40),
        upstreamSha: "f".repeat(40),
        cachedMainSha: "f".repeat(40),
        directRemoteSha: "f".repeat(40),
        githubMainSha: "f".repeat(40),
        githubClient: {},
      },
    }),
    currentDeliveryHydrator: async ({ task: current }) => {
      currentCalls += 1;
      assert.equal(current.id, "0100");
      return {
        deliveryLedger: { "0100": freshEntry },
        deliveryExpectations: { "0100": freshExpectation },
        classifications: { "0100": "HARDENED_EXACT_HEAD" },
        chronology: [],
        diagnostics: {
          taskId: "0100",
          state: "SATISFIED",
          source: "CANONICAL_DELIVERY_GRAPH",
        },
      };
    },
  });

  assert.equal(currentCalls, 1);
  assert.equal(hydrated.deliveryLedger["0100"], freshEntry);
  assert.equal(hydrated.deliveryExpectations["0100"], freshExpectation);
  assert.equal(
    hydrated.deliveryLedger["0099"].classification,
    "DURABLE_STANDARD_CONTINUITY",
  );
  assert.equal(hydrated.diagnostics.currentDelivery.source, "CANONICAL_DELIVERY_GRAPH");
  assert.equal(hydrated.diagnostics.publicReleaseStandardRevalidation, true);
});

test("ordinary READY Task 0070 hydration is ID-isomorphic", async () => {
  const results = [];
  for (const id of ["0070", "0170"]) {
    const hydrated = await hydratePriorStandardDeliveries({
      tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
      invocation: `$kyw-impl ${id}`,
      queueInspector: async () => ({
        tasks: [task({ id, status: "READY", contractVersion: 3 })],
        errors: [],
      }),
      allowUncheckpointedCompatibility: true,
      _skipImmutableTerminalFallback: true,
    });
    results.push({
      deliveryLedger: hydrated.deliveryLedger,
      deliveryExpectations: hydrated.deliveryExpectations,
      requiredTaskIds: hydrated.diagnostics.requiredTaskIds,
    });
  }

  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[0], {
    deliveryLedger: {},
    deliveryExpectations: {},
    requiredTaskIds: [],
  });
});

function assertFixtureRejected(mutate, pattern) {
  const fixture = hardenedFixture();
  mutate(fixture);
  let message = "";
  try {
    const normalized = normalizeFixture(fixture);
    const evaluation = evaluateDeliveryEvidence(
      fixture.outcome.taskId,
      normalized.entry,
      normalized.expectation,
    );
    assert.equal(evaluation.satisfied, false);
    message = evaluation.issues.join("\n");
  } catch (error) {
    message = error.message;
  }
  assert.match(message, pattern);
  assert.match(message, /0058|actualHead|mergeCompatibility|postMerge/);
}

test("hardened normalization rejects stale, cross-attempt, role, job, and checkout evidence", () => {
  const mutations = [
    [
      (fixture) => {
        fixture.snapshot.pullRequest.head.sha = "e".repeat(40);
      },
      /Task 0058 PULL_REQUEST.*head SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequest.head.repo.full_name = "other/repository";
      },
      /Task 0058 PULL_REQUEST.*repository/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.path = ".github/workflows/other.yml";
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow path/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.workflowId = 72;
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow ID/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.name = "Other";
      },
      /Task 0058 PR_ACTUAL_HEAD.*workflow name/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestRun.event = "push";
      },
      /Task 0058 PR_ACTUAL_HEAD.*event/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].runAttempt = 1;
      },
      /Task 0058 PR_ACTUAL_HEAD.*evidence actual execution attempt/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].id = 0;
      },
      /Task 0058 PR_ACTUAL_HEAD.*job ID/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].name = "Other";
      },
      /Task 0058 PR_ACTUAL_HEAD.*Behavioral/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].evidence.job = "quality";
      },
      /Task 0058 PR_ACTUAL_HEAD.*job key/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs[0].evidence.actual_sha = "e".repeat(40);
      },
      /Task 0058 PR_ACTUAL_HEAD.*actual checkout SHA/,
    ],
    [
      (fixture) => {
        delete fixture.snapshot.pullRequestJobs[0].evidence;
      },
      /Task 0058 PR_ACTUAL_HEAD.*checkout log evidence is missing/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs.splice(0, 1);
      },
      /Task 0058 PR_ACTUAL_HEAD.*Behavioral/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequestJobs.pop();
      },
      /Task 0058 PR_ACTUAL_HEAD.*Required/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeRun.id = 1001;
      },
      /Task 0058 POST_MERGE_MAIN.*distinct/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeRun.headSha = "e".repeat(40);
      },
      /Task 0058 POST_MERGE_MAIN.*run head SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.pullRequest.merge_commit_sha = "e".repeat(40);
      },
      /Task 0058 PULL_REQUEST.*merge SHA/,
    ],
    [
      (fixture) => {
        fixture.snapshot.reviews.push({
          user: { login: "reviewer" },
          state: "CHANGES_REQUESTED",
          submitted_at: "2026-01-01T00:00:00Z",
        });
      },
      /Task 0058 PULL_REQUEST.*CHANGES_REQUESTED/,
    ],
    [
      (fixture) => {
        fixture.snapshot.postMergeJobs[0].id =
          fixture.snapshot.pullRequestJobs[0].id;
      },
      /reuse a job ID/,
    ],
  ];
  for (const [mutate, pattern] of mutations) assertFixtureRejected(mutate, pattern);
});

test("synthetic merge normalization requires one exact ordered base/head parent pair", () => {
  for (const parents of [
    [],
    ["a".repeat(40)],
    ["b".repeat(40), "a".repeat(40)],
    ["a".repeat(40), "b".repeat(40), "e".repeat(40)],
    ["e".repeat(40), "b".repeat(40)],
  ]) {
    assertFixtureRejected(
      (fixture) => {
        fixture.snapshot.syntheticCommit.parents = parents.map((sha) => ({ sha }));
      },
      /Task 0058 PR_MERGE_COMPATIBILITY.*exactly two ordered/,
    );
  }
});

test("invocation-local command cache deduplicates reads and redacts external failure detail", async () => {
  let calls = 0;
  const cache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      return { status: 0, stdout: "{\"ok\":true}", stderr: "" };
    },
  });
  const request = {
    command: "gh",
    args: ["api", "repos/owner/repository"],
    cwd: REPOSITORY_ROOT,
    taskId: "0058",
    role: "PULL_REQUEST",
  };
  await cache.run(request);
  await cache.run(request);
  assert.equal(calls, 1);
  assert.deepEqual(cache.stats(), {
    hits: 1,
    misses: 1,
    entries: 1,
    maxCommands: 1024,
  });

  const failing = createInvocationCommandCache({
    runner: () => ({
      status: 1,
      stdout: "",
      stderr: "Bad credentials token=ghp_do_not_echo",
    }),
  });
  await assert.rejects(
    failing.run(request),
    (error) =>
      /authentication failure/.test(error.message) &&
      !error.message.includes("ghp_do_not_echo"),
  );
});

test("default command cache admits the current-shaped 525 unique-key hydration load", async () => {
  let calls = 0;
  const cache = createInvocationCommandCache({
    runner: ({ command, args }) => {
      calls += 1;
      return { status: 0, stdout: `${command}:${args.at(-1)}`, stderr: "" };
    },
  });
  const requests = [
    ...Array.from({ length: 489 }, (_, index) => ({
      command: "git",
      args: ["fixture", `current-shaped-git-${index}`],
    })),
    ...Array.from({ length: 15 }, (_, index) => ({
      command: "gh",
      args: ["api", `repos/owner/repository/current-shaped-${index}`],
    })),
    ...Array.from({ length: 21 }, (_, index) => ({
      command: "gh",
      args: ["run", "view", `current-shaped-${index}`, "--log"],
    })),
  ];

  const results = [];
  for (const { command, args } of requests) {
    results.push(
      await cache.run({
        command,
        args,
        cwd: REPOSITORY_ROOT,
        taskId: "fixture",
        role: "COMMAND_CAPACITY",
      }),
    );
  }

  assert.equal(results.length, 525);
  assert.equal(calls, 525);
  assert.deepEqual(cache.details(), {
    hits: 0,
    misses: 525,
    entries: 525,
    maxCommands: 1024,
    gitCommands: 489,
    githubApiCommands: 15,
    jobLogFetches: 21,
  });
});

function assertRedactedCommandFailure(
  error,
  { taskId, role, kind = "command failure", forbidden = [] },
) {
  assert.equal(error.code, "DELIVERY_HYDRATION_EXTERNAL_FAILURE");
  assert.equal(
    error.message,
    `Task ${taskId} ${role}: ${kind}; required evidence is unavailable`,
  );
  assert.ok(error.message.length < 160);
  for (const secret of forbidden) assert.ok(!error.message.includes(secret));
  return true;
}

test("allowFailure command cache applies tolerant and strict policy in both orders", async () => {
  for (const strictFirst of [false, true]) {
    let calls = 0;
    const cache = createInvocationCommandCache({
      runner: () => {
        calls += 1;
        return { status: 17, stdout: "partial", stderr: "" };
      },
    });
    const request = {
      command: "git",
      args: ["fixture", "mixed-policy"],
      cwd: REPOSITORY_ROOT,
    };
    const strict = () =>
      cache.run({
        ...request,
        taskId: strictFirst ? "0751" : "0750",
        role: strictFirst ? "STRICT_FIRST" : "STRICT_SECOND",
      });
    const tolerant = () =>
      cache.run({
        ...request,
        taskId: "0075",
        role: "TOLERANT",
        allowFailure: true,
      });
    let tolerated;
    if (strictFirst) {
      await assert.rejects(strict(), (error) =>
        assertRedactedCommandFailure(error, {
          taskId: "0751",
          role: "STRICT_FIRST",
        }),
      );
      tolerated = await tolerant();
    } else {
      tolerated = await tolerant();
      await assert.rejects(strict(), (error) =>
        assertRedactedCommandFailure(error, {
          taskId: "0750",
          role: "STRICT_SECOND",
        }),
      );
    }
    assert.equal(tolerated.status, 17);
    assert.equal(tolerated.stdout, "partial");
    assert.equal(calls, 1);
    assert.deepEqual(cache.stats(), {
      hits: 1,
      misses: 1,
      entries: 1,
      maxCommands: 1024,
    });
  }
});

test("allowFailure command cache shares one deferred result across concurrent mixed policy", async () => {
  let calls = 0;
  let release;
  let markStarted;
  const completion = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const cache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      markStarted();
      return completion;
    },
  });
  const request = {
    command: "gh",
    args: ["api", "repos/owner/repository/mixed-policy"],
    cwd: REPOSITORY_ROOT,
  };
  const tolerantPending = cache.run({
    ...request,
    taskId: "0075",
    role: "CONCURRENT_TOLERANT",
    allowFailure: true,
  });
  const strictPending = cache.run({
    ...request,
    taskId: "0752",
    role: "CONCURRENT_STRICT",
  });
  await started;
  assert.equal(calls, 1);
  release({ status: 9, stdout: "partial", stderr: "" });

  const [tolerant, strict] = await Promise.allSettled([
    tolerantPending,
    strictPending,
  ]);
  assert.equal(tolerant.status, "fulfilled");
  assert.equal(tolerant.value.status, 9);
  assert.equal(strict.status, "rejected");
  assertRedactedCommandFailure(strict.reason, {
    taskId: "0752",
    role: "CONCURRENT_STRICT",
  });
  assert.deepEqual(cache.stats(), {
    hits: 1,
    misses: 1,
    entries: 1,
    maxCommands: 1024,
  });
});

test("command cache snapshots arguments before deferred runner execution", async () => {
  let calls = 0;
  let release;
  let markStarted;
  const completion = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const seenArgs = [];
  const cache = createInvocationCommandCache({
    runner: ({ args }) => {
      calls += 1;
      seenArgs.push(args);
      markStarted();
      return completion;
    },
  });
  const mutableArgs = ["fixture", "original"];
  const request = {
    command: "git",
    args: mutableArgs,
    cwd: REPOSITORY_ROOT,
    taskId: "0075",
    role: "ARGUMENT_SNAPSHOT",
  };
  const first = cache.run(request);
  mutableArgs[1] = "mutated-secret";
  const duplicate = cache.run({ ...request, args: ["fixture", "original"] });
  await started;
  assert.deepEqual(seenArgs, [["fixture", "original"]]);
  release({ status: 0, stdout: "ok", stderr: "" });

  const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
  assert.strictEqual(firstResult, duplicateResult);
  assert.equal(calls, 1);
  assert.deepEqual(cache.stats(), {
    hits: 1,
    misses: 1,
    entries: 1,
    maxCommands: 1024,
  });
});

test("command cache redacts caller-specific task and role diagnostics", async () => {
  let calls = 0;
  const secrets = ["stdout-secret", "stderr-secret", "argument-secret"];
  const cache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      return {
        status: 1,
        stdout: `token=${secrets[0]}`,
        stderr: `Bad credentials token=${secrets[1]}`,
      };
    },
  });
  const request = {
    command: "gh",
    args: ["api", "repos/owner/repository", "-f", `token=${secrets[2]}`],
    cwd: REPOSITORY_ROOT,
  };
  for (const [taskId, role] of [
    ["0753", "PRIMARY_STRICT"],
    ["9753", "SECONDARY_STRICT"],
  ]) {
    await assert.rejects(
      cache.run({ ...request, taskId, role }),
      (error) =>
        assertRedactedCommandFailure(error, {
          taskId,
          role,
          kind: "authentication failure",
          forbidden: secrets,
        }),
    );
  }
  assert.equal(calls, 1);

  let completionCalls = 0;
  const hostileCompletion = { status: 0, stderr: "" };
  Object.defineProperty(hostileCompletion, "stdout", {
    get() {
      throw new Error("completion-getter-secret");
    },
  });
  const completionGetterCache = createInvocationCommandCache({
    runner: () => {
      completionCalls += 1;
      return hostileCompletion;
    },
  });
  for (const [taskId, role, allowFailure] of [
    ["0758", "COMPLETION_TOLERANT", true],
    ["9758", "COMPLETION_STRICT", false],
  ]) {
    await assert.rejects(
      completionGetterCache.run({ ...request, taskId, role, allowFailure }),
      (error) =>
        assertRedactedCommandFailure(error, {
          taskId,
          role,
          forbidden: ["completion-getter-secret"],
        }),
    );
  }
  assert.equal(completionCalls, 1);
});

test("command cache seals failure classification before mutable or hostile errors escape", async () => {
  const retainedError = Object.assign(
    new Error("timed out token=retained-secret"),
    { code: "ETIMEDOUT" },
  );
  const completionCache = createInvocationCommandCache({
    runner: () => ({
      status: null,
      stdout: "",
      stderr: "",
      error: retainedError,
    }),
  });
  const request = {
    command: "git",
    args: ["fixture", "mutable-error"],
    cwd: REPOSITORY_ROOT,
    taskId: "0075",
    role: "MUTABLE_ERROR",
  };
  await completionCache.run({ ...request, allowFailure: true });
  retainedError.code = "EIO";
  retainedError.message = "Bad credentials token=mutated-secret";
  await assert.rejects(
    completionCache.run(request),
    (error) =>
      assertRedactedCommandFailure(error, {
        taskId: "0075",
        role: "MUTABLE_ERROR",
        kind: "timeout",
        forbidden: ["retained-secret", "mutated-secret"],
      }),
  );

  let calls = 0;
  const hostileError = {};
  Object.defineProperties(hostileError, {
    code: {
      get() {
        throw new Error("getter-code-secret");
      },
    },
    message: {
      get() {
        throw new Error("getter-message-secret");
      },
    },
  });
  const runnerCache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      throw hostileError;
    },
  });
  for (const [taskId, role, allowFailure] of [
    ["0757", "HOSTILE_TOLERANT", true],
    ["9757", "HOSTILE_STRICT", false],
  ]) {
    await assert.rejects(
      runnerCache.run({ ...request, taskId, role, allowFailure }),
      (error) =>
        assertRedactedCommandFailure(error, {
          taskId,
          role,
          forbidden: ["getter-code-secret", "getter-message-secret"],
        }),
    );
  }
  assert.equal(calls, 1);
});

test("maxBuffer and every command field participate in cache execution identity", async () => {
  const seenExecutions = [];
  const cache = createInvocationCommandCache({
    runner: ({ command, args, cwd, maxBuffer }) => {
      seenExecutions.push({ command, args, cwd, maxBuffer });
      return {
        status: 0,
        stdout: JSON.stringify({ command, args, cwd, maxBuffer }),
        stderr: "",
      };
    },
  });
  const request = {
    command: "git",
    args: ["fixture", "buffer-identity"],
    cwd: REPOSITORY_ROOT,
    taskId: "0075",
    role: "BUFFER_IDENTITY",
    maxBuffer: 1024,
  };
  const [first, duplicate] = await Promise.all([
    cache.run(request),
    cache.run({ ...request }),
  ]);
  const variants = await Promise.all([
    cache.run({ ...request, command: "gh" }),
    cache.run({ ...request, args: ["fixture", "different-arguments"] }),
    cache.run({ ...request, cwd: path.join(REPOSITORY_ROOT, "test") }),
    cache.run({ ...request, maxBuffer: 2048 }),
  ]);
  const resolvedRepositoryRoot = path.resolve(REPOSITORY_ROOT);

  assert.strictEqual(first, duplicate);
  for (const variant of variants) assert.notStrictEqual(first, variant);
  assert.deepEqual(
    seenExecutions.map(({ command, args, cwd, maxBuffer }) => [
      command,
      args,
      cwd,
      maxBuffer,
    ]),
    [
      ["git", ["fixture", "buffer-identity"], resolvedRepositoryRoot, 1024],
      ["gh", ["fixture", "buffer-identity"], resolvedRepositoryRoot, 1024],
      [
        "git",
        ["fixture", "different-arguments"],
        resolvedRepositoryRoot,
        1024,
      ],
      [
        "git",
        ["fixture", "buffer-identity"],
        path.join(REPOSITORY_ROOT, "test"),
        1024,
      ],
      ["git", ["fixture", "buffer-identity"], resolvedRepositoryRoot, 2048],
    ],
  );
  assert.deepEqual(cache.stats(), {
    hits: 1,
    misses: 5,
    entries: 5,
    maxCommands: 1024,
  });
});

test("maxBuffer bounds command cache stdout and stderr without exposing output", async () => {
  for (const stream of ["stdout", "stderr"]) {
    const secret = `${stream}-bound-secret`;
    const completeOutput = secret.repeat(4096);
    const cache = createInvocationCommandCache();
    const request = {
      command: process.execPath,
      args: [
        "-e",
        `process.${stream}.write(${JSON.stringify(secret)}.repeat(4096))`,
      ],
      cwd: REPOSITORY_ROOT,
      taskId: "0075",
      role: `${stream.toUpperCase()}_BOUND`,
      maxBuffer: 256,
    };
    const tolerated = await cache.run({ ...request, allowFailure: true });
    assert.equal(tolerated.error?.code, "ENOBUFS");
    assert.notEqual(tolerated.status, 0);
    assert.ok(Buffer.byteLength(tolerated[stream], "utf8") < completeOutput.length);
    await assert.rejects(
      cache.run(request),
      (error) =>
        assertRedactedCommandFailure(error, {
          taskId: "0075",
          role: `${stream.toUpperCase()}_BOUND`,
          forbidden: [secret],
        }),
    );
    assert.deepEqual(cache.stats(), {
      hits: 1,
      misses: 1,
      entries: 1,
      maxCommands: 1024,
    });
  }
});

test("allowFailure command cache caches synchronous throws and asynchronous rejections once", async () => {
  for (const [mode, strictFirst] of [
    ["sync throw", false],
    ["async rejection", true],
  ]) {
    let calls = 0;
    const secret = `${mode.replaceAll(" ", "-")}-secret`;
    const runnerError = Object.assign(new Error(`runner failed token=${secret}`), {
      code: "EIO",
    });
    const cache = createInvocationCommandCache({
      runner: () => {
        calls += 1;
        if (mode === "sync throw") throw runnerError;
        return Promise.reject(runnerError);
      },
    });
    const request = {
      command: "git",
      args: ["fixture", mode],
      cwd: REPOSITORY_ROOT,
    };
    const strict = () =>
      cache.run({
        ...request,
        taskId: mode === "sync throw" ? "0754" : "0755",
        role: mode === "sync throw" ? "SYNC_STRICT" : "ASYNC_STRICT",
      });
    const tolerant = () =>
      cache.run({
        ...request,
        taskId: mode === "sync throw" ? "1754" : "1755",
        role: mode === "sync throw" ? "SYNC_TOLERANT" : "ASYNC_TOLERANT",
        allowFailure: true,
      });
    const strictFailure = {
      taskId: mode === "sync throw" ? "0754" : "0755",
      role: mode === "sync throw" ? "SYNC_STRICT" : "ASYNC_STRICT",
      forbidden: [secret],
    };
    const tolerantFailure = {
      taskId: mode === "sync throw" ? "1754" : "1755",
      role: mode === "sync throw" ? "SYNC_TOLERANT" : "ASYNC_TOLERANT",
      forbidden: [secret],
    };
    if (strictFirst) {
      await assert.rejects(strict(), (error) =>
        assertRedactedCommandFailure(error, strictFailure),
      );
      await assert.rejects(tolerant(), (error) =>
        assertRedactedCommandFailure(error, tolerantFailure),
      );
    } else {
      await assert.rejects(tolerant(), (error) =>
        assertRedactedCommandFailure(error, tolerantFailure),
      );
      await assert.rejects(strict(), (error) =>
        assertRedactedCommandFailure(error, strictFailure),
      );
    }
    assert.equal(calls, 1);
    assert.deepEqual(cache.stats(), {
      hits: 1,
      misses: 1,
      entries: 1,
      maxCommands: 1024,
    });
  }
});

test("command cache exhaustion remains bounded without retries or counter drift", async () => {
  let calls = 0;
  const cache = createInvocationCommandCache({
    maxCommands: 2,
    runner: ({ command }) => {
      calls += 1;
      return { status: 0, stdout: command, stderr: "" };
    },
  });
  const gitRequest = {
    command: "git",
    args: ["fixture", "bounded"],
    cwd: REPOSITORY_ROOT,
    taskId: "0075",
    role: "BOUNDED_GIT",
  };
  const first = await cache.run(gitRequest);
  const tolerantDuplicate = await cache.run({
    ...gitRequest,
    allowFailure: true,
  });
  assert.strictEqual(first, tolerantDuplicate);
  await cache.run({
    command: "gh",
    args: ["api", "repos/owner/repository"],
    cwd: REPOSITORY_ROOT,
    taskId: "0075",
    role: "BOUNDED_API",
  });
  const exhausted = {
    command: "gh",
    args: ["run", "view", "123", "--log", "bound-secret-must-not-escape"],
    cwd: REPOSITORY_ROOT,
  };
  for (const [taskId, role, allowFailure] of [
    ["0756", "FIRST_EXHAUSTED", true],
    ["9756", "SECOND_EXHAUSTED", false],
  ]) {
    await assert.rejects(
      cache.run({ ...exhausted, taskId, role, allowFailure }),
      (error) =>
        error.code === "DELIVERY_HYDRATION_BOUND_EXCEEDED" &&
        error.message === `Task ${taskId} ${role}: query bound 2 was exhausted` &&
        !error.message.includes("bound-secret-must-not-escape"),
    );
  }
  assert.equal(calls, 2);
  assert.deepEqual(cache.details(), {
    hits: 1,
    misses: 2,
    entries: 2,
    maxCommands: 2,
    gitCommands: 1,
    githubApiCommands: 1,
    jobLogFetches: 0,
  });
});

test("maxBuffer and cache command bounds reject non-finite or fractional values", async () => {
  for (const maxCommands of [NaN, Infinity, -1, 1.5]) {
    assert.throws(
      () => createInvocationCommandCache({ maxCommands }),
      /maxCommands must be a non-negative safe integer/,
    );
  }

  let calls = 0;
  const cache = createInvocationCommandCache({
    runner: () => {
      calls += 1;
      return { status: 0, stdout: "unexpected", stderr: "" };
    },
  });
  for (const maxBuffer of [NaN, Infinity, -1, 1.5]) {
    await assert.rejects(
      cache.run({
        command: "git",
        args: ["fixture", "invalid-buffer"],
        cwd: REPOSITORY_ROOT,
        taskId: "0075",
        role: "INVALID_BUFFER",
        maxBuffer,
      }),
      (error) =>
        error.code === "DELIVERY_HYDRATION_BOUND_EXCEEDED" &&
        error.message ===
          "Task 0075 INVALID_BUFFER: maxBuffer must be a non-negative safe integer",
    );
  }
  assert.equal(calls, 0);
  assert.deepEqual(cache.stats(), {
    hits: 0,
    misses: 0,
    entries: 0,
    maxCommands: 1024,
  });
});

test("Git scalar and porcelain helpers keep command-output boundaries distinct", async () => {
  for (const [label, stdout, expected] of [
    ["sha", `${"a".repeat(40)}\n`, "a".repeat(40)],
    [
      "branch",
      "task/0123-portable-dispatch\r\n",
      "task/0123-portable-dispatch",
    ],
    [
      "remote",
      "https://github.com/kimyeongwoo/kyw-dev.git\n",
      "https://github.com/kimyeongwoo/kyw-dev.git",
    ],
  ]) {
    const cache = createInvocationCommandCache({
      runner: ({ command, args }) => {
        assert.equal(command, "git");
        assert.deepEqual(args, ["fixture", label]);
        return { status: 0, stdout, stderr: "" };
      },
    });
    assert.equal(
      await gitScalarText(cache, REPOSITORY_ROOT, ["fixture", label]),
      expected,
    );
  }

  const porcelain = " M docs/ARCHITECTURE.md\n?? untracked-file\n";
  const cache = createInvocationCommandCache({
    runner: () => ({ status: 0, stdout: porcelain, stderr: "" }),
  });
  assert.equal(
    await gitPorcelainText(cache, REPOSITORY_ROOT, ["status", "--porcelain=v1"]),
    porcelain,
  );
});


test("GitHub adapter fails closed on malformed JSON and partial pagination", async () => {
  const malformedCache = createInvocationCommandCache({
    runner: () => ({ status: 0, stdout: "{", stderr: "" }),
  });
  const malformed = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: malformedCache,
  });
  await assert.rejects(
    malformed.getWorkflow({ taskId: "0058", role: "GITHUB_WORKFLOW" }),
    /Task 0058 GITHUB_WORKFLOW.*malformed JSON/,
  );

  const partialCache = createInvocationCommandCache({
    runner: () => ({
      status: 0,
      stdout: JSON.stringify({ total_count: 2, workflow_runs: [{ id: 1 }] }),
      stderr: "",
    }),
  });
  const partial = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: partialCache,
  });
  await assert.rejects(
    partial.listRuns(71, { event: "push" }, {
      taskId: "0058",
      role: "POST_MAIN_RUNS",
    }),
    /partial, malformed, or exceeds bound/,
  );
});

test("GitHub job adapter keeps all/latest and attempt-specific collection meanings distinct", async () => {
  const endpoints = [];
  const cache = createInvocationCommandCache({
    runner: ({ args }) => {
      endpoints.push(args.at(-1));
      return {
        status: 0,
        stdout: JSON.stringify({ total_count: 0, jobs: [] }),
        stderr: "",
      };
    },
  });
  const client = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: cache,
  });
  await client.listJobs(1001, 1, {
    taskId: "0058",
    role: "ATTEMPT_JOBS",
  });
  await client.listJobs(1001, "all", {
    taskId: "0058",
    role: "ALL_JOBS",
  });
  await client.listJobs(1001, "latest", {
    taskId: "0058",
    role: "LATEST_JOBS",
  });
  assert.deepEqual(endpoints, [
    "repos/owner/repository/actions/runs/1001/attempts/1/jobs?per_page=100&page=1",
    "repos/owner/repository/actions/runs/1001/jobs?filter=all&per_page=100&page=1",
    "repos/owner/repository/actions/runs/1001/jobs?filter=latest&per_page=100&page=1",
  ]);
  await assert.rejects(
    client.listJobs(1001, "unknown", {
      taskId: "0058",
      role: "JOBS",
    }),
    /selector must be an attempt or all\/latest/,
  );
});

test("GitHub adapters pin github.com despite hostile ambient host configuration", async (t) => {
  const originalGitHubHost = process.env.GH_HOST;
  process.env.GH_HOST = "attacker.invalid";
  t.after(() => {
    if (originalGitHubHost === undefined) delete process.env.GH_HOST;
    else process.env.GH_HOST = originalGitHubHost;
  });
  const calls = [];
  const cache = createInvocationCommandCache({
    runner: ({ command, args }) => {
      calls.push({ command, args: [...args] });
      return {
        status: 0,
        stdout: args[0] === "api" ? "{}" : "bounded fixture log",
        stderr: "",
      };
    },
  });
  const client = createGitHubEvidenceClient({
    repository: "owner/repository",
    repositoryRoot: REPOSITORY_ROOT,
    commandCache: cache,
  });
  await client.getWorkflow({ taskId: "0058", role: "WORKFLOW" });
  await client.getJobLog(501, 1, 601, {
    taskId: "0058",
    role: "JOB_LOG",
  });
  assert.deepEqual(calls[0].args.slice(0, 6), [
    "api",
    "--hostname",
    "github.com",
    "--method",
    "GET",
    "repos/owner/repository/actions/workflows/ci.yml",
  ]);
  assert.equal(
    calls[1].args[calls[1].args.indexOf("--repo") + 1],
    "github.com/owner/repository",
  );
  assert.equal(
    calls.some(({ args }) => args.includes("attacker.invalid")),
    false,
  );
});

test("external command failure classes never expose raw GitHub diagnostics", async () => {
  for (const [stderr, pattern] of [
    ["gh is not logged into any GitHub hosts token=secret", /authentication failure/],
    ["API rate limit exceeded header=secret", /rate limit/],
    ["Resource not accessible by integration header=secret", /authorization failure/],
  ]) {
    const cache = createInvocationCommandCache({
      runner: () => ({ status: 1, stdout: "", stderr }),
    });
    await assert.rejects(
      cache.run({
        command: "gh",
        args: ["api", "repos/owner/repository"],
        cwd: REPOSITORY_ROOT,
        taskId: "0058",
        role: "GITHUB",
      }),
      (error) => pattern.test(error.message) && !error.message.includes("secret"),
    );
  }
  const timeout = createInvocationCommandCache({
    runner: () => ({
      status: null,
      stdout: "",
      stderr: "",
      error: Object.assign(new Error("timed out token=secret"), {
        code: "ETIMEDOUT",
      }),
    }),
  });
  await assert.rejects(
    timeout.run({
      command: "gh",
      args: ["api", "repos/owner/repository"],
      cwd: REPOSITORY_ROOT,
      taskId: "0058",
      role: "GITHUB",
    }),
    (error) => /timeout/.test(error.message) && !error.message.includes("secret"),
  );
});

test("no-prior hydration performs no local Git or GitHub collection", async () => {
  let localCalls = 0;
  const result = await hydratePriorStandardDeliveries({
    tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
    invocation: "$kyw-impl 0001",
    allowUncheckpointedCompatibility: true,
    queueInspector: async () => ({
      tasks: [task({ id: "0001", status: "READY" })],
      errors: [],
    }),
    localDiscovery: async () => {
      localCalls += 1;
      throw new Error("must not be called");
    },
  });
  assert.equal(localCalls, 0);
  assert.deepEqual(result.diagnostics.requiredTaskIds, []);
  assert.deepEqual(result.deliveryLedger, {});
});

test("an old exact Task hydrates its selected contract without replaying later pending Tasks", async () => {
  await assert.rejects(
    hydratePriorStandardDeliveries({
      tasksRoot: path.join(REPOSITORY_ROOT, "docs", "tasks"),
      invocation: "$kyw-impl 0030",
      allowUncheckpointedCompatibility: true,
      queueInspector: async () => ({
        tasks: [
          task({ id: "0030" }),
          task({ id: "0054" }),
          task({ id: "0059", status: "READY" }),
        ],
        errors: [],
      }),
      localDiscovery: async ({ requiredTasks, contractTasks }) => {
        assert.deepEqual(requiredTasks.map(({ id }) => id), ["0030"]);
        assert.deepEqual(contractTasks.map(({ id }) => id), ["0030"]);
        throw new Error("anchor planning observed");
      },
    }),
    /anchor planning observed/,
  );
});

test("retired dispatch rebaseline option is rejected before hydration", async () => {
  let hydrationCalls = 0;
  await assert.rejects(
    runTaskArtifactCommand(
      [
        "dispatch",
        "--tasks-root",
        path.join(REPOSITORY_ROOT, "docs", "tasks"),
        "--invocation",
        "$kyw-impl 0070",
        "--managed-routing",
        "false",
        "--continuity-bootstrap-authority",
        "EXPLICIT_REBASELINE",
      ],
      {
        hydratePriorStandardDeliveries: async () => {
          hydrationCalls += 1;
        },
      },
    ),
    /Unknown option --continuity-bootstrap-authority/,
  );
  assert.equal(hydrationCalls, 0);
});

test("bootstrap-continuity remains a separate explicit migration command", async () => {
  const baseArguments = [
    "bootstrap-continuity",
    "--tasks-root",
    path.join(REPOSITORY_ROOT, "docs", "tasks"),
    "--invocation",
    "$kyw-impl 0170",
    "--managed-routing",
    "false",
  ];
  let bootstrapCalls = 0;
  const runtime = {
    bootstrapStandardDeliveryContinuity: async (options) => {
      bootstrapCalls += 1;
      assert.equal(options.invocation, "$kyw-impl 0170");
      assert.equal(options.managedRoutingAvailable, false);
      return {
        checkpoint: { checkpointDigest: "a".repeat(64) },
        write: { applied: true },
        diagnostics: { requiredTaskIds: ["0169"] },
      };
    },
  };

  await assert.rejects(
    runTaskArtifactCommand(baseArguments, runtime),
    /Missing required option --migration-authority/,
  );
  await assert.rejects(
    runTaskArtifactCommand(
      [...baseArguments, "--migration-authority", "IMPLICIT"],
      runtime,
    ),
    /requires explicit migration\/rebaseline authority/,
  );
  assert.equal(bootstrapCalls, 0);

  const result = await runTaskArtifactCommand(
    [...baseArguments, "--migration-authority", "EXPLICIT_REBASELINE"],
    runtime,
  );
  assert.equal(bootstrapCalls, 1);
  assert.equal(result.command, "bootstrap-continuity");
  assert.equal(result.checkpoint.checkpointDigest, "a".repeat(64));
});

test("bootstrap backend rejects self-coverage, partial history, and an existing checkpoint", async () => {
  let localDiscoveryCalls = 0;
  await assert.rejects(
    bootstrapStandardDeliveryContinuity({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      invocation: "$kyw-impl 0070",
      queueInspector: async () => ({
        tasks: [task({ id: "0070", contractVersion: 3 })],
        errors: [],
      }),
      localDiscovery: async () => {
        localDiscoveryCalls += 1;
      },
      writeCheckpoint: false,
    }),
    /Task 0070 CHECKPOINT_BOOTSTRAP: the invoked Task cannot attest to its own delivery/,
  );
  assert.equal(localDiscoveryCalls, 0);

  await assert.rejects(
    bootstrapStandardDeliveryContinuity({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      invocation: "$kyw-impl 0102",
      queueInspector: async () => ({
        tasks: [
          task({ id: "0100", contractVersion: 3 }),
          task({ id: "0101", contractVersion: 3 }),
          task({ id: "0102", status: "READY", contractVersion: 3 }),
        ],
        errors: [],
      }),
      localDiscovery: async () => ({ outcomes: [{ taskId: "0100" }] }),
      writeCheckpoint: false,
    }),
    /local discovery returned a partial or malformed outcome set/,
  );

  await assert.rejects(
    bootstrapStandardDeliveryContinuity({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      invocation: "$kyw-impl 0101",
      queueInspector: async () => ({
        tasks: [
          task({ id: "0100", contractVersion: 3 }),
          task({ id: "0101", status: "READY", contractVersion: 3 }),
        ],
        errors: [],
      }),
      localDiscovery: async () => ({
        repositoryRoot: REPOSITORY_ROOT,
        currentMainSha: "f".repeat(40),
        outcomes: [{ taskId: "0100" }],
      }),
      commandRunner: () => ({
        status: 0,
        stdout: "noncanonical existing checkpoint bytes\n",
        stderr: "",
      }),
      writeCheckpoint: false,
    }),
    /aligned main already contains a continuity checkpoint/,
  );
});

test(
  "live repository and GitHub hydration recovers the queue-required hardened chain",
  { skip: process.env.KYW_LIVE_GITHUB_HYDRATION !== "1" },
  async (t) => {
    const statusBefore = readRepositoryPorcelainStatus(REPOSITORY_ROOT);
    const alignedBefore =
      readAlignedMainStandardDeliveryCheckpoint(REPOSITORY_ROOT);
    const queue = await inspectTaskQueue(REPOSITORY_TASKS_ROOT);
    assert.deepEqual(queue.errors, []);
    const probe = createSyntheticStandardDeliveryProbe({
      tasks: queue.tasks,
      tasksRoot: REPOSITORY_TASKS_ROOT,
    });
    const expected = deriveStandardDeliveryFrontier({
      tasks: probe.tasks,
      invocation: probe.invocation,
      checkpoint: alignedBefore.checkpoint,
    });
    const hydrated = await hydratePriorStandardDeliveries({
      tasksRoot: REPOSITORY_TASKS_ROOT,
      invocation: probe.invocation,
      queueInspector: async () => ({ tasks: probe.tasks, errors: [] }),
    });
    assert.deepEqual(
      hydrated.diagnostics.requiredTaskIds,
      expected.requiredTaskIds,
    );
    assert.deepEqual(
      hydrated.diagnostics.continuity.coveredTaskIds,
      expected.coveredTaskIds,
    );
    assert.deepEqual(
      hydrated.diagnostics.continuity.uncoveredTaskIds,
      expected.uncoveredTaskIds,
    );
    assert.equal(
      hydrated.diagnostics.continuity.freshEvidenceTaskCount,
      expected.uncoveredTaskIds.length,
    );
    assert.equal(
      hydrated.diagnostics.continuity.preparedAdvancement,
      expected.preparedAdvancement,
    );
    assert.deepEqual(
      Object.keys(hydrated.deliveryLedger).sort(),
      [...expected.requiredTaskIds].sort(),
    );
    assert.deepEqual(
      Object.keys(hydrated.deliveryExpectations).sort(),
      [...expected.requiredTaskIds].sort(),
    );
    for (const taskId of expected.requiredTaskIds) {
      assert.equal(
        hydrated.diagnostics.classifications[taskId],
        expected.classifications[taskId],
      );
      const evaluation = evaluateDeliveryEvidence(
        taskId,
        hydrated.deliveryLedger[taskId],
        hydrated.deliveryExpectations[taskId],
      );
      assert.equal(
        evaluation.satisfied,
        true,
        `Task ${taskId}: ${evaluation.issues.join("; ")}`,
      );
    }
    assertBoundedLiveQueryCounts(hydrated.diagnostics);
    t.diagnostic(
      `frontier required=${expected.requiredTaskIds.length} covered=${expected.coveredTaskIds.length} uncovered=${expected.uncoveredTaskIds.join(",") || "none"}; queries commands=${hydrated.diagnostics.queryCounts.commands} github=${hydrated.diagnostics.queryCounts.githubApiCommands} logs=${hydrated.diagnostics.queryCounts.jobLogFetches}`,
    );
    const alignedAfter =
      readAlignedMainStandardDeliveryCheckpoint(REPOSITORY_ROOT);
    assert.equal(alignedAfter.bytes, alignedBefore.bytes);
    assert.equal(
      readRepositoryPorcelainStatus(REPOSITORY_ROOT),
      statusBefore,
    );
  },
);

test("public-release hydration rejects local-to-delivered Task release-version drift before public clients", async (t) => {
  const fixture = await publicReleaseHydrationGuardFixture(t);
  await writeFile(
    fixture.taskPath,
    fixture.pair.task.replace(
      "- Release version: 2.0.0",
      "- Release version: 2.0.1",
    ),
  );
  const publicCalls = [];
  await assert.rejects(
    hydratePublicReleaseContext({
      tasksRoot: fixture.tasksRoot,
      taskId: fixture.taskId,
      deliveryLedger: { [fixture.taskId]: fixture.normalized.entry },
      deliveryExpectations: {
        [fixture.taskId]: fixture.normalized.expectation,
      },
      commandRunner: fixture.commandRunner,
      clients: rejectingPublicClients(publicCalls),
    }),
    (error) =>
      error.code === "PUBLIC_RELEASE_TASK_VERSION_MISMATCH" &&
      /delivered Task tree does not carry the same contract-4 Release version/u.test(
        error.message,
      ),
  );
  assert.deepEqual(publicCalls, []);
});

test("public-release hydration rejects Task-to-delivered package and plugin version drift before public clients", async (t) => {
  const fixture = await publicReleaseHydrationGuardFixture(t, {
    packageVersion: "2.0.1",
    pluginVersion: "2.0.1",
  });
  const publicCalls = [];
  await assert.rejects(
    hydratePublicReleaseContext({
      tasksRoot: fixture.tasksRoot,
      taskId: fixture.taskId,
      deliveryLedger: { [fixture.taskId]: fixture.normalized.entry },
      deliveryExpectations: {
        [fixture.taskId]: fixture.normalized.expectation,
      },
      commandRunner: fixture.commandRunner,
      clients: rejectingPublicClients(publicCalls),
    }),
    (error) =>
      error.code === "PUBLIC_RELEASE_TASK_VERSION_MISMATCH" &&
      /delivered package and plugin versions must equal the explicitly selected release version/u.test(
        error.message,
      ),
  );
  assert.deepEqual(publicCalls, []);
});

test("public-release hydration rejects an ineligible contract-4 NONE Task before public clients", async (t) => {
  const fixture = await publicReleaseHydrationGuardFixture(t);
  await writeFile(
    fixture.taskPath,
    fixture.pair.task.replace(
      "- Requirement: STANDARD\n- Release version: 2.0.0\n- Canonical ledger: GitHub PR/Actions exact-SHA state.",
      "- Requirement: NONE — this fixture has no external delivery.",
    ),
  );
  const publicCalls = [];
  await assert.rejects(
    hydratePublicReleaseContext({
      tasksRoot: fixture.tasksRoot,
      taskId: fixture.taskId,
      deliveryLedger: { [fixture.taskId]: fixture.normalized.entry },
      deliveryExpectations: {
        [fixture.taskId]: fixture.normalized.expectation,
      },
      commandRunner: fixture.commandRunner,
      clients: rejectingPublicClients(publicCalls),
    }),
    (error) =>
      error.code === "PUBLIC_RELEASE_TASK_INELIGIBLE" &&
      /terminal contract-4 STANDARD Task/u.test(error.message),
  );
  assert.deepEqual(publicCalls, []);
});

test("public-release hydration rejects a malformed contract-4 STANDARD Task before public clients", async (t) => {
  const fixture = await publicReleaseHydrationGuardFixture(t);
  await writeFile(
    fixture.taskPath,
    fixture.pair.task.replace("- Release version: 2.0.0\n", ""),
  );
  const publicCalls = [];
  await assert.rejects(
    hydratePublicReleaseContext({
      tasksRoot: fixture.tasksRoot,
      taskId: fixture.taskId,
      deliveryLedger: { [fixture.taskId]: fixture.normalized.entry },
      deliveryExpectations: {
        [fixture.taskId]: fixture.normalized.expectation,
      },
      commandRunner: fixture.commandRunner,
      clients: rejectingPublicClients(publicCalls),
    }),
    (error) =>
      error.code === "PUBLIC_RELEASE_TASK_INVALID" &&
      /Task queue validation failed/u.test(error.message),
  );
  assert.deepEqual(publicCalls, []);
});

test("public-release tuple hydration packs only the immutable delivered tree", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-public-tuple-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const tasksRoot = path.join(repositoryRoot, "docs", "tasks");
  const fixture = hardenedFixture();
  const pair = publicReleaseTaskPair(fixture.outcome.taskId, "2.0.0");
  const pairRoot = path.join(tasksRoot, `${fixture.outcome.taskId}-fixture`);
  await Promise.all([
    mkdir(pairRoot, { recursive: true }),
    mkdir(path.join(repositoryRoot, ".github", "workflows"), { recursive: true }),
    mkdir(path.join(repositoryRoot, ".codex-plugin"), { recursive: true }),
    mkdir(path.join(repositoryRoot, "src"), { recursive: true }),
  ]);
  const repository = "owner/repository";
  const packageJson = {
    name: "kyw-dev",
    version: "2.0.0",
    private: false,
    repository: {
      type: "git",
      url: `git+https://github.com/${repository}.git`,
    },
    type: "module",
    files: [".codex-plugin/", "src/"],
    publishConfig: {
      access: "public",
      registry: "https://registry.npmjs.org/",
    },
  };
  const pluginJson = { name: "kyw-dev", version: "2.0.0" };
  const workflowText = (await readFile(
    path.join(REPOSITORY_ROOT, ".github", "workflows", "publish.yml"),
    "utf8",
  )).replaceAll("kimyeongwoo/kyw-dev", repository);
  await Promise.all([
    writeFile(
      path.join(repositoryRoot, "package.json"),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    ),
    writeFile(
      path.join(repositoryRoot, ".codex-plugin", "plugin.json"),
      `${JSON.stringify(pluginJson, null, 2)}\n`,
    ),
    writeFile(
      path.join(repositoryRoot, ".github", "workflows", "publish.yml"),
      workflowText,
    ),
    writeFile(path.join(repositoryRoot, "src", "index.mjs"), "export const ok = true;\n"),
    writeFile(path.join(pairRoot, "TASK.md"), pair.task),
    writeFile(path.join(pairRoot, "TEST.md"), pair.test),
  ]);
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "fixture"]);
  const mergeSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  retargetHardenedFixtureMerge(fixture, mergeSha);
  const normalized = normalizeFixture(fixture);
  assert.equal(
    evaluateDeliveryEvidence(
      fixture.outcome.taskId,
      normalized.entry,
      normalized.expectation,
    ).satisfied,
    true,
  );

  await writeFile(path.join(repositoryRoot, "later.txt"), "later main commit\n");
  git(repositoryRoot, ["add", "later.txt"]);
  git(repositoryRoot, ["commit", "-m", "advance main"]);
  const advancedMainSha = git(repositoryRoot, ["rev-parse", "HEAD"]);

  // A worktree-only npm config must not influence the exact archive checkout.
  await writeFile(
    path.join(repositoryRoot, ".npmrc"),
    "registry=https://malicious.invalid/\n",
  );
  const commandTrace = [];
  const tupleSigningKeyPair = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const tupleSigningPublicKey = tupleSigningKeyPair.publicKey.export({
    type: "spki",
    format: "der",
  });
  const noMutation = async () => {
    throw new Error("fixture public mutator must not run");
  };
  const suppliedClients = {
    readPublishWorkflowIdentity: async () => ({
      id: 77,
      name: "Publish npm package through OIDC",
      path: ".github/workflows/publish.yml",
      state: "active",
    }),
    readPackageIndex: async (_identity, context) => {
      assert.equal(context.fresh, true);
      assert.equal(context.cacheBypass, true);
      return {
        versions: { "1.0.0": {} },
        "dist-tags": { latest: "1.0.0" },
      };
    },
    readSigningKeys: async (_registry, context) => {
      assert.equal(context.purpose, "TUPLE_FREEZE");
      return {
        keys: [
          {
            keyid: "SHA256:fixture",
            key: tupleSigningPublicKey.toString("base64"),
            expires: null,
          },
        ],
      };
    },
    readWorkflowRuns: async () => ({ runs: [], complete: true }),
    readNpmVersion: async () => undefined,
    readTag: async () => undefined,
    readRelease: async () => undefined,
    dispatchPublishWorkflow: noMutation,
    createTag: noMutation,
    createRelease: noMutation,
  };
  const hydrated = await hydratePublicReleaseContext({
    tasksRoot,
    taskId: fixture.outcome.taskId,
    deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
    deliveryExpectations: { [fixture.outcome.taskId]: normalized.expectation },
    commandRunner: publicReleaseLocalRunner(commandTrace),
    clients: suppliedClients,
  });
  assert.equal(Object.isFrozen(hydrated.tuple), true);
  assert.equal(hydrated.tuple.target.mergeSha, mergeSha);
  assert.deepEqual(hydrated.tuple.publishWorkflow.publisher, {
    provider: "GitHub Actions",
    authentication: "OIDC",
    repository,
    workflow: "publish.yml",
    environment: "npm-production",
    action: "npm publish",
  });
  assert.equal(hydrated.tuple.publishWorkflow.event, "workflow_dispatch");
  assert.equal(hydrated.tuple.publishWorkflow.environment, "npm-production");
  assert.equal(hydrated.diagnostics.baseHeadSha, advancedMainSha);
  assert.equal(hydrated.diagnostics.baseHeadRelation, "DESCENDANT");
  assert.equal(
    hydrated.tuple.target.treeSha,
    git(repositoryRoot, ["rev-parse", `${mergeSha}^{tree}`]),
  );
  assert.deepEqual(hydrated.tuple.package.priorVersions, ["1.0.0"]);
  assert.equal(hydrated.tuple.package.priorLatest, "1.0.0");
  assert.ok(hydrated.tuple.package.tarball.bytes > 0);
  assert.deepEqual(
    hydrated.tuple.package.tarball.entries,
    [...hydrated.tuple.package.tarball.entries].sort(),
  );
  assert.equal(hydrated.diagnostics.repositoryMutation, false);
  assert.equal(hydrated.diagnostics.externalMutation, false);
  const archiveCall = commandTrace.find(
    ({ command, args }) => command === "git" && args[0] === "archive",
  );
  const packCall = commandTrace.find(({ args }) => args.includes("pack"));
  assert.equal(archiveCall.args.at(-1), mergeSha);
  assert.notEqual(packCall.cwd, repositoryRoot);
  assert.match(packCall.cwd, /kyw-public-release-pack-/u);
  assert.equal(
    commandTrace.some(({ command }) => command === "gh"),
    false,
  );

  const registryMessage = Buffer.from(
    `${packageJson.name}@${packageJson.version}:${hydrated.tuple.package.tarball.integrity}`,
  );
  const targetSignatureA = sign(
    "sha256",
    registryMessage,
    tupleSigningKeyPair.privateKey,
  ).toString("base64");
  const targetSignatureB = sign(
    "sha256",
    registryMessage,
    tupleSigningKeyPair.privateKey,
  ).toString("base64");
  const targetWrongMessageSignature = sign(
    "sha256",
    Buffer.from(
      `${packageJson.name}@${packageJson.version}:sha512-${Buffer.alloc(64, 9).toString("base64")}`,
    ),
    tupleSigningKeyPair.privateKey,
  ).toString("base64");
  const rotatedPair = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const multiKeys = { keys: [
    { keyid: "SHA256:fixture", key: tupleSigningPublicKey.toString("base64"), expires: null },
    { keyid: "SHA256:rotated", key: rotatedPair.publicKey.export({ type: "spki", format: "der" }).toString("base64"), expires: null },
  ] };
  let originalMultiTuple;
  const rotatedSignature = sign("sha256", registryMessage, rotatedPair.privateKey).toString("base64");
  const multiClients = { ...suppliedClients,
    readSigningKeys: async () => multiKeys,
    readPackageIndex: async () => originalMultiTuple ? {
      versions: { "1.0.0": {}, "2.0.0": { dist: { signatures: [{ keyid: "SHA256:rotated", sig: rotatedSignature }] } } },
      "dist-tags": { latest: "2.0.0" }, time: { "2.0.0": "2026-09-05T00:00:00Z" },
    } : { versions: { "1.0.0": {} }, "dist-tags": { latest: "1.0.0" } },
    readWorkflowRuns: async () => ({ complete: true, runs: originalMultiTuple ? [{
      runId: 901, runAttempt: 1, repository, workflowId: 77,
      workflowName: originalMultiTuple.publishWorkflow.name, workflowPath: originalMultiTuple.publishWorkflow.path,
      event: "workflow_dispatch", ref: "refs/heads/main", headSha: mergeSha,
      status: "completed", conclusion: "success", inputs: derivePublicReleaseWorkflowInputs(originalMultiTuple),
      publishAttempts: [{ checkoutSha: mergeSha, conclusion: "SUCCESS",
        command: "npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/" }],
    }] : [] }),
  };
  const hydrateMulti = () => hydratePublicReleaseContext({ tasksRoot, taskId: fixture.outcome.taskId,
    deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
    deliveryExpectations: { [fixture.outcome.taskId]: normalized.expectation },
    commandRunner: publicReleaseLocalRunner([]), clients: multiClients,
  });
  originalMultiTuple = (await hydrateMulti()).tuple;
  assert.deepEqual(originalMultiTuple.package.signature, {
    required: true, keyId: "SHA256:fixture", keyIds: ["SHA256:fixture", "SHA256:rotated"],
  });
  const resumedMulti = await hydrateMulti();
  assert.deepEqual(resumedMulti.tuple, originalMultiTuple,
    "after publication by the other active key, rehydration must retain the exact dispatch tuple");
  const targetSignatureSets = {
    single: [{ keyid: "SHA256:fixture", sig: targetSignatureA }],
    "two-valid": [
      { keyid: "SHA256:fixture", sig: targetSignatureA },
      { keyid: "SHA256:fixture", sig: targetSignatureB },
    ],
    empty: [],
    "mixed-key": [
      { keyid: "SHA256:fixture", sig: targetSignatureA },
      { keyid: "SHA256:other-key", sig: targetSignatureB },
    ],
    "wrong-first": [
      { keyid: "SHA256:other-key", sig: targetSignatureA },
      { keyid: "SHA256:fixture", sig: targetSignatureB },
    ],
    "wrong-message": [
      { keyid: "SHA256:fixture", sig: targetWrongMessageSignature },
    ],
    "invalid-first": [
      {
        keyid: "SHA256:fixture",
        sig: Buffer.from("invalid first signature").toString("base64"),
      },
      { keyid: "SHA256:fixture", sig: targetSignatureB },
    ],
    "invalid-second": [
      { keyid: "SHA256:fixture", sig: targetSignatureA },
      {
        keyid: "SHA256:fixture",
        sig: Buffer.from("invalid second signature").toString("base64"),
      },
    ],
    "malformed-second": [
      { keyid: "SHA256:fixture", sig: targetSignatureA },
      { keyid: "SHA256:fixture", sig: "!!" },
    ],
  };
  const targetPresentClients = (signatureMode) => ({
    ...suppliedClients,
    readPackageIndex: async (_identity, context) => {
      assert.equal(context.fresh, true);
      assert.equal(context.cacheBypass, true);
      return {
        versions: {
          "1.0.0": {},
          [packageJson.version]: {
            dist: { signatures: targetSignatureSets[signatureMode] },
          },
        },
        "dist-tags": { latest: packageJson.version },
        time: { [packageJson.version]: "2026-09-04T00:00:00.000Z" },
      };
    },
  });
  for (const signatureMode of ["single", "two-valid"]) {
    const targetPresent = await hydratePublicReleaseContext({
      tasksRoot,
      taskId: fixture.outcome.taskId,
      deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
      deliveryExpectations: { [fixture.outcome.taskId]: normalized.expectation },
      commandRunner: publicReleaseLocalRunner([]),
      clients: targetPresentClients(signatureMode),
    });
    assert.equal(
      targetPresent.tuple.package.signature.keyId,
      "SHA256:fixture",
      signatureMode,
    );
    assert.deepEqual(
      targetPresent.tuple.package.priorVersions,
      ["1.0.0"],
      signatureMode,
    );
  }
  for (const signatureMode of [
    "empty",
    "mixed-key",
    "wrong-first",
    "wrong-message",
    "invalid-first",
    "invalid-second",
    "malformed-second",
  ]) {
    const mutationTrace = [];
    const guardedClients = {
      ...targetPresentClients(signatureMode),
      dispatchPublishWorkflow: async () => mutationTrace.push("dispatch"),
      createTag: async () => mutationTrace.push("tag"),
      createRelease: async () => mutationTrace.push("release"),
    };
    await assert.rejects(
      hydratePublicReleaseContext({
        tasksRoot,
        taskId: fixture.outcome.taskId,
        deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
        deliveryExpectations: {
          [fixture.outcome.taskId]: normalized.expectation,
        },
        commandRunner: publicReleaseLocalRunner([]),
        clients: guardedClients,
      }),
      /nonempty registry signature set|entirely valid (?:trusted )?registry signature set|frozen signing key does not map/u,
      signatureMode,
    );
    assert.deepEqual(mutationTrace, [], signatureMode);
  }

  for (const publishConfigExtra of ["tag", "provenance", "extra"]) {
    const sourceGuardTrace = [];
    const sourceGuardRunner = publicReleaseLocalRunner(sourceGuardTrace);
    await assert.rejects(
      hydratePublicReleaseContext({
        tasksRoot,
        taskId: fixture.outcome.taskId,
        deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
        deliveryExpectations: {
          [fixture.outcome.taskId]: normalized.expectation,
        },
        commandRunner: async (options) => {
          if (
            options.command === "git" &&
            options.args[0] === "show" &&
            options.args[1].endsWith(":package.json")
          ) {
            return {
              status: 0,
              stdout: JSON.stringify({
                ...packageJson,
                publishConfig: {
                  ...packageJson.publishConfig,
                  [publishConfigExtra]: "fixture-extra",
                },
              }),
              stderr: "",
            };
          }
          return sourceGuardRunner(options);
        },
        clients: suppliedClients,
      }),
      /repository\/access\/registry identity is not the expected public tuple/u,
      publishConfigExtra,
    );
    assert.equal(
      sourceGuardTrace.some(({ command, args }) =>
        command === "gh" || args.includes("pack"),
      ),
      false,
      publishConfigExtra,
    );
  }

  const branchEntry = structuredClone(normalized.entry);
  const branchExpectation = structuredClone(normalized.expectation);
  branchEntry.merge.branch = "trunk";
  branchEntry.pullRequest.baseRef = "trunk";
  branchEntry.postMerge.branch = "trunk";
  branchExpectation.baseRef = "trunk";
  assert.equal(
    evaluateDeliveryEvidence(
      fixture.outcome.taskId,
      branchEntry,
      branchExpectation,
    ).satisfied,
    true,
  );
  await assert.rejects(
    hydratePublicReleaseContext({
      tasksRoot,
      taskId: fixture.outcome.taskId,
      deliveryLedger: { [fixture.outcome.taskId]: branchEntry },
      deliveryExpectations: { [fixture.outcome.taskId]: branchExpectation },
      commandRunner: publicReleaseLocalRunner([]),
      clients: suppliedClients,
    }),
    /permits only the exact main base/u,
  );

  const oversizeTrace = [];
  const localOversizeRunner = publicReleaseLocalRunner(oversizeTrace);
  await assert.rejects(
    hydratePublicReleaseContext({
      tasksRoot,
      taskId: fixture.outcome.taskId,
      deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
      deliveryExpectations: { [fixture.outcome.taskId]: normalized.expectation },
      commandRunner: async (options) => {
        if (options.args.includes("pack")) {
          const packRoot = options.args[options.args.indexOf("--pack-destination") + 1];
          await writeFile(
            path.join(packRoot, "oversize.tgz"),
            Buffer.alloc(8 * 1024 * 1024 + 1),
          );
          return {
            status: 0,
            stdout: JSON.stringify([
              {
                filename: "oversize.tgz",
                files: [{ path: "package.json" }],
              },
            ]),
            stderr: "",
          };
        }
        return localOversizeRunner(options);
      },
      clients: suppliedClients,
    }),
    /generated archive must be a regular file between 1 and 8388608 bytes/u,
  );
});

test("production public reads freeze terminal pair and continuity bytes, blobs, and modes", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "kyw-public-guard-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  const tasksRoot = path.join(repositoryRoot, "docs", "tasks");
  const pairRoot = path.join(tasksRoot, "0058-fixture");
  const workflowRoot = path.join(repositoryRoot, ".github", "workflows");
  const pluginRoot = path.join(repositoryRoot, ".codex-plugin");
  const sourceRoot = path.join(repositoryRoot, "src");
  await Promise.all([
    mkdir(pairRoot, { recursive: true }),
    mkdir(workflowRoot, { recursive: true }),
    mkdir(pluginRoot, { recursive: true }),
    mkdir(sourceRoot, { recursive: true }),
  ]);
  const repository = "owner/repository";
  const taskPath = "docs/tasks/0058-fixture/TASK.md";
  const testPath = "docs/tasks/0058-fixture/TEST.md";
  const continuityPath = `docs/tasks/${STANDARD_DELIVERY_CONTINUITY_FILE}`;
  const pair = publicReleaseTaskPair("0058", "2.0.0");
  const guardedBytes = new Map([
    [
      taskPath,
      Buffer.from(pair.task),
    ],
    [
      testPath,
      Buffer.from(pair.test),
    ],
    [continuityPath, Buffer.from('{"schemaVersion":1,"fixture":true}\n')],
  ]);
  const packageJson = {
    name: "kyw-dev",
    version: "2.0.0",
    private: false,
    repository: {
      type: "git",
      url: `git+https://github.com/${repository}.git`,
    },
    type: "module",
    files: [".codex-plugin/", "src/"],
    publishConfig: {
      access: "public",
      registry: "https://registry.npmjs.org/",
    },
  };
  const workflowText = (await readFile(
    path.join(REPOSITORY_ROOT, ".github", "workflows", "publish.yml"),
    "utf8",
  )).replaceAll("kimyeongwoo/kyw-dev", repository);
  await Promise.all([
    ...[...guardedBytes].map(([relativePath, bytes]) =>
      writeFile(path.join(repositoryRoot, relativePath), bytes),
    ),
    writeFile(
      path.join(repositoryRoot, "package.json"),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    ),
    writeFile(
      path.join(pluginRoot, "plugin.json"),
      `${JSON.stringify({ name: "kyw-dev", version: "2.0.0" }, null, 2)}\n`,
    ),
    writeFile(path.join(workflowRoot, "publish.yml"), workflowText),
    writeFile(path.join(sourceRoot, "index.mjs"), "export const ok = true;\n"),
  ]);
  git(repositoryRoot, ["init", "-b", "main"]);
  git(repositoryRoot, ["config", "user.email", "fixture@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Fixture"]);
  git(repositoryRoot, ["config", "core.autocrlf", "false"]);
  git(repositoryRoot, ["add", "."]);
  git(repositoryRoot, ["commit", "-m", "freeze guarded publication source"]);
  const mergeSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const fixture = retargetHardenedFixtureMerge(hardenedFixture(), mergeSha);
  const normalized = normalizeFixture(fixture);
  await writeFile(path.join(repositoryRoot, "later.txt"), "unrelated descendant\n");
  git(repositoryRoot, ["add", "later.txt"]);
  git(repositoryRoot, ["commit", "-m", "advance main without guarded drift"]);
  const advancedMainSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const advancedTreeSha = git(repositoryRoot, [
    "rev-parse",
    `${advancedMainSha}^{tree}`,
  ]);

  const gitEntries = new Map(
    [...guardedBytes.keys()].map((relativePath) => {
      const line = git(repositoryRoot, ["ls-tree", advancedMainSha, "--", relativePath]);
      const matched = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/u.exec(line);
      assert.ok(matched, relativePath);
      return [relativePath, { mode: matched[1], sha: matched[2] }];
    }),
  );
  const state = { remoteModePath: undefined };
  const guardedSigningPublicKey = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  }).publicKey.export({ type: "spki", format: "der" });
  const trace = [];
  const localRunner = publicReleaseLocalRunner(trace);
  const commandRunner = async (options) => {
    if (options.command !== "gh") return localRunner(options);
    trace.push({ command: options.command, args: [...options.args], cwd: options.cwd });
    const { args } = options;
    assert.equal(args[args.indexOf("--hostname") + 1], "github.com");
    assert.equal(args[args.indexOf("--method") + 1], "GET");
    const endpoint = args.at(-1);
    const result = (value) => ({
      status: 0,
      stdout: JSON.stringify(value),
      stderr: "",
    });
    if (endpoint.includes("/actions/workflows/publish.yml")) {
      return result({
        id: 77,
        name: "Publish npm package through OIDC",
        path: ".github/workflows/publish.yml",
        state: "active",
      });
    }
    if (endpoint.includes("/git/ref/heads/main")) {
      return result({
        ref: "refs/heads/main",
        object: { type: "commit", sha: advancedMainSha },
      });
    }
    if (endpoint.includes("/compare/")) {
      return result({
        status: "ahead",
        base_commit: { sha: mergeSha },
        merge_base_commit: { sha: mergeSha },
      });
    }
    if (endpoint.includes(`/git/commits/${advancedMainSha}`)) {
      return result({ sha: advancedMainSha, tree: { sha: advancedTreeSha } });
    }
    if (endpoint.includes(`/git/trees/${advancedTreeSha}`)) {
      return result({
        sha: advancedTreeSha,
        truncated: false,
        tree: [...gitEntries].map(([relativePath, entry]) => ({
          path: relativePath,
          mode:
            state.remoteModePath === relativePath ? "100755" : entry.mode,
          type: "blob",
          sha: entry.sha,
        })),
      });
    }
    if (endpoint.includes("/contents/")) {
      const encodedPath = endpoint.split("/contents/")[1].split("?")[0];
      const relativePath = decodeURIComponent(encodedPath);
      const entry = gitEntries.get(relativePath);
      const bytes = guardedBytes.get(relativePath);
      assert.ok(entry && bytes, relativePath);
      return result({
        type: "file",
        encoding: "base64",
        content: bytes.toString("base64"),
        sha: entry.sha,
        size: bytes.length,
      });
    }
    if (endpoint.includes("/actions/workflows/77/runs?")) {
      return result({ total_count: 0, workflow_runs: [] });
    }
    throw new Error(`unexpected guarded fixture endpoint ${endpoint}`);
  };
  const fetchImpl = async (url) => {
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === "/kyw-dev") {
      return Response.json({
        name: "kyw-dev",
        versions: { "1.0.0": {} },
        "dist-tags": { latest: "1.0.0" },
      });
    }
    if (pathname === "/-/npm/v1/keys") {
      return Response.json({
        keys: [
          {
            keyid: "SHA256:fixture",
            key: guardedSigningPublicKey.toString("base64"),
            expires: null,
          },
        ],
      });
    }
    throw new Error(`unexpected guarded fixture registry URL ${url}`);
  };
  const hydrated = await hydratePublicReleaseContext({
    tasksRoot,
    taskId: fixture.outcome.taskId,
    deliveryLedger: { [fixture.outcome.taskId]: normalized.entry },
    deliveryExpectations: { [fixture.outcome.taskId]: normalized.expectation },
    commandRunner,
    fetchImpl,
  });
  for (const purpose of [
    "INITIAL_PREFLIGHT",
    "PRE_TAG_WRITE",
    "FINAL_PROOF",
  ]) {
    const snapshot = await hydrated.clients.readWorkflowRuns(hydrated.tuple, {
      fresh: true,
      cacheBypass: true,
      purpose,
      sequence: 1,
    });
    assert.deepEqual(snapshot.runs, []);
    assert.equal(snapshot.baseHeadSha, advancedMainSha);
  }
  const githubEndpoints = trace
    .filter(({ command }) => command === "gh")
    .map(({ args }) => args.at(-1));
  assert.ok(
    githubEndpoints.findIndex((endpoint) =>
      endpoint.includes(`/git/commits/${advancedMainSha}`),
    ) <
      githubEndpoints.findIndex((endpoint) =>
        endpoint.includes(`/git/trees/${advancedTreeSha}`),
      ),
  );
  state.remoteModePath = taskPath;
  await assert.rejects(
    hydrated.clients.readWorkflowRuns(hydrated.tuple, {
      fresh: true,
      cacheBypass: true,
      purpose: "FINAL_PROOF",
      sequence: 2,
    }),
    /mode or blob identity changed/u,
  );
  state.remoteModePath = undefined;
  await writeFile(path.join(repositoryRoot, testPath), "worktree drift\n");
  await assert.rejects(
    hydrated.clients.readWorkflowRuns(hydrated.tuple, {
      fresh: true,
      cacheBypass: true,
      purpose: "PRE_RELEASE_WRITE",
      sequence: 3,
    }),
    /artifact bytes changed/u,
  );
  await writeFile(path.join(repositoryRoot, testPath), guardedBytes.get(testPath));
  await writeFile(path.join(repositoryRoot, continuityPath), "continuity drift\n");
  await assert.rejects(
    hydrated.clients.readWorkflowRuns(hydrated.tuple, {
      fresh: true,
      cacheBypass: true,
      purpose: "FINAL_PROOF",
      sequence: 4,
    }),
    /artifact bytes changed/u,
  );
  assert.equal(
    trace
      .filter(({ command }) => command === "gh")
      .some(({ args }) => args.includes("attacker.invalid")),
    false,
  );
});

test("production public clients use fresh bounded reads and one guarded POST per ordered stage", async (t) => {
  const originalGitHubHost = process.env.GH_HOST;
  process.env.GH_HOST = "attacker.invalid";
  t.after(() => {
    if (originalGitHubHost === undefined) delete process.env.GH_HOST;
    else process.env.GH_HOST = originalGitHubHost;
  });
  const harness = await publicClientHarness();
  const { clients, state, trace, tuple } = harness;
  const context = {
    fresh: true,
    cacheBypass: true,
    purpose: "FIXTURE_PREFLIGHT",
    sequence: 7,
  };
  const workflowAbsent = await clients.readWorkflowRuns(tuple, context);
  const npmAbsent = await clients.readNpmVersion(tuple, context);
  const tagAbsent = await clients.readTag(tuple, context);
  const releaseAbsent = await clients.readRelease(tuple, context);
  assert.deepEqual(workflowAbsent.runs, []);
  assert.equal(workflowAbsent.complete, true);
  assert.equal(workflowAbsent.baseHeadSha, tuple.target.mergeSha);
  assert.equal(npmAbsent.absent, true);
  assert.equal(npmAbsent.indexComplete, true);
  assert.deepEqual(npmAbsent.versions, tuple.package.priorVersions);
  assert.equal(npmAbsent.signatureKeyId, tuple.package.signature.keyId);
  assert.deepEqual(tagAbsent, { tags: [], complete: true });
  assert.deepEqual(releaseAbsent, { releases: [], complete: true });

  await clients.dispatchPublishWorkflow(tuple, { attempt: 1 });
  assert.equal(state.workflow, "active");
  const active = await clients.readWorkflowRuns(tuple, context);
  assert.equal(active.runs[0].status, "queued");
  assert.equal("publishAttempts" in active.runs[0], false);
  assert.equal(
    trace.some(
      ({ kind, args = [] }) =>
        kind === "command" &&
        args.some((arg) => String(arg).includes("/attempts/1/jobs")) &&
        state.workflow === "active",
    ),
    false,
  );

  state.workflow = "success";
  state.npm = "exact";
  state.remoteHeadSha = "a".repeat(40);
  const workflowExact = await clients.readWorkflowRuns(tuple, context);
  const npmExact = await clients.readNpmVersion(tuple, context);
  assert.equal(workflowExact.runs[0].publishAttempts.length, 1);
  assert.equal(workflowExact.runs[0].inputs.expectedSha, tuple.target.mergeSha);
  assert.equal(npmExact.tarball.rawBytesVerified, true);
  assert.deepEqual(npmExact.tarball.entries, tuple.package.tarball.entries);
  assert.equal(npmExact.provenance.verified, true);
  assert.equal(npmExact.provenance.runId, 501);
  assert.equal(npmExact.provenance.runAttempt, 1);
  assert.equal(harness.provenanceVerifications, 1);

  const repeatedValidSignatures = await publicClientHarness();
  repeatedValidSignatures.state.workflow = "success";
  repeatedValidSignatures.state.npm = "exact";
  repeatedValidSignatures.state.remoteHeadSha = "a".repeat(40);
  repeatedValidSignatures.state.registrySignatureMode = "two-valid";
  const repeatedValidSnapshot =
    await repeatedValidSignatures.clients.readNpmVersion(
      repeatedValidSignatures.tuple,
      context,
    );
  assert.deepEqual(repeatedValidSnapshot.signature, {
    keyId: repeatedValidSignatures.tuple.package.signature.keyId,
    keyIds: [repeatedValidSignatures.tuple.package.signature.keyId, repeatedValidSignatures.tuple.package.signature.keyId],
    verified: true,
  });
  assert.equal(
    classifyNpmPublication(
      repeatedValidSignatures.tuple,
      repeatedValidSnapshot,
    ).classification,
    "EXACT_ALREADY_COMPLETE",
  );
  assert.equal(
    repeatedValidSignatures.trace.some(({ kind }) => kind === "post"),
    false,
  );

  await clients.createTag(tuple, { attempt: 1 });
  assert.equal(state.tag, "exact");
  const exactTag = await clients.readTag(tuple, context);
  assert.equal(exactTag.tags.length, 1);
  assert.equal(exactTag.tags[0].targetSha, tuple.target.mergeSha);
  await clients.createRelease(tuple, { attempt: 1 });
  assert.equal(state.release, "exact");
  const exactRelease = await clients.readRelease(tuple, context);
  assert.equal(exactRelease.releases.length, 1);
  assert.equal(exactRelease.releases[0].tagTargetSha, tuple.target.mergeSha);

  const posts = trace.filter(({ kind }) => kind === "post");
  assert.equal(posts.length, 3);
  assert.match(posts[0].endpoint, /\/dispatches$/u);
  for (const [name, value] of Object.entries(
    derivePublicReleaseWorkflowInputs(tuple),
  )) {
    assert.ok(
      posts[0].args.includes(`inputs[${name}]=${value}`),
      `missing workflow input ${name}`,
    );
  }
  assert.match(posts[1].endpoint, /\/git\/refs$/u);
  assert.ok(posts[1].args.includes(`sha=${tuple.target.mergeSha}`));
  assert.match(posts[2].endpoint, /\/releases$/u);
  assert.ok(posts[2].args.includes(`target_commitish=${tuple.target.mergeSha}`));
  for (const read of trace.filter(
    ({ kind, command, args = [] }) =>
      kind === "command" &&
      command === "gh" &&
      args[args.indexOf("--method") + 1] === "GET",
  )) {
    assert.equal(read.args[read.args.indexOf("--hostname") + 1], "github.com");
    assert.ok(read.args.includes("Cache-Control: no-cache, no-store, max-age=0"));
    assert.ok(read.args.includes("Pragma: no-cache"));
    assert.match(read.args.at(-1), /kyw-public-read=/u);
  }
  const runQuery = trace
    .filter(
      ({ kind, args = [] }) =>
        kind === "command" && args[args.indexOf("--method") + 1] === "GET",
    )
    .map(({ args }) => args.at(-1))
    .find((endpoint) => endpoint.includes("/actions/workflows/77/runs?"));
  assert.match(runQuery, new RegExp(`head_sha=${tuple.target.mergeSha}`, "u"));
  assert.doesNotMatch(runQuery, /(?:^|[?&])branch=/u);
  assert.equal(
    trace.some(({ kind, url = "" }) =>
      kind === "fetch" && !url.startsWith("https://registry.npmjs.org/"),
    ),
    false,
  );
});

test("shared runner over production clients blocks stale npm dispatch and resumes later stages after main advances", async () => {
  const blockedNpm = await publicClientHarness();
  blockedNpm.state.remoteHeadSha = "a".repeat(40);
  const blocked = await runPublicRelease({
    standardDelivery: publicClientStandardFinal(blockedNpm.tuple),
    tuple: blockedNpm.tuple,
    clients: blockedNpm.clients,
    reconciliationReads: 1,
  });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.equal(blocked.blockingStage, "NPM");
  assert.equal(blockedNpm.trace.some(({ kind }) => kind === "post"), false);

  const invalidAggregate = await publicClientHarness();
  invalidAggregate.state.remoteHeadSha = "a".repeat(40);
  invalidAggregate.state.workflow = "success";
  invalidAggregate.state.npm = "exact";
  invalidAggregate.state.registrySignatureMode = "invalid-second";
  const blockedInvalidAggregate = await runPublicRelease({
    standardDelivery: publicClientStandardFinal(invalidAggregate.tuple),
    tuple: invalidAggregate.tuple,
    clients: invalidAggregate.clients,
    reconciliationReads: 1,
  });
  assert.equal(blockedInvalidAggregate.outcome, "BLOCKED");
  assert.equal(blockedInvalidAggregate.blockingStage, "NPM");
  assert.equal(
    invalidAggregate.trace.some(({ kind }) => kind === "post"),
    false,
  );

  const tagResume = await publicClientHarness();
  tagResume.state.remoteHeadSha = "a".repeat(40);
  tagResume.state.workflow = "success";
  tagResume.state.npm = "exact";
  tagResume.state.registrySignatureMode = "two-valid";
  const resumedFromTag = await runPublicRelease({
    standardDelivery: publicClientStandardFinal(tagResume.tuple),
    tuple: tagResume.tuple,
    clients: tagResume.clients,
    reconciliationReads: 1,
  });
  assert.equal(
    resumedFromTag.outcome,
    "COMPLETE",
    JSON.stringify(resumedFromTag),
  );
  assert.deepEqual(
    tagResume.trace
      .filter(({ kind }) => kind === "post")
      .map(({ endpoint }) => endpoint),
    [
      `repos/${tagResume.tuple.repository}/git/refs`,
      `repos/${tagResume.tuple.repository}/releases`,
    ],
  );

  const releaseResume = await publicClientHarness();
  releaseResume.state.remoteHeadSha = "a".repeat(40);
  releaseResume.state.workflow = "success";
  releaseResume.state.npm = "exact";
  releaseResume.state.tag = "exact";
  const resumedFromRelease = await runPublicRelease({
    standardDelivery: publicClientStandardFinal(releaseResume.tuple),
    tuple: releaseResume.tuple,
    clients: releaseResume.clients,
    reconciliationReads: 1,
  });
  assert.equal(resumedFromRelease.outcome, "COMPLETE");
  assert.deepEqual(
    releaseResume.trace
      .filter(({ kind }) => kind === "post")
      .map(({ endpoint }) => endpoint),
    [`repos/${releaseResume.tuple.repository}/releases`],
  );
});

test("production public clients fail closed on drift, partial pages, byte tamper, and malformed evidence", async () => {
  const harness = await publicClientHarness();
  const { clients, state, trace, tuple } = harness;
  const context = {
    fresh: true,
    cacheBypass: true,
    purpose: "FIXTURE_NEGATIVE",
    sequence: 9,
  };

  state.remoteHeadSha = "a".repeat(40);
  await assert.rejects(
    clients.dispatchPublishWorkflow(tuple, { attempt: 1 }),
    { code: "PUBLIC_RELEASE_PREWRITE_STATE_CHANGED" },
  );
  assert.equal(trace.some(({ kind }) => kind === "post"), false);

  state.remoteHeadSha = tuple.target.mergeSha;
  state.treeSha = "f".repeat(40);
  await assert.rejects(
    clients.readWorkflowRuns(tuple, context),
    /exact delivered source drifted/u,
  );
  state.treeSha = tuple.target.treeSha;
  state.remoteHeadSha = "a".repeat(40);
  state.compareStatus = "diverged";
  await assert.rejects(
    clients.readWorkflowRuns(tuple, context),
    /exact delivered source drifted/u,
  );
  state.remoteHeadSha = tuple.target.mergeSha;
  state.compareStatus = "ahead";
  state.runsIncomplete = true;
  assert.deepEqual(await clients.readWorkflowRuns(tuple, context), {
    runs: [],
    complete: false,
    baseHeadSha: tuple.target.mergeSha,
  });
  state.runsIncomplete = false;
  state.workflow = "success";
  state.jobsIncomplete = true;
  await assert.rejects(
    clients.readWorkflowRuns(tuple, context),
    /workflow job collection is incomplete/u,
  );
  state.jobsIncomplete = false;

  state.workflow = "active";
  state.workflowHeadSha = "f".repeat(40);
  const wrongHeadRun = await clients.readWorkflowRuns(tuple, context);
  assert.equal(wrongHeadRun.runs[0].headSha, "f".repeat(40));
  assert.equal(
    classifyPublicationWorkflow(tuple, wrongHeadRun).classification,
    "CONFLICT",
  );
  state.workflowHeadSha = undefined;
  const missingHeadRun = await clients.readWorkflowRuns(tuple, context);
  assert.equal(missingHeadRun.runs[0].headSha, undefined);
  assert.equal(
    classifyPublicationWorkflow(tuple, missingHeadRun).classification,
    "UNKNOWN",
  );
  state.workflow = "absent";
  state.workflowHeadSha = tuple.target.mergeSha;

  state.workflowId = String(tuple.publishWorkflow.id);
  await assert.rejects(
    clients.readWorkflowRuns(tuple, context),
    /workflow identity drifted/u,
  );
  state.workflowId = tuple.publishWorkflow.id;
  state.workflow = "active";
  state.runId = "501";
  await assert.rejects(
    clients.readWorkflowRuns(tuple, context),
    /malformed numeric identifier/u,
  );
  state.runId = 501;
  state.workflow = "success";
  state.jobId = "601";
  await assert.rejects(
    clients.readWorkflowRuns(tuple, context),
    /workflow job collection/u,
  );
  state.jobId = 601;
  state.workflow = "absent";

  state.tagPageFull = true;
  assert.deepEqual(await clients.readTag(tuple, context), {
    tags: [],
    complete: false,
  });
  state.tagPageFull = false;
  state.malformedTagEntry = true;
  assert.deepEqual(await clients.readTag(tuple, context), {
    tags: [],
    complete: false,
  });
  state.malformedTagEntry = false;
  state.tag = "nested";
  const nestedTag = await clients.readTag(tuple, context);
  assert.equal(nestedTag.tags[0].objectType, "tag");
  assert.equal(nestedTag.tags[0].peelComplete, false);
  assert.equal(classifyGitTag(tuple, nestedTag).classification, "CONFLICT");
  state.tag = "annotated";
  const annotatedTag = await clients.readTag(tuple, context);
  assert.equal(annotatedTag.tags[0].objectType, "tag");
  assert.equal(annotatedTag.tags[0].peelComplete, true);
  assert.equal(annotatedTag.tags[0].peeledSha, tuple.target.mergeSha);
  state.tag = "annotatedWrongName";
  const wrongEmbeddedTag = await clients.readTag(tuple, context);
  assert.equal(wrongEmbeddedTag.tags[0].peelComplete, false);
  assert.equal(
    classifyGitTag(tuple, wrongEmbeddedTag).classification,
    "CONFLICT",
  );
  state.tag = "annotatedMissingIdentity";
  const unreadableAnnotatedTag = await clients.readTag(tuple, context);
  assert.equal(unreadableAnnotatedTag.tags[0].peelComplete, undefined);
  assert.equal(
    classifyGitTag(tuple, unreadableAnnotatedTag).classification,
    "UNKNOWN",
  );
  state.tag = "namespace";
  const namespaceTag = await clients.readTag(tuple, context);
  assert.equal(namespaceTag.tags[0].namespaceCollision, true);
  state.tag = "absent";
  state.releasePageFull = true;
  assert.deepEqual(await clients.readRelease(tuple, context), {
    releases: [],
    complete: false,
  });
  state.releasePageFull = false;
  state.malformedReleaseByTag = true;
  assert.deepEqual(await clients.readRelease(tuple, context), {
    releases: [],
    complete: false,
  });
  state.malformedReleaseByTag = false;
  state.malformedReleaseListEntry = true;
  assert.deepEqual(await clients.readRelease(tuple, context), {
    releases: [],
    complete: false,
  });
  state.malformedReleaseListEntry = false;
  state.release = "exact";
  state.releaseId = "701";
  assert.deepEqual(await clients.readRelease(tuple, context), {
    releases: [],
    complete: false,
  });

  const tampered = await publicClientHarness();
  tampered.state.npm = "exact";
  tampered.state.tarballTampered = true;
  const exact = await tampered.clients.readNpmVersion(tampered.tuple, context);
  assert.equal(exact.tarball.rawBytesVerified, false);
  assert.deepEqual(exact.tarball.entries, []);
  assert.ok(tampered.trace.some(({ kind }) => kind === "fetch"));

  const wrongOrigin = await publicClientHarness();
  wrongOrigin.state.npm = "exact";
  wrongOrigin.state.tarballOrigin = "https://malicious.invalid";
  const requestsBeforeWrongOrigin = wrongOrigin.trace.filter(
    ({ kind }) => kind === "fetch",
  ).length;
  await assert.rejects(
    wrongOrigin.clients.readNpmVersion(wrongOrigin.tuple, context),
    /outside the exact canonical registry path/u,
  );
  assert.equal(
    wrongOrigin.trace.filter(({ kind }) => kind === "fetch").length,
    requestsBeforeWrongOrigin + 1,
  );

  const wrongPath = await publicClientHarness();
  wrongPath.state.npm = "exact";
  wrongPath.state.tarballPath = `/${wrongPath.tuple.package.name}/-/wrong-name.tgz`;
  await assert.rejects(
    wrongPath.clients.readNpmVersion(wrongPath.tuple, context),
    /outside the exact canonical registry path/u,
  );

  const inconsistentIndex = await publicClientHarness();
  inconsistentIndex.state.npm = "exact";
  inconsistentIndex.state.indexVersionConflict = true;
  await assert.rejects(
    inconsistentIndex.clients.readNpmVersion(inconsistentIndex.tuple, context),
    /do not expose one exact immutable target identity/u,
  );
  assert.equal(
    inconsistentIndex.trace.some(({ kind }) => kind === "post"),
    false,
  );

  const wrongAbsentIndex = await publicClientHarness();
  wrongAbsentIndex.state.indexName = "wrong-package";
  await assert.rejects(
    wrongAbsentIndex.clients.readNpmVersion(wrongAbsentIndex.tuple, context),
    /package index is malformed/u,
  );

  const malformedKeys = await publicClientHarness();
  malformedKeys.state.malformedSigningKey = true;
  await assert.rejects(
    malformedKeys.clients.readNpmVersion(malformedKeys.tuple, context),
    /unreadable key record/u,
  );

  const rotatedKeys = await publicClientHarness();
  rotatedKeys.state.extraActiveSigningKey = true;
  const rotatedAbsent = await rotatedKeys.clients.readNpmVersion(rotatedKeys.tuple, context);
  assert.equal(rotatedAbsent.absent, true);
  assert.equal(rotatedAbsent.signatureKeyId, rotatedKeys.tuple.package.signature.keyId);

  for (const signingKeyMaterial of ["noncanonical", "unsupported"]) {
    const invalidKey = await publicClientHarness();
    invalidKey.state.signingKeyMaterial = signingKeyMaterial;
    await assert.rejects(
      invalidKey.clients.readNpmVersion(invalidKey.tuple, context),
      /unreadable key record/u,
      signingKeyMaterial,
    );
  }

  for (const registrySignatureMode of [
    "empty",
    "mixed-key",
    "wrong-first",
    "wrong-message",
    "invalid-first",
    "invalid-second",
  ]) {
    const invalidSignatureSet = await publicClientHarness();
    invalidSignatureSet.state.npm = "exact";
    invalidSignatureSet.state.registrySignatureMode = registrySignatureMode;
    const invalidSignatureSnapshot =
      await invalidSignatureSet.clients.readNpmVersion(
        invalidSignatureSet.tuple,
        context,
      );
    assert.equal(
      invalidSignatureSnapshot.signature.verified,
      false,
      registrySignatureMode,
    );
    assert.equal(
      classifyNpmPublication(
        invalidSignatureSet.tuple,
        invalidSignatureSnapshot,
      ).classification,
      "CONFLICT",
      registrySignatureMode,
    );
    assert.equal(
      invalidSignatureSet.trace.some(({ kind }) => kind === "post"),
      false,
      registrySignatureMode,
    );
  }

  const divergentSignatureArrays = await publicClientHarness();
  divergentSignatureArrays.state.npm = "exact";
  divergentSignatureArrays.state.registrySignatureMode = "two-valid";
  divergentSignatureArrays.state.indexSignatureMode = "single";
  await assert.rejects(
    divergentSignatureArrays.clients.readNpmVersion(
      divergentSignatureArrays.tuple,
      context,
    ),
    /do not expose one exact immutable target identity/u,
  );
  assert.equal(
    divergentSignatureArrays.trace.some(({ kind }) => kind === "post"),
    false,
  );

  const malformedImmutableSignature = await publicClientHarness();
  malformedImmutableSignature.state.npm = "exact";
  malformedImmutableSignature.state.registrySignatureSuffix = "!!";
  const malformedSignatureSnapshot =
    await malformedImmutableSignature.clients.readNpmVersion(
      malformedImmutableSignature.tuple,
      context,
    );
  assert.equal(malformedSignatureSnapshot.signature.verified, false);
  assert.equal(
    classifyNpmPublication(
      malformedImmutableSignature.tuple,
      malformedSignatureSnapshot,
    ).classification,
    "CONFLICT",
  );

  const releaseWithoutAssets = await publicClientHarness();
  releaseWithoutAssets.state.tag = "exact";
  releaseWithoutAssets.state.release = "exact";
  releaseWithoutAssets.state.releaseAssetsMissing = true;
  const unreadableAssetPolicy = await releaseWithoutAssets.clients.readRelease(
    releaseWithoutAssets.tuple,
    context,
  );
  assert.equal(unreadableAssetPolicy.releases[0].assets, undefined);
  assert.equal(
    classifyGitHubRelease(
      releaseWithoutAssets.tuple,
      unreadableAssetPolicy,
    ).classification,
    "UNKNOWN",
  );

  const divergentRelease = await publicClientHarness();
  divergentRelease.state.tag = "exact";
  divergentRelease.state.release = "exact";
  divergentRelease.state.releaseByTagConflict = true;
  const divergentEndpoints = await divergentRelease.clients.readRelease(
    divergentRelease.tuple,
    context,
  );
  assert.equal(divergentEndpoints.releases.length, 2);
  assert.equal(
    classifyGitHubRelease(
      divergentRelease.tuple,
      divergentEndpoints,
    ).classification,
    "CONFLICT",
  );

  const privateArtifact = await publicClientHarness();
  privateArtifact.state.npm = "exact";
  privateArtifact.expectedTarball.archiveBytes.fill(0);
  privateArtifact.expectedTarball.entries.push("mutated-after-construction");
  const privatelyFrozen = await privateArtifact.clients.readNpmVersion(
    privateArtifact.tuple,
    context,
  );
  assert.equal(privatelyFrozen.tarball.rawBytesVerified, true);
  assert.deepEqual(
    privatelyFrozen.tarball.entries,
    privateArtifact.tuple.package.tarball.entries,
  );

  const unavailableVerifier = await publicClientHarness();
  unavailableVerifier.state.npm = "exact";
  unavailableVerifier.state.provenanceThrows = true;
  const unavailable = await unavailableVerifier.clients.readNpmVersion(
    unavailableVerifier.tuple,
    context,
  );
  assert.equal(unavailable.provenance.verified, undefined);

  const mismatchedProvenance = await publicClientHarness();
  mismatchedProvenance.state.npm = "exact";
  mismatchedProvenance.state.provenanceValid = false;
  const mismatch = await mismatchedProvenance.clients.readNpmVersion(
    mismatchedProvenance.tuple,
    context,
  );
  assert.equal(mismatch.provenance.verified, false);

  const ambiguousProvenance = await publicClientHarness();
  ambiguousProvenance.state.npm = "exact";
  ambiguousProvenance.state.malformedProvenance = true;
  const ambiguous = await ambiguousProvenance.clients.readNpmVersion(
    ambiguousProvenance.tuple,
    context,
  );
  assert.equal(ambiguous.provenance.verified, undefined);

  const untypedProvenance = await publicClientHarness();
  untypedProvenance.state.npm = "exact";
  untypedProvenance.state.malformedUntypedAttestation = true;
  const untyped = await untypedProvenance.clients.readNpmVersion(
    untypedProvenance.tuple,
    context,
  );
  assert.equal(untyped.provenance.verified, undefined);

  const duplicateProvenance = await publicClientHarness();
  duplicateProvenance.state.npm = "exact";
  duplicateProvenance.state.duplicateProvenance = true;
  const duplicate = await duplicateProvenance.clients.readNpmVersion(
    duplicateProvenance.tuple,
    context,
  );
  assert.equal(duplicate.provenance.verified, false);

  for (const [field, value] of [
    ["provenancePayloadType", "application/vnd.attacker+json"],
    ["signedStatementType", "https://attacker.invalid/Statement/v1"],
    ["signedPredicateType", "https://attacker.invalid/provenance/v1"],
    ["duplicateProvenanceSubject", true],
  ]) {
    const hostileStatement = await publicClientHarness();
    hostileStatement.state.npm = "exact";
    hostileStatement.state[field] = value;
    const hostileSnapshot = await hostileStatement.clients.readNpmVersion(
      hostileStatement.tuple,
      context,
    );
    assert.equal(hostileSnapshot.provenance.verified, false, field);
  }

  const missingPayloadType = await publicClientHarness();
  missingPayloadType.state.npm = "exact";
  missingPayloadType.state.provenancePayloadType = undefined;
  const missingPayloadTypeSnapshot =
    await missingPayloadType.clients.readNpmVersion(
      missingPayloadType.tuple,
      context,
    );
  assert.equal(missingPayloadTypeSnapshot.provenance.verified, undefined);

  for (const field of [
    "provenancePayloadSuffix",
    "provenanceSignatureSuffix",
  ]) {
    const malformedDsse = await publicClientHarness();
    malformedDsse.state.npm = "exact";
    malformedDsse.state[field] = "!!";
    const malformedDsseSnapshot = await malformedDsse.clients.readNpmVersion(
      malformedDsse.tuple,
      context,
    );
    assert.equal(malformedDsseSnapshot.provenance.verified, undefined, field);
  }

  for (const dependencyField of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "bundledDependencies",
    "bundleDependencies",
    "peerDependencies",
  ]) {
    const dependency = await publicClientHarness();
    dependency.state.dependencyField = dependencyField;
    await assert.rejects(
      dependency.clients.readWorkflowRuns(dependency.tuple, context),
      /dependencies or lifecycle scripts violate/u,
      dependencyField,
    );
    assert.equal(
      dependency.trace.some(({ kind }) => kind === "post"),
      false,
      dependencyField,
    );
  }

  for (const publishConfigExtra of ["tag", "provenance", "extra"]) {
    const publishConfig = await publicClientHarness();
    publishConfig.state.publishConfigExtra = publishConfigExtra;
    await assert.rejects(
      publishConfig.clients.readWorkflowRuns(publishConfig.tuple, context),
      /repository\/access\/registry identity is not the expected public tuple/u,
      publishConfigExtra,
    );
    assert.equal(
      publishConfig.trace.some(({ kind }) => kind === "post"),
      false,
      publishConfigExtra,
    );
  }

  const sanitized = redactPublicReleaseDiagnostics(
    new Error(
      "Bearer ghp_abcdefghijklmnopqrstuvwxyz012345 token=npm_secret_abcdefghijklmnopqrstuvwxyz https://user:password@example.invalid/x",
    ),
  );
  assert.doesNotMatch(JSON.stringify(sanitized), /ghp_|npm_secret_|password/u);
});

test("production provenance discovery ignores hostile npm_execpath", async (t) => {
  const originalNpmExecPath = process.env.npm_execpath;
  process.env.npm_execpath = path.join(
    REPOSITORY_ROOT,
    "attacker-controlled",
    "npm-cli.js",
  );
  t.after(() => {
    if (originalNpmExecPath === undefined) delete process.env.npm_execpath;
    else process.env.npm_execpath = originalNpmExecPath;
  });
  const requestedModules = [];
  const harness = await publicClientHarness({
    useDefaultProvenanceVerifier: true,
    provenanceModuleLoader: (modulePath) => {
      requestedModules.push(modulePath);
      throw new Error("fixture module unavailable");
    },
  });
  harness.state.npm = "exact";
  const snapshot = await harness.clients.readNpmVersion(harness.tuple, {
    fresh: true,
    cacheBypass: true,
    purpose: "FIXTURE_PROVENANCE_DISCOVERY",
    sequence: 1,
  });
  assert.equal(snapshot.provenance.verified, undefined);
  assert.equal(requestedModules.length, 3);
  assert.equal(
    requestedModules.some((modulePath) =>
      modulePath.includes("attacker-controlled"),
    ),
    false,
  );
  assert.equal(
    requestedModules.every((modulePath) =>
      path.isAbsolute(modulePath),
    ),
    true,
  );
});

test("production public signature verification accepts distinct trusted keys and preserves historical tuples", async () => {
  const context = { fresh: true, cacheBypass: true, purpose: "FIXTURE_KEYS", sequence: 1 };
  const harness = await publicClientHarness({ multipleSigningKeys: true });
  harness.state.npm = "exact";
  harness.state.workflow = "success";
  harness.state.registrySignatureMode = "two-keys";
  const snapshot = await harness.clients.readNpmVersion(harness.tuple, context);
  assert.equal(snapshot.signature.verified, true);
  assert.deepEqual(snapshot.signature.keyIds, ["SHA256:fixture", "SHA256:rotated"]);
  assert.equal(classifyNpmPublication(harness.tuple, snapshot).classification, "EXACT_ALREADY_COMPLETE");
  const canonicalRuns = await harness.clients.readWorkflowRuns(harness.tuple, context);
  assert.equal(canonicalRuns.runs[0].inputs.expectedSigningKeyIds, '["SHA256:fixture","SHA256:rotated"]');
  const provisional = structuredClone(harness.tuple);
  provisional.package.signature = { required: true, keyId: "SHA256:rotated", keyIds: ["SHA256:rotated"] };
  assert.deepEqual(recoverPublicReleaseSigningTuple(provisional, canonicalRuns), harness.tuple);
  for (const mode of ["bad-rotated", "mixed-key", "invalid-second", "wrong-message"]) {
    harness.state.registrySignatureMode = mode;
    const invalid = await harness.clients.readNpmVersion(harness.tuple, context);
    assert.equal(invalid.signature.verified, false, mode);
    assert.equal(classifyNpmPublication(harness.tuple, invalid).classification, "CONFLICT", mode);
  }
  const historical = await publicClientHarness();
  historical.state.extraActiveSigningKey = true;
  historical.state.npm = "exact";
  historical.state.registrySignatureMode = "two-keys";
  const historicalSnapshot = await historical.clients.readNpmVersion(historical.tuple, context);
  assert.equal(historicalSnapshot.signature.verified, false, "historical tuple cannot silently adopt another key");
  assert.equal(historical.tuple.package.signature.keyId, "SHA256:fixture");
  assert.equal(historical.tuple.package.signature.keyIds, undefined);
  assert.equal(harness.trace.some(({ kind }) => kind === "post"), false);
});

test("production publication reads prove all prior attempts skipped before accepting rerun or redispatch", async () => {
  const context = { fresh: true, cacheBypass: true, purpose: "FIXTURE_ATTEMPTS", sequence: 1 };
  const harness = await publicClientHarness();
  harness.state.workflow = "success";
  harness.state.npm = "exact";
  harness.state.runAttempt = 3;
  const workflow = await harness.clients.readWorkflowRuns(harness.tuple, context);
  assert.deepEqual(workflow.runs[0].priorAttempts, [
    { attempt: 1, publishBoundary: "NOT_EXECUTED" }, { attempt: 2, publishBoundary: "NOT_EXECUTED" },
  ]);
  assert.equal(classifyPublicationWorkflow(harness.tuple, workflow).classification, "EXACT_ALREADY_COMPLETE");
  const npm = await harness.clients.readNpmVersion(harness.tuple, context);
  assert.equal(npm.provenance.runAttempt, 3);
  assert.equal(npm.provenance.verified, true);
  for (const conclusion of ["success", "failure", "cancelled"]) {
    harness.state.priorPublishConclusions[1] = conclusion;
    const unsafe = await harness.clients.readWorkflowRuns(harness.tuple, context);
    assert.equal(classifyPublicationWorkflow(harness.tuple, unsafe).classification, "CONFLICT", conclusion);
  }
  harness.state.priorPublishConclusions = {};
  harness.state.workflow = "failed";
  harness.state.npm = "absent";
  harness.state.latestPublishConclusion = "skipped";
  const safe = await harness.clients.readWorkflowRuns(harness.tuple, context);
  assert.equal(safe.runs[0].publishBoundary, "NOT_EXECUTED");
  assert.equal(classifyPublicationWorkflow(harness.tuple, safe).classification, "ABSENT");
  harness.state.jobRunId = 999;
  await assert.rejects(harness.clients.readWorkflowRuns(harness.tuple, context), /identity/);
  assert.equal(harness.trace.some(({ kind }) => kind === "post"), false);
});

test("production public read retries are bounded and do not retry authentication or invalid data", async () => {
  const identity = { name: "kyw-dev", registry: "https://registry.npmjs.org/" };
  const context = { fresh: true, cacheBypass: true, purpose: "FIXTURE_RETRY", sequence: 1 };
  for (const status of [401, 403, 422]) {
    let calls = 0;
    const clients = createPublicReleaseClients({ repositoryRoot: REPOSITORY_ROOT,
      fetchImpl: async () => { calls += 1; return new Response("denied", { status }); } });
    await assert.rejects(clients.readPackageIndex(identity, context), /canonical read returned status/);
    assert.equal(calls, 1, String(status));
  }
  let calls = 0;
  const eventual = createPublicReleaseClients({ repositoryRoot: REPOSITORY_ROOT,
    fetchImpl: async () => {
      calls += 1;
      return calls < 3 ? new Response("transient", { status: 503 }) : Response.json({ name: "kyw-dev", versions: {} });
    } });
  assert.deepEqual(await eventual.readPackageIndex(identity, context), { name: "kyw-dev", versions: {} });
  assert.equal(calls, 3);
  calls = 0;
  const exhausted = createPublicReleaseClients({ repositoryRoot: REPOSITORY_ROOT,
    fetchImpl: async () => { calls += 1; return new Response("transient", { status: 503 }); } });
  await assert.rejects(exhausted.readPackageIndex(identity, context), /canonical read returned status/);
  assert.equal(calls, 3);
  calls = 0;
  const malformed = createPublicReleaseClients({ repositoryRoot: REPOSITORY_ROOT,
    fetchImpl: async () => { calls += 1; return new Response("not JSON"); } });
  await assert.rejects(malformed.readPackageIndex(identity, context));
  assert.equal(calls, 1);
});

test("production public registry reads enforce the byte bound while streaming chunked bodies", async () => {
  const chunk = new Uint8Array(1024 * 1024);
  let reads = 0;
  let cancellations = 0;
  let arrayBufferCalls = 0;
  const clients = createPublicReleaseClients({
    repositoryRoot: REPOSITORY_ROOT,
    fetchImpl: async () => ({
      status: 200,
      ok: true,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => {
            reads += 1;
            return { done: false, value: chunk };
          },
          cancel: async () => {
            cancellations += 1;
          },
          releaseLock: () => {},
        }),
      },
      arrayBuffer: async () => {
        arrayBufferCalls += 1;
        throw new Error("unbounded arrayBuffer path must not run");
      },
    }),
  });
  await assert.rejects(
    clients.readPackageIndex(
      { name: "kyw-dev", registry: "https://registry.npmjs.org/" },
      { fresh: true, cacheBypass: true, purpose: "FIXTURE_STREAM", sequence: 1 },
    ),
    { code: "PUBLIC_RELEASE_RESPONSE_BOUND_EXCEEDED" },
  );
  assert.equal(reads, 9);
  assert.equal(cancellations, 1);
  assert.equal(arrayBufferCalls, 0);
});
