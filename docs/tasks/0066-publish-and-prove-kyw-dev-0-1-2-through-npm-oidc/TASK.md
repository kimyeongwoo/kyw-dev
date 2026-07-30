# TASK 0066 — Publish and Prove kyw-dev 0.1.2 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

READY

## Goal

Publish the exact delivered `kyw-dev@0.1.2` main-SHA candidate through the hardened `.github/workflows/publish.yml` using npm OIDC Trusted Publishing, then prove registry identity, byte integrity, `latest` and historical dist-tag/version state, cryptographic provenance, and GitHub exact-SHA/run evidence without a long-lived npm token, interactive OTP, direct local publish, or automatic retry.

## Dependencies

- Task 0065.

## In Scope

- Resolve and record the dependency's exact evaluator-complete `main` merge SHA, verify aligned local/direct/GitHub main, and require that SHA to contain package/plugin `0.1.2`, the delivered workflow bytes, and no later package-input drift.
- Revalidate the authenticated npm trusted-publisher tuple, package publishing access, workflow registration, workflow SHA, GitHub access, package ownership/maintainer identity, published versions, `latest`, and `0.1.2` absence immediately before dispatch.
- Freeze one explicit authority boundary for exactly one `workflow_dispatch` of `publish.yml` on `main` with expected SHA equal to the dependency merge and expected version `0.1.2`; issue no direct `npm publish` command.
- Resolve the dispatch response and its single workflow run by workflow ID, event, creation window, head branch, exact head SHA, inputs/evidence, and attempt. Poll that run read-only to a terminal result; never dispatch again or rerun a job/workflow automatically.
- Require the workflow's exact checkout evidence, supported runner/Node/npm identities, candidate filename/size/integrity/shasum/SHA-256, absence preflight, one OIDC-backed tarball publish, attempt `1`, successful job/run conclusions, and no token/OTP/retry/fallback path.
- Query canonical registry metadata for `kyw-dev@0.1.2`; verify name/version, `gitHead`, repository, maintainer, `_npmUser` GitHub Actions/trusted-publisher identity, `dist.integrity`, `dist.shasum`, tarball URL, file count, unpacked size, and registry signatures.
- Download the public tarball into fresh owned state, compare its bytes and digests to workflow candidate evidence, inspect the exact allowlist/manifests/README/legal/dependency/lifecycle boundary, and run an isolated public-registry CLI smoke at exact output `0.1.2`.
- Verify `latest` resolves to `0.1.2`, versions retain `0.1.0` and `0.1.1`, and no independent dist-tag command, deprecation, unpublish, tag, GitHub Release, or public plugin submission occurred.
- Fetch the registry attestation bundle, cryptographically verify registry signatures and attestations with current npm tooling, and decode the SLSA provenance statement to match package subject/SHA-512, public repository, `.github/workflows/publish.yml`, `refs/heads/main`, dependency merge commit, `workflow_dispatch`, GitHub-hosted builder, and the exact run/attempt invocation.
- After successful external proof, synchronize README/SPEC public `0.1.2`/`latest`/provenance truth and exact permanent-document deltas; preserve architecture and AGENTS unless durable meaning changed.
- Run focused registry/provenance/document checks, the four stable commands, final diff/coverage, pair/queue/transaction validation, immutable predecessor hashes, and `STANDARD` delivery of the post-publication truth/evidence.

## Out of Scope

- Bumping any version beyond or away from exact `0.1.2`, modifying package inputs before dispatch, or rebuilding from a nondependency SHA.
- Direct local `npm publish`, `npm stage publish`, a second workflow dispatch, workflow/job rerun, automatic retry, token fallback, interactive OTP, or ambiguous-result retry.
- Editing `publish.yml`, `ci.yml`, the npm trusted-publisher configuration, publishing-access policy, account security, token inventory, owner/maintainer access, GitHub environment/repository settings, or branch protection.
- Running an independent `npm dist-tag` command, changing any non-`latest` tag, deprecating/unpublishing a version, or repairing an immutable mismatched registry object.
- Creating a Git tag, GitHub Release, public plugin/marketplace submission, force/destructive operation, bypass, branch deletion, or unrelated release.
- Editing or reterminalizing either delivered predecessor, Task `0063`, or any other existing Task/Test pair.

## Acceptance Criteria

