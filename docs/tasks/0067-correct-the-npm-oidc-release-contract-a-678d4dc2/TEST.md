# TEST 0067 — Correct the npm OIDC Release Contract and Preserve gitHead

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Hard dependency: Task `0065`
- Immutable causal evidence: Task `0066`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and release truth: `../../../README.md`
- Publishing workflow: `../../../.github/workflows/publish.yml`
- Official npm behavior: npm CLI directory/tarball publish, package normalization, Git-head, OIDC, trust tuple, and provenance sources

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Routine releases avoid npm account reauthentication and use narrow escalation triggers. | Assert README/SPEC/architecture and release preflight tests reject normal `npm login`, OTP, security-key, `npm trust list`, and account-settings inspection while retaining setup/audit/change/failure-investigation branches. | Policy/integration | PASS | Durable-owner assertions pass and preserve only initial setup, explicit audit/change, and actual-failure investigation as account-authentication triggers. |
| T-02 | AC-02 — Expected tuple and workflow bytes are repository-owned. | Validate the single tuple owner and its projections against exact local/registered workflow identity without an authenticated npm account call. | Integrity | PASS | `TRUSTED_PUBLISHER_EXPECTATION` owns the tuple and workflow path; foundation/workflow tests validate every projection against exact bytes with no npm account call. |
| T-03 | AC-03 — Production publication uses the real checkout directory and remains OIDC-only. | Parse and execute workflow-focused tests for exact-main/SHA/environment/provenance gates, directory input, and absence of tarball input, tokens, interactive auth, retry, and fallback. | Workflow/security | PASS | Workflow tests prove clean exact-checkout `npm publish .`, retained gates/proof, and absence of tarball, credential, auth, retry, second-dispatch, and alternate-tag paths. |
| T-04 | AC-04 — Actual npm CLI directory publication derives exact `gitHead` and matching tarball bytes. | Create/commit a temporary Git repo, independently pack it, publish its directory to an owned loopback registry, decode the captured attachment, and compare Git SHA and digests. | Integration/fixture | PASS | Actual npm `11.18.0` submitted the exact temporary commit as raw `gitHead`; captured attachment bytes equal the independently packed candidate. |
| T-05 | AC-05 — Tarball input is a negative control and metadata fabrication is rejected. | Publish the prebuilt tarball to an isolated loopback capture; assert synthesized `gitHead` is absent and guards reject package-field or registry-rewrite workarounds. | Regression/security | PASS | The same tarball sent to a fresh capture omitted `gitHead`; source/archive manifests omit it and raw-capture guards reject fabrication/post-processing. |
| T-06 | AC-06 — OIDC/publisher failure is fail-closed. | Exercise workflow/harness failure branches and static scans; require one failed outcome with no retry, second dispatch, credential fallback, direct publish, or automatic account-auth path. | Failure/authority | PASS | Focused mutations reject retry/stage/tarball/missing-reconfirmation/account-auth variants, and durable truth requires only one `BLOCKED` outcome. |
| T-07 | AC-07 — Durable truth and immutable Task evidence agree. | Review document owners, run instruction/foundation guards, and hash Task `0066` pair before and after implementation. | Documentation/integrity | PASS | README/SPEC/architecture and 31 foundation/instruction assertions agree; AGENTS and Task `0066` remain byte-identical. |
| T-08 | AC-08 — Required checks pass with no excluded mutation. | Run focused and stable commands; inspect registry, workflow runs, tags, Releases, transaction, and worktree before/after. | Regression/external | PASS | Focused 52/52, Stable commands, and `release:ci` pass; isolated public and GitHub reads prove all excluded surfaces unchanged. |
| T-09 | AC-09 — Exact-main STANDARD delivery gates the next Task. | Validate final matrix/diff/pair, then require non-draft actual-head CI, merge compatibility, expected-head merge, post-main CI, and evaluator-complete evidence. | Delivery | PASS | Final 15-path scope is mapped, pairs validate, transaction is clean, and `STANDARD` remains an unclaimed external gate before Task `0068` can become eligible. |

## Regression Coverage

- Existing manual-only workflow trigger, exact-main/SHA/version checks, protected environment, public access, provenance, candidate allowlist, and post-publication byte/signature/provenance inspection remain enforced.
- Package contents, zero production dependencies, no lockfile, no lifecycle scripts, installer behavior, CI roles, Task immutability, and publication authority remain intact.
- Task `0066` keeps its successful publication chronology and missing-`gitHead` blocker without edit or success reinterpretation.
- Public `0.1.2`, `latest`, signature, provenance, tags, and Releases remain unchanged.

## Commands

