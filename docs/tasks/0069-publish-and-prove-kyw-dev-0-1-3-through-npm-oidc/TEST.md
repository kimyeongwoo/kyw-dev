# TEST 0069 — Publish and Prove kyw-dev 0.1.3 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

READY

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
| T-01 | AC-01 — Authority and credential-free exact preflight are frozen before mutation. | Record explicit authority; validate dependency/main/workflow/tuple/version absence/run history using repository, public registry, and GitHub reads; audit absence of account authentication. | Authority/external | TODO | Not run. |
| T-02 | AC-02 — Exactly one exact-main attempt occurs with no fallback. | Snapshot run history, dispatch once, observe run ID/attempt/SHA/input, and resnapshot commands/runs/config for absence of rerun, second dispatch, token, direct publish, stage, or alternate tag. | Mutation/control | TODO | Not run. |
| T-03 | AC-03 — Successful actual OIDC publish is canonical authentication proof. | Inspect the causally matched workflow job/log/attestation identity and assert expected repository, workflow, environment, source SHA, directory input, and successful terminal status. | Authentication/integration | TODO | Not run. |
| T-04 | AC-04 — Registry `gitHead` equals exact checkout SHA. | Query complete version metadata and compare `gitHead` byte-for-byte to the frozen main/workflow commit; inspect package source to reject synthetic fields. | Registry/integrity | TODO | Not run. |
| T-05 | AC-05 — Public tarball and registry digests equal workflow candidate bytes. | Download exact tarball, independently hash and inspect it, and compare SHA-256, integrity, shasum, inventory, package/plugin identity, and workflow evidence. | Distribution/security | TODO | Not run. |
| T-06 | AC-06 — Signature and SLSA provenance are valid and causal. | Verify registry signature and attestation/provenance subject plus GitHub repository/workflow/ref/SHA/environment claims against the one run and tarball digest. | Supply chain | TODO | Not run. |
| T-07 | AC-07 — `latest` and history are exact with no adjacent mutation. | Query versions/dist-tags/deprecations and inspect local/remote tags, Releases, submissions, and workflow history before/after. | External/scope | TODO | Not run. |
| T-08 | AC-08 — Every failure path stops honestly. | Exercise non-mutating harness branches and, for the real run, require immediate `BLOCKED/BLOCKED` chronology after any failure with no retry/repair; audit any account investigation for separate authority. | Failure/authority | TODO | Not run. |
| T-09 | AC-09 — Documentation, evidence, transaction, and delivery are complete without rewriting Task `0066`. | Hash prior pair, review final matrix/diff/docs, validate pair/transaction, run required checks, and complete only outcome-appropriate `STANDARD` evidence delivery. | Documentation/delivery | TODO | Not run. |

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

## Results

- Not applicable — verification and publication have not run.

## Unverified

- Separate publication authority has not been granted.
- No `0.1.3` workflow run, public version, `gitHead`, tarball, signature, provenance, or `latest` mutation exists or is claimed.

## Final Coverage Review

- [ ] Compare final repository and public-state changes to every matrix row.
- [ ] Map every acceptance criterion to one or more causally matched evidence rows.
- [ ] Cover success, OIDC/publisher failure, post-publication proof failure, and bounded registry-observation branches.
- [ ] Confirm all PASS evidence comes from the one exact run/version/SHA.
- [ ] Confirm required regressions and no-adjacent-mutation checks ran.
- [ ] Confirm Task `0066` remains byte-immutable and `BLOCKED/BLOCKED`.