- [ ] AC-01: Preflight binds aligned `main`, the evaluator-complete release-preparation merge SHA, unchanged trusted workflow/publisher tuple, exact package/plugin `0.1.2`, expected owners/maintainers, historical registry/latest state, and absent `0.1.2` before external mutation.
- [ ] AC-02: Exactly one authorized `workflow_dispatch` targets `publish.yml` on `main` with the dependency merge SHA and version `0.1.2`; no direct publish, second dispatch, rerun, retry, token, OTP, fallback, independent dist-tag, tag, or Release command occurs.
- [ ] AC-03: One attempt of the exact workflow/run/job graph succeeds on the dependency SHA and records exact event/ref/checkout, runner/Node/npm, candidate metadata, absence preflight, and one OIDC publication command with bounded auditable logs.
- [ ] AC-04: Canonical registry metadata identifies `kyw-dev@0.1.2`, exact `gitHead` and repository, maintainer `kimyw`, publisher `GitHub Actions` with npm's GitHub trusted-publisher marker, expected registry signatures, and no traditional human/token publisher identity.
- [ ] AC-05: Registry integrity, shasum, downloaded tarball SHA-256/size, file count, unpacked size, package/plugin manifests, README, legal bytes, allowlist, dependency/lifecycle absence, and isolated CLI output exactly match the workflow's verified candidate.
- [ ] AC-06: `latest` resolves to `0.1.2`, public versions retain `0.1.0`, `0.1.1`, and `0.1.2`, and read-only evidence finds no independent dist-tag mutation, deprecation, unpublish, Git tag, GitHub Release, or public plugin submission.
- [ ] AC-07: npm signature verification passes and the public SLSA provenance attestation binds `pkg:npm/kyw-dev@0.1.2` and its SHA-512 to `https://github.com/kimyeongwoo/kyw-dev`, `.github/workflows/publish.yml`, `refs/heads/main`, the dependency merge commit, GitHub-hosted builder, `workflow_dispatch`, and the exact run/attempt URL.
- [ ] AC-08: Any pre-existing version, tuple/SHA/input drift, failed/cancelled/timed-out workflow, ambiguous dispatch/result, registry mismatch, missing/invalid attestation, or propagation gap blocks after read-only resolution with no second external mutation; an already-completed exact authorized run may be verified idempotently without rerun.
- [ ] AC-09: README and SPEC truthfully identify public `kyw-dev@0.1.2` under `latest`, OIDC GitHub Actions publication, and provenance while preserving separate authority for future versions/tags/Releases/submissions; permanent-document delta evidence is exact.
- [ ] AC-10: Focused registry/provenance/document regressions and all four stable commands pass; final scope maps every change, both delivered predecessors and all earlier terminal pairs remain byte-immutable, transaction state is clean, and `STANDARD` exact-head delivery remains required for the post-publication truth.

## Plan

- [ ] Revalidate dependency delivery/merge SHA, aligned main, clean worktree, workflow/publisher tuple, GitHub access, package identity, registry history/latest, and exact `0.1.2` absence.
- [ ] Capture a pre-dispatch evidence snapshot and bind exactly one authorized `publish.yml` dispatch to `main`, dependency SHA, and `0.1.2`.
- [ ] Dispatch once, resolve the resulting run without ambiguity, and observe it read-only to terminal status without rerun or retry.
- [ ] Collect exact workflow/run/job/log/candidate/publish evidence and reconcile any failed or ambiguous response before further action.
- [ ] Verify canonical registry identity, versions/dist-tags, signatures, downloaded bytes, archive contents, and isolated CLI behavior against workflow evidence.
- [ ] Fetch and cryptographically verify the attestation bundle; decode and compare package digest, repository, workflow, ref, commit, builder, event, and invocation identities.
- [ ] Synchronize README/SPEC and exact retained-baseline permanent-document deltas only after registry/provenance proof is complete.
- [ ] Run focused and stable verification, final external/scope/immutability review, pair/queue/transaction validation, and enter honest terminal or blocked state.
- [ ] Complete the separate `STANDARD` delivery gate for the post-publication truth without another publication-side mutation.

## Decisions

- Authorize exactly one future workflow dispatch and its workflow-contained exactly one `npm publish` of `0.1.2`, only after every preflight gate passes. Authoring itself grants no immediate trigger and performs no publication action.
- Hard-depend on the delivered `0.1.2` preparation Task; the provenance source and workflow checkout must be that Task's exact evaluator-complete merge SHA on `main`.
- Use the GitHub workflow as the sole publication actuator. The executor may run npm only for read-only registry queries, signature verification, isolated installation, and local non-publishing checks.
- Accept the normal `latest` assignment produced by the one `npm publish`; do not run a separate dist-tag command.
- Treat the dispatch call as non-repeatable. If its response is lost or ambiguous, search by exact workflow/event/SHA/time and inspect registry state; do not issue another dispatch without separate explicit authority.
- If `0.1.2` exists before dispatch, pass only when retained evidence proves it came from the already-authorized exact run/SHA and every byte/provenance field matches; otherwise block because the requested workflow publication cannot be safely replayed or repaired.
- Use registry API metadata and downloaded bytes as canonical package evidence, the attestation endpoint plus current `npm audit signatures` as cryptographic evidence, and GitHub API/CLI run/job/log objects as canonical workflow evidence.
- Record sanitized identities and digests only; never retain an npm auth-session URL, OTP, cookie, token, OIDC JWT, raw credential-bearing environment, or unbounded log.
- Keep delivery `STANDARD` because post-publication truth and immutable predecessor bindings must reach the exact GitHub ledger even though publication itself is a separately authorized external action.