- Planned dependency/evidence checks: validate Tasks `0065` and `0066`, hash the Task `0066` pair, inspect continuity/transaction state, and compare exact main/workflow bytes.
- Planned official-source review: inspect npm CLI `lib/commands/publish.js`, `@npmcli/package-json` normalization/Git-head steps, `lib/utils/oidc.js`, and trust/provenance behavior.
- Planned focused tests: `node --test test/publish-workflow.test.mjs test/release-evidence-harness.test.mjs test/instruction-surfaces.test.mjs test/foundation.test.mjs` plus the new actual-npm directory-publish fixture test.
- Planned loopback proof: run the new fixture with a Task-owned temporary Git repository and owned loopback registry; capture directory-positive and tarball-negative publish requests and perform guarded cleanup.
- Planned stable commands: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned no-mutation checks: public `npm view`, read-only `gh run list`, local/remote tag lists, GitHub Release list, workflow hash, credential/config scans, and confirmation that no public publish/dispatch/settings mutation ran.
- Planned Task checks: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this-task-directory>` and `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Planned delivery proof: complete exact-head PR, synthetic merge, expected-head merge, post-main exact-SHA CI, and evaluator evidence through `$kyw-impl`.
- Executed selected/dependency/causal pair validation, Task transaction inspection, scoped status, Task `0066` SHA-256/Git-blob comparison, local/direct/GitHub `main` reads, and exact local/HEAD/GitHub workflow-blob comparison.
- Executed cache-bypassed public registry metadata reads without npm account authentication; inspected publish-workflow runs, Task `0065` PR delivery, local/remote tags, and GitHub Releases read-only.
- Executed official current and installed npm `11.18.0` CLI source review for `publish.js`, `@npmcli/package-json` preparation steps, and `gitHead` normalization.
- Executed the sole packaged dispatcher call for `$kyw-impl 0067`; created the selected branch and entered `IN_PROGRESS/RUNNING`.
- Executed `node --test test/npm-publish-git-head.test.mjs`, then the combined workflow/fixture command `node --test test/publish-workflow.test.mjs test/npm-publish-git-head.test.mjs`.
- Executed the five-file focused command covering workflow, actual-npm fixture, release harness, instruction surfaces, and foundation; retained its initial document-evidence/projection failures.
- Re-executed `node --test test/instruction-surfaces.test.mjs` after each bounded durable-truth projection correction through a final pass.
- Executed `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs`, then the final five-file focused command; they passed 31/31 and 52/52 respectively.
- Executed the exact changed-path planner; it selected `RELEASE`, the local leaf `npm run release:ci`, 11 hosted PR jobs / 15 leaves, and 10 hosted main jobs / 11 leaves.
- Executed standalone `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`, then `npm run release:ci`.
- Re-executed isolated public-registry metadata reads, GitHub main/workflow/run/Release reads, remote-tag reads, Task `0066` hashes, all five pair validations, transaction inspection, future-pair semantic-byte hashes, `git diff --check`, and scoped status.
- Revalidated the terminal pair and re-executed `npm test` after entering `DONE/PASSED`, then repeated pair/transaction/format/whitespace/status checks immediately before commit.

## Results

