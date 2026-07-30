# TEST 0066 — Publish and Prove kyw-dev 0.1.2 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

BLOCKED

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
| T-01 | AC-01 — Main/dependency/workflow/publisher/package/registry preflight is exact. | Validate dependency delivery and hashes; compare local/direct/GitHub main, workflow and package bytes, authenticated publisher tuple, owner/maintainer state, versions/latest, and expected absence. | External/integrity | PASS | Final immediate snapshot passed at `2026-07-30T09:20:36.5659458Z` with exact main/workflow/candidate/publisher/owner/access/history/latest/absence and zero prior publish runs. |
| T-02 | AC-02 — Exactly one authorized dispatch and no alternate mutation occurs. | Retain the single command/request receipt, search run inventory and shell history/evidence, count dispatch/publish paths, and inspect excluded commands/surfaces. | Authority/security | PASS | Final inventory has exactly one dispatch/run/attempt/job and one workflow-contained publish; no direct/retry/rerun/token/OTP/fallback/dist-tag/tag/Release path occurred. |
| T-03 | AC-03 — Exact workflow run/attempt/SHA and candidate evidence succeeds. | Fetch run, jobs, attempt, event, branch, head SHA, conclusions, and bounded logs; parse exact checkout/runtime/candidate/absence/publish evidence and compare to expected identities. | GitHub end-to-end | PASS | Run `30530304990`, attempt `1`, and sole job `90830809454` succeeded on the exact dependency SHA with all expected guards, candidate evidence, one publish result, and cleanup. |
| T-04 | AC-04 — Registry publisher and source identity proves GitHub OIDC. | Read canonical version metadata and assert name/version, gitHead, repository, maintainer, `_npmUser`, trusted-publisher marker, signatures, and absence of a human/token publisher identity. | Registry identity | BLOCKED | OIDC publisher, repository, maintainer, signature, and trusted-publisher marker match, but cache-bypassed canonical metadata omits required `gitHead`. |
| T-05 | AC-05 — Published bytes and observable package behavior match exactly. | Download the tarball fresh; compare SHA-1/SHA-256/SHA-512, sizes and inventory; inspect manifests/README/legal/safety; run isolated CLI smoke. | Distribution/end-to-end | PASS | Fresh public bytes exactly match the 128,987-byte/43-file workflow candidate and all manifest/legal/safety checks; isolated CLI output is exactly `0.1.2`. |
| T-06 | AC-06 — Dist-tags/history and excluded release surfaces are correct. | Query complete version/dist-tag/deprecation state and inspect local/remote tags, GitHub Releases, submission artifacts, and command evidence. | Registry/scope | PASS | Final registry has `0.1.0`–`0.1.2`, only `latest=0.1.2`, no deprecation, and no independent dist-tag/unpublish; local/remote tags, Releases, and public submission remain absent. |
| T-07 | AC-07 — Signatures and SLSA provenance bind the exact package, workflow, and run. | Run current npm signature verification, fetch the attestation URL, verify required bundles/signatures, decode DSSE payload, and compare subject digest, repo/path/ref/commit/builder/event/invocation. | Cryptographic provenance | PASS | npm `12.0.2` under verified official Node `24.18.0` reports zero invalid/missing signatures; both DSSE bundles bind the exact package digest, repo/workflow/ref/commit/event/builder/run. |
| T-08 | AC-08 — Failure, ambiguity, propagation, and idempotent-resume behavior is fail closed. | Preserve any observed failure; exercise deterministic fixtures and resolve external state read-only under each branch; prove no second dispatch/rerun/publish. | Failure/recovery | PASS | Deterministic one-shot/failure fixtures pass, and the observed immutable missing-`gitHead` mismatch blocks after read-only resolution with no second mutation. |
| T-09 | AC-09 — Post-publication README/SPEC and document deltas are truthful. | Compare registry/provenance facts to README/SPEC, reject stale candidate/prepublication text, run owner projections, and validate exact four-document retained-baseline deltas. | Documentation/policy | PASS | README/SPEC and projections state public `0.1.2`, `latest`, OIDC/SLSA, missing `gitHead`, and separate authority; exact four-document deltas validate. |
| T-10 | AC-10 — Focused/stable verification, scope, immutability, transaction, and delivery gates close. | Run focused and stable commands; map final diff; hash predecessors; validate pair/queue/transaction; retain exact-head PR/main delivery as separate evidence. | Regression/delivery | BLOCKED | Focused/stable/scope/130-file immutability/transaction/pair gates pass, but unmet AC-04 prevents terminal PASS and the required `STANDARD` delivery. |

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
- Planned sole mutation: `gh workflow run publish.yml --repo kimyeongwoo/kyw-dev --ref main -f expected_sha=<exact-delivered-preparation-merge-sha> -f expected_version=0.1.2`.
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
- Executed selected/dependency pair validation, transaction inspection, clean status, local/direct/GitHub `main` alignment, and the sole packaged dispatcher call for `$kyw-impl 0066`.
- Created `task/0066-publish-and-prove-kyw-dev-0-1-2-through-npm-oidc` from exact aligned `main` and entered `IN_PROGRESS/RUNNING`.
- Executed `apply-continuity` exactly once for Task `0065`; the bounded checkpoint advanced through Task `0065`.
- Executed targeted permanent-document reads; exact local/cached/direct/GitHub main and workflow-blob comparison; workflow registration/run-history reads; package/plugin/candidate/input-drift inspection; npm identity/owner/access reads; cache-bypassed canonical registry history/latest/absence reads; and local/remote tag/GitHub Release inspection.
- Executed non-interactive `npm trust list`; it returned `EOTP` before settings and created one diagnostic that could contain an ephemeral authentication URL. Cleared exactly that Task-created log to zero bytes and opened the authenticated package settings surface read-only; security-key reauthentication remains pending.
- Executed a read-only `npm-production` GitHub environment metadata probe; it returned HTTP `404` without changing settings.
- Executed the first focused preflight command; it passed 55/55 tests.
- Read current official npm Trusted Publishing/provenance/signature-verification requirements and GitHub manual-dispatch requirements; queried the canonical npm registry for the current CLI release and found `latest=12.0.2`.
- Executed blocked-checkpoint pair validation, transaction inspection, `git diff --check`, publish-workflow run recount, cache-bypassed `0.1.2` absence read, Task-created npm-log size check, and scoped status inspection.
- Resumed the authenticated npm package settings surface after user security-key reauthentication, opened the existing trusted-publisher edit form read-only, verified every tuple/action/access/maintainer field, and cancelled without saving.
- Executed one atomic immediate-preflight script covering pair/status/main/workflow/candidate/publisher/owner/access/registry/history/tags/Releases/run count, followed by exactly one `gh workflow run publish.yml --repo kimyeongwoo/kyw-dev --ref main -f expected_sha=60b3270e679bb9794de8c1fd40be3286cfd73dda -f expected_version=0.1.2`.
- Executed read-only run resolution for returned run `30530304990` and a matching-run inventory; it is the sole run for the exact workflow/event/SHA and attempt.
- Polled only run `30530304990` to its successful terminal result; fetched its one-job graph and bounded 1,009-line log, retaining only sanitized exact evidence records and aggregate Stable-gate results.
- Queried cache-bypassed canonical package/root metadata, versions/dist-tags/deprecation, maintainer/repository, `_npmUser`, trusted-publisher marker, registry signatures, integrity fields, and attestation URL.
- Downloaded the exact public tarball into fresh owned state; computed SHA-1/SHA-256/SHA-512, compared the 43-entry archive allowlist and package content to the workflow/source candidate, and ran isolated fresh-cache/userconfig exact-version CLI smoke.
- Fetched the public attestation endpoint, decoded both DSSE statements, and asserted exact publish/SLSA predicates, package subject/digest, repository/workflow/ref/commit/event/builder/invocation, signature, and transparency-log counts.
- Ran current npm `12.0.2` signature verification under local Node `24.11.0`; it exited zero with no invalid/missing signatures but emitted unsupported-engine warnings. Attempted a lifecycle-disabled `node@24.18.0` npm package install, which did not provide a runnable binary.
- Downloaded official Node.js `24.18.0` for Windows and its official SHASUMS256, verified archive SHA-256 `0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821`, and reran npm `12.0.2` signature verification successfully without the engine limitation.
- Inspected local npm CLI publication source to distinguish directory-package preparation from tarball-manifest publication, then rechecked version/root metadata and `npm view ... gitHead` cache-bypassed; all omit `gitHead`.
- Removed the exact owned public-byte and signature-verification temporary roots after inventory and reparse-point checks. One computed cleanup form was rejected by local command policy before execution; the direct literal PowerShell cleanup succeeded with no residue.
- Synchronized README/SPEC public release, `latest`, trusted-publisher/provenance, missing-`gitHead`, command-version, and separate-authority truth; updated deterministic instruction-surface projections.
- Executed the first post-document focused suite; 51/55 passed. Four expected foundation cascades identified the not-yet-recorded current document-delta table and one disallowed full Git SHA in SPEC.
- Reran the focused command after the evidence/SPEC corrections; all 55/55 tests passed.
- Executed `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`; all exited zero.
- Executed exact changed-path verification planning; it selected `STABLE`, classed the retained non-Task changes as runtime, and required the four local stable leaves plus separate hosted exact-SHA CI.
- Executed a final cache-bypassed registry/GitHub/tag/Release snapshot at `2026-07-30T09:42:24.5621880Z`, followed by all-earlier-pair blob comparison, predecessor blob reporting, transaction inspection, pair validation, `git diff --check`, and final scope/stat inspection.
- The first read-only immutability aggregation script failed at PowerShell parse time because a colon immediately followed an interpolated variable; it executed no reads or mutations. The corrected format-operator form then completed.