## Risks

- Registry publication is immutable. A wrong candidate, occupied `0.1.2`, or source/provenance mismatch cannot be fixed in place.
- The dispatch request can time out after GitHub accepts it. Retrying would risk two workflow runs; exact read-only correlation must resolve the state first.
- A workflow failure after npm accepts the package can leave GitHub conclusion and registry state apparently inconsistent; registry and run evidence must be reconciled without rerun.
- npm metadata, tarball, dist-tag, and attestations may propagate at different speeds. Bounded read-only observation may be needed, but absence after the allowed window blocks rather than triggering publication again.
- Provenance asserts source/build identity, not benign code. Cryptographic verification and exact field comparison supplement, rather than replace, candidate inspection and acceptance tests.
- Updating Task/Test or documents after publication cannot change packed inputs. Any unexpected package-input diff invalidates the exact-source contract and blocks delivery.
- Exact GitHub logs or npm attestation schemas may evolve; missing required fields or unverifiable signatures are blocked evidence, not grounds to weaken acceptance.

## Discoveries and Changes

- At authoring, `kyw-dev@0.1.2` is absent, public versions are `0.1.0` and `0.1.1`, and `latest` is `0.1.1`; this Task must revalidate those facts immediately before dispatch.
- The current `0.1.1` release was published interactively as user `kimyw`, has no `gitHead` or Sigstore attestation, and therefore does not satisfy this Task's OIDC/provenance goal.
- Public npm metadata for an OIDC-published package exposes `_npmUser` as `GitHub Actions` with a GitHub trusted-publisher marker, `gitHead`, `dist.attestations.url`, provenance predicate type, registry signatures, and the normal integrity/shasum/tarball fields.
- An npm attestation bundle contains separate publish and SLSA provenance statements. The decoded provenance includes package subject/SHA-512, workflow repository/path/ref, resolved Git commit, GitHub event, hosted builder, and run-attempt invocation URL.
- Official npm documentation states that supported GitHub Actions trusted publishing automatically creates provenance for a public package from a public repository, without `--provenance`, when the workflow has `id-token: write` and supported Node/npm versions.
- GitHub manual dispatch requires the workflow on the default branch and supports an explicit branch ref and inputs; the hardened predecessor additionally restricts execution to exact `main` and expected SHA.
- This Task must follow the preparation Task rather than combining version bump and publication: a main-only provenance SHA and post-publication Task/Test evidence cannot both be truthful under one first-delivery immutable pair.

## Documentation Impact

- SPEC: Change canonical public registry/latest state to `0.1.2`, record GitHub Actions OIDC/trusted-publisher and provenance behavior, and preserve separate authority for every future external action.
- ARCHITECTURE: Expected unchanged — the predecessor owns the durable OIDC workflow, exact-candidate, and attestation flow; update only if observed production behavior requires a durable correction.
- README: Change current public npm release/latest to `0.1.2`, state trusted-publishing/provenance truth concisely, and keep install/npx and separate tag/Release/plugin-submission state accurate.
- AGENTS: Unchanged — existing publication authority, evidence honesty, continuity, and terminal immutability rules remain authoritative.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
- External release authority: exactly one `publish.yml` workflow dispatch on `main` for the exact dependency identity supplied as the expected-SHA input and `0.1.2`, allowing that run's exactly one OIDC `npm publish`; any second dispatch, rerun, retry, other version, direct publish, independent dist-tag, tag, Release, or submission requires separate authority.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Revalidate all irreversible-action gates, dispatch exactly once, prove GitHub/registry/bytes/dist-tags/provenance, synchronize post-publication truth, complete verification, and pass `STANDARD` delivery without another external mutation.

## Resume Point

- After dependency selection succeeds, resolve its exact merge SHA and compare aligned main, `publish.yml`, package/plugin `0.1.2`, authenticated publisher tuple, registry versions/latest, and `0.1.2` absence before constructing the one dispatch command.

## Blockers

- Not applicable — no blocker is known. Any dependency, publisher, main/SHA, version-absence, workflow, authentication, run, registry, integrity, dist-tag, or provenance mismatch must become a recorded blocker and does not authorize retry or repair.
