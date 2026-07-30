# TEST 0066 — Publish and Prove kyw-dev 0.1.2 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`
- Hard dependency: the delivered `0.1.2` preparation Task named in `TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and public-release truth: `../../../README.md`
- Trusted workflow: `../../../.github/workflows/publish.yml`
- Release/package owners: `../../../package.json`, `../../../.codex-plugin/plugin.json`, `../../../scripts/packed-release-check.mjs`
- Official npm Trusted Publishing requirements: `https://docs.npmjs.com/trusted-publishers/`
- Official npm provenance and verification requirements: `https://docs.npmjs.com/generating-provenance-statements/`
- Official GitHub manual-workflow requirements: `https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Main/dependency/workflow/publisher/package/registry preflight is exact. | Validate dependency delivery and hashes; compare local/direct/GitHub main, workflow and package bytes, authenticated publisher tuple, owner/maintainer state, versions/latest, and expected absence. | External/integrity | TODO | Planned; irreversible-action preflight has not run. |
| T-02 | AC-02 — Exactly one authorized dispatch and no alternate mutation occurs. | Retain the single command/request receipt, search run inventory and shell history/evidence, count dispatch/publish paths, and inspect excluded commands/surfaces. | Authority/security | TODO | Planned; no dispatch or publication has occurred. |
| T-03 | AC-03 — Exact workflow run/attempt/SHA and candidate evidence succeeds. | Fetch run, jobs, attempt, event, branch, head SHA, conclusions, and bounded logs; parse exact checkout/runtime/candidate/absence/publish evidence and compare to expected identities. | GitHub end-to-end | TODO | Planned; no workflow run exists. |
| T-04 | AC-04 — Registry publisher and source identity proves GitHub OIDC. | Read canonical version metadata and assert name/version, gitHead, repository, maintainer, `_npmUser`, trusted-publisher marker, signatures, and absence of a human/token publisher identity. | Registry identity | TODO | Planned; `0.1.2` metadata does not exist. |
| T-05 | AC-05 — Published bytes and observable package behavior match exactly. | Download the tarball fresh; compare SHA-1/SHA-256/SHA-512, sizes and inventory; inspect manifests/README/legal/safety; run isolated CLI smoke. | Distribution/end-to-end | TODO | Planned; no published tarball exists. |
| T-06 | AC-06 — Dist-tags/history and excluded release surfaces are correct. | Query complete version/dist-tag/deprecation state and inspect local/remote tags, GitHub Releases, submission artifacts, and command evidence. | Registry/scope | TODO | Planned; current `latest` remains `0.1.1`. |
| T-07 | AC-07 — Signatures and SLSA provenance bind the exact package, workflow, and run. | Run current npm signature verification, fetch the attestation URL, verify required bundles/signatures, decode DSSE payload, and compare subject digest, repo/path/ref/commit/builder/event/invocation. | Cryptographic provenance | TODO | Planned; no attestation exists. |
| T-08 | AC-08 — Failure, ambiguity, propagation, and idempotent-resume behavior is fail closed. | Preserve any observed failure; exercise deterministic fixtures and resolve external state read-only under each branch; prove no second dispatch/rerun/publish. | Failure/recovery | TODO | Planned; no external result or failure has been observed. |
| T-09 | AC-09 — Post-publication README/SPEC and document deltas are truthful. | Compare registry/provenance facts to README/SPEC, reject stale candidate/prepublication text, run owner projections, and validate exact four-document retained-baseline deltas. | Documentation/policy | TODO | Planned; documents still describe pre-publication state. |
| T-10 | AC-10 — Focused/stable verification, scope, immutability, transaction, and delivery gates close. | Run focused and stable commands; map final diff; hash predecessors; validate pair/queue/transaction; retain exact-head PR/main delivery as separate evidence. | Regression/delivery | TODO | Planned; no final verification or delivery exists. |

## Regression Coverage

- Workflow remains byte-identical, manual-only, main/SHA/version gated, tokenless, one-shot, and non-retrying.
- Package allowlist, package/plugin parity, CLI output, README, licensing, no dependencies/lockfile/lifecycle, and isolated installation remain unchanged from the delivered candidate.
- Public `0.1.0` and `0.1.1` remain available and historical evidence remains intentional.
- Registry signature and provenance verification distinguish cryptographic source identity from behavioral acceptance.
- Publication failure, ambiguous dispatch, delayed metadata/attestation, occupied-version, immutable mismatch, and exact authorized-resume branches never cause an automatic retry.
- `ci.yml`, Task queue, rolling continuity, terminal-pair immutability, permanent-document ownership, and future publication authority remain intact.
- No tag, GitHub Release, public plugin submission, owner/security setting, token, or independent dist-tag surface changes.

## Commands

- Planned dependency/main proof: exact pair validation and hashes, `git rev-parse HEAD main origin/main`, direct `git ls-remote origin refs/heads/main`, GitHub repository/default-branch reads, and evaluator-complete dependency delivery inspection.
- Planned publisher/registry preflight: `npm trust list kyw-dev --json --registry=https://registry.npmjs.org/`, `npm owner ls kyw-dev`, `npm view kyw-dev versions dist-tags maintainers --json --registry=https://registry.npmjs.org/`, and expected `E404` for `kyw-dev@0.1.2`.
- Planned workflow proof: `gh workflow view publish.yml --repo kimyeongwoo/kyw-dev --yaml` plus exact local/dependency-main byte hash and static guard validation.
- Planned sole mutation: `gh workflow run publish.yml --repo kimyeongwoo/kyw-dev --ref main -f expected_sha=<exact-delivered-preparation-merge-sha> -f version=0.1.2`.
- Planned run resolution: bounded `gh run list --repo kimyeongwoo/kyw-dev --workflow publish.yml --event workflow_dispatch --commit <exact-delivered-preparation-merge-sha> --json databaseId,event,headBranch,headSha,status,conclusion,attempt,createdAt,updatedAt`, followed by read-only `gh run view <run-id>` job/log inspection. No `gh run rerun` command is permitted.
- Planned registry metadata: `npm view kyw-dev@0.1.2 version dist.integrity dist.shasum dist.tarball dist.fileCount dist.unpackedSize dist.signatures dist.attestations repository gitHead maintainers --json --registry=https://registry.npmjs.org/` and raw canonical version JSON for `_npmUser`.
- Planned dist-tag/history proof: `npm view kyw-dev versions dist-tags --json --registry=https://registry.npmjs.org/`; no `npm dist-tag` mutation command.
- Planned public-byte proof: download the exact `dist.tarball` into a fresh owned temporary directory, compute SHA-1/SHA-256/SHA-512, inspect archive entries/content, and compare every field with the workflow candidate evidence.
- Planned public CLI smoke: `npm exec --yes --package=kyw-dev@0.1.2 -- kyw-dev --version` with a fresh owned cache/userconfig, canonical registry, isolated working directory, and disabled lifecycle scripts.
- Planned attestation proof: fetch the exact `dist.attestations.url`, verify expected publish and `https://slsa.dev/provenance/v1` bundles, decode the DSSE payload, and compare subject/repository/workflow/ref/commit/builder/event/invocation identities.
- Planned signature proof: install exact `kyw-dev@0.1.2` without lifecycle scripts in fresh owned state and run current `npm audit signatures`, recording verified registry signatures and attestations.
- Planned excluded-surface proof: read-only local/remote Git tag, GitHub Release, deprecation/unpublish, public-submission, workflow-attempt, and command-scope inspection.
- Planned focused verification: run registry/provenance parsing tests plus `node --test test/publish-workflow.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/release-evidence-harness.test.mjs`.
- Planned stable checks: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned Task validation: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this-task-directory>`.
- Planned transaction/final proof: `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`, `git status --short`, `git diff --check`, full diff/matrix mapping, predecessor hashes, and exact permanent-document delta validation.
- Planned delivery proof: complete non-draft PR actual-head checks, synthetic merge, expected-head merge, post-main exact-SHA CI, and evaluator evidence after repository acceptance; do not dispatch or publish again.

## Results

- Not applicable — verification has not run.

## Unverified

- The dependency merge SHA, current publisher tuple, and irreversible-action preflight have not been resolved for execution.
- No workflow dispatch/run/job/log, registry `0.1.2`, `latest` transition, published tarball, OIDC publisher identity, signature result, or provenance attestation exists.
- Failure/ambiguity/propagation handling has only planned coverage and no observed external result.
- README/SPEC synchronization, permanent-document deltas, focused/stable results, final diff, predecessor hashes, and Task validation remain unexecuted.
- The post-publication non-draft PR, exact-head CI, merge, post-main run, and evaluator result required by `STANDARD` do not exist.

## Final Coverage Review

- [ ] Compare the external workflow/registry/attestation facts and final repository diff to every matrix row.
- [ ] Map every acceptance criterion to exact executed evidence.
- [ ] Prove one dispatch, one run attempt, one workflow-contained publish, and zero direct/retry/rerun/alternate mutations.
- [ ] Verify registry identity, bytes, dist-tags/history, signatures, and every provenance field against the exact dependency SHA and workflow run.
- [ ] Cover failure, ambiguity, propagation delay, existing exact run, and immutable mismatch branches without automatic retry.
- [ ] Confirm documents, focused/stable checks, immutable predecessors, transaction cleanliness, excluded surfaces, and `STANDARD` delivery are auditable.
