# TEST 0069 — Publish and Prove kyw-dev 0.1.3 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Hard dependency: the exact `0.1.3` candidate-preparation Task named in `TASK.md`
- Immutable recovery evidence: Task `0066`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and publication truth: `../../../README.md`
- Publishing workflow: `../../../.github/workflows/publish.yml`
- Registry baseline: public `0.1.0` through `0.1.2`, `latest=0.1.2`, absent `0.1.3`, and one prior immutable workflow run at authoring

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Authority and credential-free exact preflight are frozen before mutation. | Record explicit authority; validate dependency/main/workflow/tuple/version absence/run history using repository, public registry, and GitHub reads; audit absence of account authentication. | Authority/external | PASS | Narrow authority was explicit; the `2026-07-31T00:06:01.9466396Z` immediate preflight froze exact main/package/workflow/candidate/registry/run history with no account authentication before the sole dispatch. |
| T-02 | AC-02 — Exactly one exact-main attempt occurs with no fallback. | Snapshot run history, dispatch once, observe run ID/attempt/SHA/input, and resnapshot commands/runs/config for absence of rerun, second dispatch, token, direct publish, stage, or alternate tag. | Mutation/control | PASS | Exactly run `30592539397` exists for the target SHA/event/branch at attempt `1`; exact workflow bytes contain one `npm publish` command, it executed once in the sole successful attempt, no active or second target run exists, and no fallback or adjacent mutation command occurred. |
| T-03 | AC-03 — Successful actual OIDC publish is canonical authentication proof. | Inspect the causally matched workflow job/log/attestation identity and assert expected repository, workflow, environment, source SHA, directory input, and successful terminal status. | Authentication/integration | PASS | The sole job `91037762487` and directory-publish step succeeded under workflow environment `npm-production`; bounded workflow evidence identifies the expected repository, manual event, main ref, exact source, runtime, candidate, absence gate, and `+ kyw-dev@0.1.3`. |
| T-04 | AC-04 — Registry `gitHead` equals exact checkout SHA. | Query complete version metadata and compare `gitHead` byte-for-byte to the frozen main/workflow commit; inspect package source to reject synthetic fields. | Registry/integrity | PASS | Cache-bypassed root and version metadata both expose `gitHead=caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0`; source/workflow tests reject synthetic fields and registry rewriting. |
| T-05 | AC-05 — Public tarball and registry digests equal workflow candidate bytes. | Download exact tarball, independently hash and inspect it, and compare SHA-256, integrity, shasum, inventory, package/plugin identity, and workflow evidence. | Distribution/security | PASS | In-memory public-byte proof matches the exact 129,328-byte workflow candidate, SHA-1/SHA-256/SHA-512/integrity, 43 safe entries, manifests, README/legal/CLI bytes, and dependency/lifecycle boundaries. |
| T-06 | AC-06 — Signature and SLSA provenance are valid and causal. | Verify registry signature and attestation/provenance subject plus GitHub repository/workflow/ref/SHA/environment claims against the one run and tarball digest. | Supply chain | PASS | Current npm `12.0.2` under verified official Node `24.18.0` validates one registry signature and one attestation; decoded publish/SLSA statements bind the exact package digest, repo/workflow/ref/commit/event/builder/run. |
| T-07 | AC-07 — `latest` and history are exact with no adjacent mutation. | Query versions/dist-tags/deprecations and inspect local/remote tags, Releases, submissions, and workflow history before/after. | External/scope | PASS | Public versions are `0.1.0`–`0.1.3`, only `latest=0.1.3`, no deprecation, prior `0.1.2` availability/integrity/shasum and missing `gitHead` unchanged, two one-attempt historical runs, and no tag, Release, or submission mutation. |
| T-08 | AC-08 — Every failure path stops honestly. | Exercise non-mutating harness branches and, for the real run, require immediate `BLOCKED/BLOCKED` chronology after any failure with no retry/repair; audit any account investigation for separate authority. | Failure/authority | PASS | Focused workflow/release-evidence guards pass; the actual publish/proof path succeeded, and two local proof wrappers rejected before execution were recorded without publication retry, repair mutation, or account investigation. |
| T-09 | AC-09 — Documentation, evidence, transaction, and delivery are complete without rewriting Task `0066`. | Hash prior pair, review final matrix/diff/docs, validate pair/transaction, run required checks, and complete only outcome-appropriate `STANDARD` evidence delivery. | Documentation/delivery | PASS | README/SPEC/projection, complete chronology, Stable/focused results, six-path diff, permanent-document measurements, pair/transaction checks, and immutable Task `0066` hashes form the exact terminal handoff; mutable GitHub delivery evidence is not pre-claimed. |