## Results

- PASS — the selected and dependency pairs validate, Task transaction inspection reports `NONE / NO_TRANSACTION_EVIDENCE`, the tracked worktree was clean, and the dispatcher proved local/cached/direct/GitHub `main` align at `60b3270e679bb9794de8c1fd40be3286cfd73dda`.
- PASS — the sole packaged dispatcher call selected Task `0066` for `IMPLEMENT`, classified Tasks `0030`–`0064` as `DURABLE_STANDARD_CONTINUITY`, freshly evaluated Task `0065` as `HARDENED_EXACT_HEAD`, and prepared one opaque transition without retry or manual delivery input.
- PASS — the transition applied exactly once on the selected branch and advanced the checkpoint through Task `0065` at digest `55834a385fa8cc32d3c61dc5f4f645b6b5d81989b6eff1d11960758e974e3717`.
- PASS — local/cached/direct/GitHub `main` equal dependency merge `60b3270e679bb9794de8c1fd40be3286cfd73dda`; local/main/GitHub workflow blobs equal `74c393fa6e342b7cd1db2ef99489d6e7cc465533`; active workflow ID `323508270` has zero runs.
- PASS — the dry-run projection matches Task `0065` at 43 files, 128,987 packed bytes, 586,333 unpacked bytes, integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==`, and shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`; packed-input drift and workflow drift from the dependency SHA are both zero.
- PASS — authenticated npm identity/ownership/access is `kimyw` / owner / public. Canonical registry reads list `0.1.0,0.1.1`, `latest=0.1.1`, no deprecation, and HTTP `404` for `0.1.2`; local/remote tags and GitHub Releases are empty.
- BLOCKED — `npm trust list` returned `EOTP` without the trusted-publisher tuple. Its Task-created diagnostic was cleared to zero bytes; the existing Chrome settings tab still requires security-key reauthentication before the read-only tuple can be revalidated.
- FAIL — the authored planned sole-dispatch command used nonexistent input `version`. Inspection found the delivered input `expected_version`; the plan was corrected before any dispatch and no external mutation occurred.
- PASS — the first focused preflight suite passed 55/55. The separate GitHub environment metadata read returned `404`; it made no change and does not replace the required workflow/publisher tuple proof.
- PASS — current official requirements remain Node.js `>=22.14.0` and npm `>=11.5.1` for trusted publishing, automatic provenance for the public GitHub OIDC path, and `npm audit signatures` for registry signature/attestation verification. The delivered workflow enforces the runtime minimums, and npm `12.0.2` is the current CLI selected for later verification.
- PASS — the `BLOCKED/BLOCKED` pair validates, transaction state is `NONE / NO_TRANSACTION_EVIDENCE`, `git diff --check` passes, publish-workflow run count remains zero, `0.1.2` remains HTTP `404`, the Task-created npm diagnostic remains zero bytes, and status contains only the continuity checkpoint plus this active pair.
- BLOCKED → PASS — npm security-key reauthentication succeeded. The edit surface proved `GitHub Actions / kimyeongwoo / kyw-dev / publish.yml / npm-production`, allowed only `npm publish`, kept `npm stage publish` disabled, showed public access, the most restrictive publishing-access option, and sole maintainer `kimyw` with write access; cancellation returned to the unchanged summary.
- PASS — the final preflight completed at `2026-07-30T09:20:36.5659458Z` with exact dependency SHA, active workflow ID/blob, 43-file/128,987-byte candidate integrity/shasum, identities/access, registry `404`, and zero prior publish runs.
- PASS — the sole dispatch began at `2026-07-30T09:20:36.5901302Z`, exited zero at `2026-07-30T09:20:38.5912787Z`, and returned run `30530304990`; read-only resolution proves exact workflow ID/path, `workflow_dispatch`, `main`, dependency SHA, attempt `1`, creation window, and no competing run.
- PASS — run `30530304990` completed successfully at `2026-07-30T09:21:18Z`; its sole job `90830809454` and every guard/checkout/setup/source/stable/candidate/absence/publish/cleanup step succeeded. The bounded log contains four exact `KYWPUBLISHEVIDENCE` objects and one successful `+ kyw-dev@0.1.2` publish result.
- PASS — workflow evidence records Node `24.18.0`, npm `11.16.0`, exact source SHA/version, 43 files, 128,987 packed bytes, 586,333 unpacked bytes, integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==`, shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`, SHA-256 `b1dd93882aa94c7839a904a47e7175f55838003bb31c4e65bc61572715f78392`, registry absence, and successful guarded cleanup.
- PASS — canonical registry state at `2026-07-30T09:23:45.1802346Z` contains `0.1.0,0.1.1,0.1.2`, only `latest=0.1.2`, and no deprecation. Version metadata matches name/version/repository/maintainer, identifies `_npmUser` as `GitHub Actions` with GitHub trusted-publisher marker, and contains one registry signature and the exact candidate distribution fields.
- BLOCKED — cache-bypassed reads through `2026-07-30T09:31:57.0447391Z` prove canonical version/root metadata omit required `gitHead`; `npm view kyw-dev@0.1.2 gitHead` is empty. Tarball publication is immutable, and npm CLI source shows that its tarball-manifest path does not inject the directory-publication `gitHead`, so AC-04 cannot be repaired in place.
- PASS — a fresh public tarball at `2026-07-30T09:25:35.5771193Z` is exactly 128,987 bytes with the workflow SHA-1/SHA-256/SHA-512, 43 exact entries, matching package/plugin manifests and source README/legal bytes, no dependency/lifecycle/forbidden paths, and isolated CLI output `0.1.2`.
- PASS — the attestation endpoint returns exactly one npm publish statement and one SLSA provenance v1 statement. Their subject is `pkg:npm/kyw-dev@0.1.2` with SHA-512 hex `3fb8ba72f09098d21bcf76e00794ca219a6dd3f439e60aa51e3cd1f6197aad69ca0a38d97967bbbae3e2b0108aedce4f27aaa1e9ce8c0ed7805b0e840de7001e`; provenance matches the exact repository, workflow, `refs/heads/main`, dependency commit, `workflow_dispatch`, GitHub-hosted builder, and run `30530304990` attempt `1`.
- LIMITATION — npm `12.0.2` under local Node `24.11.0` verified the package and both attestation bundles with zero invalid/missing signatures but emitted engine warnings; the attempted lifecycle-disabled `node@24.18.0` package install did not yield a binary, so neither was retained as final proof.
- PASS — npm `12.0.2` under official Node `24.18.0`, whose archive matched official SHASUMS256, verified `kyw-dev@0.1.2`, one registry signature, and both attestation bundles with zero invalid or missing results at `2026-07-30T09:29:14.8904025Z`. Exact owned temporary state was removed without residue.
- FAIL — the first post-document focused run passed 51/55. All four failures were the expected foundation cascade from missing active delta evidence plus a prohibited full Git SHA in SPEC; no product, workflow, distribution, or recovery assertion failed. SPEC now retains the exact-commit provenance meaning without leaking the hash, and the current delta evidence follows below.
- PASS — the corrected focused suite passed 55/55, including workflow mutation guards, exact-candidate cleanup, distribution lifecycle, permanent-document deltas/ownership, stale-truth rejection, and one-shot failure/recovery behavior.
- PASS — `npm test` passed 393 tests with 390 pass / 3 host-bounded skips / zero failures; lint passed 82 JavaScript modules and foundation metadata; format check passed 338 UTF-8/LF files; pack check passed 43 files at 129,110 bytes.
- PASS — the current 129,110-byte pack projection differs from the immutable published 128,987-byte candidate only because README now states post-publication truth; package identity, allowlist, safety, and no-dependency/lifecycle contracts still pass, and no publication-side action followed.
- PASS — final cache-bypassed state at `2026-07-30T09:42:24.5621880Z` retains exact versions/latest/OIDC/signature/integrity/attestation and the missing `gitHead`; GitHub contains exactly one successful workflow run at attempt `1`, exact SHA/event/branch, one job, zero Releases, and local/remote tag counts of zero.
- PASS — exact changed-path planning selected `STABLE`; final scope is README, SPEC, one instruction projection, the active pair, and the causal Task `0065` continuity transition. All 130 earlier Task/Test files match `main`, including exact Task `0064`/`0065` blobs; transaction state is `NONE / NO_TRANSACTION_EVIDENCE`, active pair validation and `git diff --check` pass.
- FAIL → PASS — the first immutability aggregation command was rejected by PowerShell's parser before execution because of colon interpolation. The corrected read-only command compared all 130 earlier pair files with zero mismatch and made no repository or external change.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 15688 | 15998 | 227 | 227 | 310 | 1.98% | setup, usage, and contributor entry | Users need the current public version, exact install commands, provenance availability, and missing source-metadata limitation before choosing the package. | Existing Start here, Release status, and Direct Skills installation sentences replace the prepublication wording without adding a section. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — publication authority and completion rules do not change. | The repository-wide rule surface remains byte-stable; Task-specific evidence stays in this pair. |
| `docs/SPEC.md` | 40659 | 41080 | 452 | 452 | 421 | 1.04% | observable product behavior and acceptance | Canonical product truth must identify public `0.1.2`, `latest`, OIDC provenance, retained history, and the absent required `gitHead` field. | Existing package-boundary and publication-state paragraphs replace their candidate/prepublication sentences; exact run evidence remains in this pair. |
| `docs/ARCHITECTURE.md` | 36809 | 36809 | 767 | 767 | 0 | 0.00% | stable components, boundaries, dependencies, flows, and distribution | Not applicable — the version-independent trusted-publication architecture remains accurate. | Architecture remains byte-stable because Task `0064` already owns the durable OIDC, retained-tarball, and provenance flow. |
| `Combined` | 97101 | 97832 | 1494 | 1494 | 731 | 0.75% | all four permanent-document owners | README and SPEC must replace stale candidate truth with the observed public release while explicitly retaining the immutable metadata gap. | Existing owner paragraphs absorb the state transition; AGENTS and architecture remain unchanged and detailed evidence stays in this pair. |

## Unverified

- No required read-only workflow, registry, byte, provenance, document, regression, scope, immutability, transaction, or pair check remains unexecuted.
- Required registry `gitHead` is confirmed absent and cannot be added to immutable `0.1.2`; this is the explicit AC-04 blocker, not an unverified claim.
- The post-publication non-draft PR, exact-head CI, merge, post-main run, and evaluator result required by `STANDARD` do not exist and must not be attempted from this blocked outcome without a separately authorized correction contract.

## Final Coverage Review

- [x] Compare the external workflow/registry/attestation facts and final repository diff to every matrix row.
- [x] Map every acceptance criterion to exact executed evidence, including blocked AC-04/AC-10.
- [x] Prove one dispatch, one run attempt, one workflow-contained publish, and zero direct/retry/rerun/alternate mutations.
- [x] Verify registry identity, bytes, dist-tags/history, signatures, and every provenance field against the exact dependency SHA and workflow run.
- [x] Cover failure, ambiguity, propagation delay, existing exact run, and immutable mismatch branches without automatic retry.
- [x] Confirm documents, focused/stable checks, immutable predecessors, transaction cleanliness, excluded surfaces, and absent `STANDARD` delivery are auditable.