- PASS — Task `0067`, dependency Task `0065`, and immutable causal-evidence Task `0066` validate; transaction inspection is `NONE / NO_TRANSACTION_EVIDENCE`, and no other Task is active.
- PASS — local/cached/direct/GitHub `main` all equal `b3f22f94781c6298afb9076afdecf7a0efc7e99d`; Task `0065` PR `#53` is merged at its recorded merge SHA, and local/HEAD/GitHub workflow blobs all equal `74c393fa6e342b7cd1db2ef99489d6e7cc465533`.
- PASS — the sole dispatcher call selected Task `0067` for `IMPLEMENT`, classified Tasks `0030`–`0065` as `DURABLE_STANDARD_CONTINUITY`, found zero uncovered prior Tasks, and required no continuity mutation.
- PASS — public registry state remains versions `0.1.0`–`0.1.2`, `latest=0.1.2`, missing `0.1.2` `gitHead`, and absent `0.1.3`; GitHub retains exactly the historical run `30530304990` at attempt `1`, with no tag or Release.
- PASS — Task `0066` remains unchanged at SHA-256 `7bcb1d64417a25a2d1f88342806288a3dca8288d330a5a088cf922168664b9b7` / `5040e617ea3ef796f0bb91a899a9ff8f29e3426dca30f9f37ae830cbec1277c2`.
- PASS — official and installed npm CLI code independently show that directory publication calls package preparation including Git-head discovery, while prebuilt-tarball publication reads the archived manifest without synthesizing `gitHead`.
- PASS — the actual npm CLI fixture passed 2/2: directory publication submitted the exact temporary Git commit as raw-packument `gitHead`, its attachment matched the independently packed candidate byte-for-byte, the tarball control omitted synthesized `gitHead`, and fabrication/post-processing guards rejected both workaround classes.
- FAIL → PASS — the first combined workflow/fixture run passed 3/4; its sole failure was an over-broad credential regex matching the harmless workflow error phrase “npm config.” Anchoring the scan to executable npm command lines produced 4/4 passes while retaining account-command rejection.
- FAIL — the first five-file focused run passed 50/52. Foundation correctly required current permanent-document delta evidence, and instruction coverage exposed one stale pre-correction phrase; workflow, fixture, release-harness, and all other documentation/security assertions passed.
- FAIL → PASS — bounded instruction-projection reruns exposed and corrected stale architecture phrase/order/case expectations without weakening the contract; the final instruction-surface run passed 10/10.
- PASS — foundation plus instruction coverage passed 31/31, and the final focused workflow/release-harness/instruction/foundation/actual-npm set passed 52/52.
- FAIL → PASS — the first format check failed only because the four pre-created Task `0068`/`0069` files lacked terminal LF. Adding exactly one LF to each made all 345 files pass; hashing each final file without that LF reproduces its exact original SHA-256, with no semantic or status change.
- PASS — the exact 15-path planner selected `RELEASE`. Standalone Stable verification completed 395 tests with 392 passes, three explicit skips, and zero failures; lint covered 83 JavaScript modules, format covered 345 UTF-8/LF files, and package selection covered 43 files / 129,307 bytes.
- PASS — `npm run release:ci` reproduced 395/392/3/0, lint 83, format 345, and package 43 / 129,307, and produced candidate SHA-256 `870b642a6a75c1b3c7338669722242dfa9b75acf05fd84d99459b94061ce845b`.
- FAIL → PASS — the first final isolated npm read pointed user and global configuration at the same empty file, so npm exited before reading registry state. Distinct empty configs then proved versions `0.1.0`–`0.1.2`, `latest=0.1.2`, absent `0.1.2` `gitHead`, and `E404` for `0.1.3`; the owned audit cache was removed.
- PASS — final GitHub reads keep `main` at `b3f22f94781c6298afb9076afdecf7a0efc7e99d`, its registered workflow blob at `74c393fa6e342b7cd1db2ef99489d6e7cc465533`, exactly one historical publish run `30530304990` attempt `1`, and no tags or Releases.
- PASS — Task `0066` still hashes to `7bcb1d64417a25a2d1f88342806288a3dca8288d330a5a088cf922168664b9b7` / `5040e617ea3ef796f0bb91a899a9ff8f29e3426dca30f9f37ae830cbec1277c2`; its diff is empty.
- PASS — Tasks `0065`–`0069` validate, transaction inspection remains `NONE / NO_TRANSACTION_EVIDENCE`, `git diff --check` passes, and the 15 changed paths map only to workflow/tuple implementation, actual-npm fixture, durable owners/guards, this evidence pair, and the byte-preserved dependent pair set.
- PASS — the terminal-lifecycle full-suite rerun completed 395 tests with 392 passes, three explicit skips, zero failures, and a valid repository-only `STANDARD` handoff.
- PASS — terminal pair validation succeeds, transaction state remains clean, terminal formatting covers 345 UTF-8/LF files, and pre-commit whitespace/status inspection remains scoped to the mapped set.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 15998 | 16698 | 227 | 227 | 700 | 4.38% | setup, usage, and contributor entry | Maintainers need routine authentication boundaries, the repository-owned expected tuple, and exact-checkout publication before authorizing a release. | Existing Release status and Direct Skills installation paragraphs replace the obsolete account-reauthentication and tarball-input guidance without adding a section. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, serial execution, publication authority, and terminal immutability do not change. | The repository-wide rule surface remains byte-stable; Task-specific implementation and evidence remain in this pair. |
| `docs/SPEC.md` | 41080 | 41957 | 452 | 452 | 877 | 2.13% | observable product behavior and acceptance | Product truth must require repository-owned tuple/workflow validation, directory publication with derived `gitHead`, and one-path OIDC failure handling. | Existing MVP acceptance and publication-state paragraphs replace the retained-tarball/account-inspection contract; no new owner section is added. |
| `docs/ARCHITECTURE.md` | 36809 | 38557 | 767 | 792 | 1748 | 4.75% | stable components, boundaries, dependencies, flows, and distribution | The durable authentication, candidate-to-directory publication, runtime proof, failure, and actual-npm loopback validation flows changed. | Existing publication, trusted-workflow, release-verification, and security boundaries absorb the corrected flow and fixture; detailed wire assertions stay in tests. |
| `Combined` | 97832 | 101157 | 1494 | 1519 | 3325 | 3.40% | all four permanent-document owners | README, SPEC, and ARCHITECTURE must agree on one corrected release/authentication/data flow while AGENTS remains unchanged. | Three existing owner sections replace stale meaning; implementation detail and historical chronology remain outside permanent truth. |

## Unverified

- Repository acceptance has no unverified required row. The non-draft PR, exact-head checks, merge, post-main run, and evaluator result required by `STANDARD` do not exist yet and remain the separate delivery gate.
- No actual public publication is authorized or planned in this Task; therefore successful production OIDC authentication remains for the dependent publication Task.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
- [x] Confirm Task `0066` is byte-immutable and all excluded external surfaces are unchanged.
- [x] Confirm `STANDARD` remains the external gate that must reach exact main before Task `0068` can run.