## Regression Coverage

- Exact-main/SHA/version/environment gates, real-Git directory input, public access, provenance, expected tuple, and zero-token workflow remain intact.
- One-attempt/no-retry/no-fallback/no-account-auth behavior is preserved for healthy releases and failures.
- Package inventory, README/legal/CLI, zero dependencies/lifecycle scripts, tarball integrity, signature, and provenance checks remain enforced.
- Public `0.1.0` through `0.1.2`, Task `0066`, tags, Releases, and submission state remain unchanged except the explicitly authorized `0.1.3`/`latest` mutation.

## Commands

- Planned preflight: validate the dependency and Task `0066`; inspect transaction, exact main/workflow/tuple, public versions/dist-tags/target absence, publish run history, tags, Releases, and concurrent state without npm account authentication.
- Planned authority record: preserve the user's separate explicit authorization and freeze exact version, SHA, workflow bytes, tuple, expected run-count delta, and single dispatch command before mutation.
- Planned mutation: one `gh workflow run publish.yml --ref main -f expected_sha=<frozen-sha> -f expected_version=0.1.3` against the frozen exact main, followed only by read-only run observation; never rerun or dispatch again.
- Planned workflow proof: inspect run attempt, inputs, head SHA, jobs/logs, environment, OIDC/provenance evidence, and workflow-side candidate metadata for the one run.
- Planned registry proof: query full `kyw-dev@0.1.3` metadata, download exact tarball, independently compute SHA-1/SHA-256/SHA-512/integrity, inspect inventory/manifests, verify signature and SLSA provenance, and compare `gitHead`.
- Planned no-adjacent-mutation proof: requery versions/latest/deprecations, workflow history, local/remote tags, GitHub Releases, public submission, account-auth commands, and credential/config surfaces.
- Planned repository checks: focused publication/release/instruction tests plus `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check` as required by final diff.
- Planned Task/delivery checks: validate pair/transaction, hash Task `0066`, review complete chronology and matrix, then perform outcome-appropriate `STANDARD` exact-SHA delivery through `$kyw-impl`.
- Executed selected/dependency pair validation, transaction inspection, clean status/diff inspection, local/cached/direct/GitHub `main` alignment, package/plugin/workflow identity checks, immutable Task `0066` hashes, credential-free registry history/absence reads, publish-run/concurrency reads, and tag/Release reads.
- Executed the sole packaged dispatcher call for the exact current `$kyw-impl 0069` invocation with the user's appended one-dispatch/one-publish authority and empty verified conflict, unexplained-work, remote-drift, and user-decision findings.
- Created `task/0069-publish-and-prove-kyw-dev-0-1-3-through-npm-oidc` from exact aligned `main` and entered `IN_PROGRESS/RUNNING`.
- Validated the active pair and applied the dispatcher-provided continuity transition exactly once.
- Executed one atomic immediate preflight covering main identities, worktree scope, package/plugin identity, exact workflow bytes/registration, retained candidate creation and guarded cleanup, public versions/`latest`/target absence, run history/concurrency, tags/Releases, transaction state, and Task `0066` hashes.
- Executed exactly one `gh workflow run publish.yml --repo kimyeongwoo/kyw-dev --ref main -f expected_sha=caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0 -f expected_version=0.1.3`, then only read run inventory to resolve the returned run.
- Executed read-only terminal run/job/step/API inspection for run `30592539397` and bounded its 1,027-line log to exact evidence/publication markers.
- Executed cache-bypassed canonical root/version registry reads, public versions/dist-tags/deprecation/history reads, and exact `gitHead`, publisher, signature, integrity, shasum, size, and attestation metadata checks.
- Attempted two PowerShell public-tarball proof wrappers; local command policy rejected both before execution because of recursive cleanup syntax, so neither created or removed any state.
- Executed a filesystem-free public-tarball proof in memory: independent SHA-1/SHA-256/SHA-512/integrity, TAR safety/inventory parsing, manifest/dependency/lifecycle checks, and source-byte comparison for package/plugin/README/legal/notices/CLI.
- Queried current public npm CLI metadata, fetched official Node `24.18.0` plus SHASUMS256 and npm `12.0.2` into one isolated owned temporary root, verified both distributions, installed exact `kyw-dev@0.1.3` with lifecycle scripts disabled, ran `npm audit signatures`, and removed the owned root in-process.
- Fetched the exact public attestation endpoint, decoded only bounded DSSE statement fields, and compared publish/SLSA subject, digest, repository, workflow, ref, commit, event, builder, and invocation identities.
- Executed `npm run verify:plan -- README.md docs/SPEC.md test/instruction-surfaces.test.mjs`; the exact changed-path planner selected `STABLE`.
- Executed the final focused publication/distribution/foundation/instruction/release-evidence command; all 57 tests passed.
- Executed `npm run check`; `npm test`, lint, format, and package-selection gates all passed.
- Executed the final cache-bypassed registry/workflow/run/tag/Release/remote-main snapshot, six-path matrix/diff review, Task `0066` hash check, permanent-document measurement check, temporary-state check, pair validation, transaction inspection, and `git diff --check`.
- Re-executed `npm run check` after entering `DONE/PASSED`.

## Results

- PASS — Task `0069` and Task `0068` validate, Task transaction inspection is `NONE / NO_TRANSACTION_EVIDENCE`, the tracked worktree was clean, and local/cached/direct/GitHub `main` all equal `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0`.
- PASS — public credential-free reads at `2026-07-31T00:00:55.6988889Z` list exactly `0.1.0` through `0.1.2`, keep `latest=0.1.2`, return HTTP `404` for `0.1.3`, and find no deprecation.
- PASS — package/plugin identity is exact `0.1.3`; workflow ID `323508270` is active at blob `117078f1c0fb87f12843ca77472a218b3f103e3c`, SHA-256 `a4b3d2cc30f514e021b01981833a2332e73e258f5c2f6e3b45d46950140bd6d8`, with one completed historical run, zero active runs, and zero runs at the target main.
- PASS — Task `0066` remains unchanged at SHA-256 `7bcb1d64417a25a2d1f88342806288a3dca8288d330a5a088cf922168664b9b7` / `5040e617ea3ef796f0bb91a899a9ff8f29e3426dca30f9f37ae830cbec1277c2`; remote tags and GitHub Releases remain absent.
- PASS — the sole packaged dispatcher selected Task `0069` for `IMPLEMENT`, classified Task `0068` as fresh `HARDENED_EXACT_HEAD` evidence and prior required outcomes as durable continuity, and prepared one opaque transition without retry or manual delivery payload.
- PASS — continuity advanced exactly once through Task `0068` at checkpoint digest `ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e`.
- PASS — the immediate preflight at `2026-07-31T00:06:01.9466396Z` reproduced the exact 43-file / 129,328-byte candidate at SHA-256 `40c510342755f6bd45c2aa27ed96ad4c60082e1d3b42d82d32fdb8aefa8dc966`, retained exact main/workflow/tuple/registry/history facts, safely cleaned candidate state, and used no npm account surface.
- PASS — the sole dispatch began at `2026-07-31T00:06:01.9603091Z`, exited zero at `2026-07-31T00:06:04.1541257Z`, and returned run `30592539397`; exactly one matching `main` / exact-SHA / `workflow_dispatch` run exists at attempt `1`.
- PASS — run `30592539397` completed successfully at `2026-07-31T00:06:49Z`; sole job `91037762487` and every guard, Stable, candidate, absence, directory-publish, and cleanup step succeeded.
- PASS — exact workflow evidence records repository/event/ref/source, Node `24.18.0`, npm `11.16.0`, `kyw-dev@0.1.3`, 43 files, 129,328 bytes, exact integrity/shasum/SHA-256, registry `404`, publication to `latest`, and `+ kyw-dev@0.1.3`.
- PASS — canonical registry state at `2026-07-31T00:07:37.3436566Z` contains `0.1.0`–`0.1.3`, only `latest=0.1.3`, no deprecation, exact root/version `gitHead`, GitHub Actions trusted-publisher identity, expected repository/maintainer, one signature, and exact distribution/attestation fields.
- FAIL — two initial public-byte PowerShell wrappers were rejected by local command policy before execution because they contained recursive cleanup. No temporary file or directory was created, and no external or repository mutation occurred.
- PASS — the replacement in-memory proof at `2026-07-31T00:09:44.402Z` parsed the exact public bytes with no filesystem state: 129,328 bytes, SHA-1 `43e5ac074d3a04b17e82bc2d5214c3ac4279e9cc`, SHA-256 `40c510342755f6bd45c2aa27ed96ad4c60082e1d3b42d82d32fdb8aefa8dc966`, exact SHA-512/integrity, 43 safe files, exact manifests and required source bytes, and no dependency/lifecycle surface.
- PASS — official Node `24.18.0` matched SHASUMS256 at `0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821`; exact current npm `12.0.2` installed `kyw-dev@0.1.3` without lifecycle scripts and reported one verified registry signature plus one verified attestation with no stderr.
- PASS — the attestation endpoint returns exactly npm publish and SLSA provenance v1 statements with one signature/transparency entry each; both subject the exact package SHA-512, and provenance matches repository, workflow, `refs/heads/main`, source commit, `workflow_dispatch`, GitHub-hosted builder, and `30592539397/1`.
- PASS — post-publication workflow inventory contains exactly two successful historical attempts and one target run, with zero active runs; remote tags and GitHub Releases remain absent and public `0.1.2` integrity/shasum/history remain unchanged.
- PASS — the exact changed-path planner selected `STABLE`, and the final focused command passed 57/57 publication workflow, real-npm `gitHead`, distribution, foundation, instruction-surface, and release-evidence tests.
- PASS — `npm run check` completed 395 tests with 392 passes, three explicit skips, and zero failures; lint covered 83 modules, format covered 345 UTF-8/LF files, and package selection covered 43 files / 129,361 bytes.
- PASS — the final external snapshot at `2026-07-31T00:20:11.9707918Z` retains exact target metadata, digests, signature, attestation, GitHub trusted-publisher identity, `latest=0.1.3`, one successful target run at attempt `1`, zero active runs, zero tags, and zero Releases; prior `0.1.2` distribution fields and remote/GitHub main remain unchanged.
- PASS — final repository scope is exactly six paths: README, SPEC, instruction projection, this Task/Test pair, and continuity; Task `0066` hashes remain exact, permanent-document measurements match the table, no temporary evidence or Task transaction exists, and whitespace inspection passes.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16777 | 16881 | 227 | 227 | 104 | 0.62% | setup, usage, and contributor entry | Users need the current public `0.1.3` status, exact install commands, exact-checkout `gitHead`, provenance, and retained historical limitation before choosing a release. | Existing Start here, Release status, and Direct Skills installation sentences replace the unpublished-candidate and `0.1.2`-latest wording without adding a section. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — publication authority, delivery, evidence honesty, and immutability rules do not change. | The repository-wide instruction surface remains byte-stable; publication chronology stays in this pair. |
| `docs/SPEC.md` | 42006 | 42016 | 452 | 452 | 10 | 0.02% | observable product behavior and acceptance | Product truth must identify public `0.1.3`, `latest`, exact-checkout `gitHead`, signatures/provenance, and preserved `0.1.2` history. | Existing package-boundary and publication-state paragraphs replace only candidate/public-version facts; the durable publication contract remains in place. |
| `docs/ARCHITECTURE.md` | 38557 | 38557 | 792 | 792 | 0 | 0.00% | stable components, boundaries, dependencies, flows, and distribution | Not applicable — the exact-checkout directory-publish and OIDC flow behaved exactly as already designed. | Architecture remains byte-stable because no component, dependency, boundary, or data flow changed. |
| `Combined` | 101285 | 101399 | 1519 | 1519 | 114 | 0.11% | all four permanent-document owners | README and SPEC must replace stale prepublication truth while detailed immutable chronology remains Task-owned. | Existing sentences absorb the state transition; AGENTS and ARCHITECTURE stay unchanged and no new permanent section is added. |

## Unverified

- Repository acceptance has no unverified required row. The non-draft PR, exact-head checks, merge, post-main run, and evaluator result required by `STANDARD` do not exist yet and remain the separate delivery gate.
- No second dispatch, rerun, direct/local publish, token fallback, account/settings reauthentication, dist-tag, tag, Release, public submission, or other public mutation is authorized or claimed.

## Final Coverage Review

- [x] Compare final repository and public-state changes to every matrix row.
- [x] Map every acceptance criterion to one or more causally matched evidence rows.
- [x] Cover success, OIDC/publisher failure, post-publication proof failure, and bounded registry-observation branches.
- [x] Confirm all PASS evidence comes from the one exact run/version/SHA.
- [x] Confirm required regressions and no-adjacent-mutation checks ran.
- [x] Confirm Task `0066` remains byte-immutable and `BLOCKED/BLOCKED`.
