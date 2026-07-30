# TASK 0066 — Publish and Prove kyw-dev 0.1.2 through npm OIDC

<!-- kyw-task-contract: 3 -->

## Status

BLOCKED

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

- [x] AC-01: Preflight binds aligned `main`, the evaluator-complete release-preparation merge SHA, unchanged trusted workflow/publisher tuple, exact package/plugin `0.1.2`, expected owners/maintainers, historical registry/latest state, and absent `0.1.2` before external mutation.
- [x] AC-02: Exactly one authorized `workflow_dispatch` targets `publish.yml` on `main` with the dependency merge SHA and version `0.1.2`; no direct publish, second dispatch, rerun, retry, token, OTP, fallback, independent dist-tag, tag, or Release command occurs.
- [x] AC-03: One attempt of the exact workflow/run/job graph succeeds on the dependency SHA and records exact event/ref/checkout, runner/Node/npm, candidate metadata, absence preflight, and one OIDC publication command with bounded auditable logs.
- [ ] AC-04: Canonical registry metadata identifies `kyw-dev@0.1.2`, exact `gitHead` and repository, maintainer `kimyw`, publisher `GitHub Actions` with npm's GitHub trusted-publisher marker, expected registry signatures, and no traditional human/token publisher identity.
- [x] AC-05: Registry integrity, shasum, downloaded tarball SHA-256/size, file count, unpacked size, package/plugin manifests, README, legal bytes, allowlist, dependency/lifecycle absence, and isolated CLI output exactly match the workflow's verified candidate.
- [x] AC-06: `latest` resolves to `0.1.2`, public versions retain `0.1.0`, `0.1.1`, and `0.1.2`, and read-only evidence finds no independent dist-tag mutation, deprecation, unpublish, Git tag, GitHub Release, or public plugin submission.
- [x] AC-07: npm signature verification passes and the public SLSA provenance attestation binds `pkg:npm/kyw-dev@0.1.2` and its SHA-512 to `https://github.com/kimyeongwoo/kyw-dev`, `.github/workflows/publish.yml`, `refs/heads/main`, the dependency merge commit, GitHub-hosted builder, `workflow_dispatch`, and the exact run/attempt URL.
- [x] AC-08: Any pre-existing version, tuple/SHA/input drift, failed/cancelled/timed-out workflow, ambiguous dispatch/result, registry mismatch, missing/invalid attestation, or propagation gap blocks after read-only resolution with no second external mutation; an already-completed exact authorized run may be verified idempotently without rerun.
- [x] AC-09: README and SPEC truthfully identify public `kyw-dev@0.1.2` under `latest`, OIDC GitHub Actions publication, and provenance while preserving separate authority for future versions/tags/Releases/submissions; permanent-document delta evidence is exact.
- [ ] AC-10: Focused registry/provenance/document regressions and all four stable commands pass; final scope maps every change, both delivered predecessors and all earlier terminal pairs remain byte-immutable, transaction state is clean, and `STANDARD` exact-head delivery remains required for the post-publication truth.

## Plan

- [x] Revalidate dependency delivery/merge SHA, aligned main, clean worktree, workflow/publisher tuple, GitHub access, package identity, registry history/latest, and exact `0.1.2` absence.
- [x] Capture a pre-dispatch evidence snapshot and bind exactly one authorized `publish.yml` dispatch to `main`, dependency SHA, and `0.1.2`.
- [x] Dispatch once, resolve the resulting run without ambiguity, and observe it read-only to terminal status without rerun or retry.
- [x] Collect exact workflow/run/job/log/candidate/publish evidence and reconcile any failed or ambiguous response before further action.
- [x] Verify canonical registry identity, versions/dist-tags, signatures, downloaded bytes, archive contents, and isolated CLI behavior against workflow evidence; retain the missing-`gitHead` mismatch as a blocker.
- [x] Fetch and cryptographically verify the attestation bundle; decode and compare package digest, repository, workflow, ref, commit, builder, event, and invocation identities.
- [x] Synchronize README/SPEC and exact retained-baseline permanent-document deltas only after registry/provenance proof is complete.
- [x] Run focused and stable verification, final external/scope/immutability review, pair/queue/transaction validation, and enter honest terminal or blocked state.
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
- Public npm metadata for this OIDC-published tarball exposes `_npmUser` as `GitHub Actions` with a GitHub trusted-publisher marker, `dist.attestations.url`, provenance predicate type, registry signatures, and the normal integrity/shasum/tarball fields, but it does not expose `gitHead`.
- An npm attestation bundle contains separate publish and SLSA provenance statements. The decoded provenance includes package subject/SHA-512, workflow repository/path/ref, resolved Git commit, GitHub event, hosted builder, and run-attempt invocation URL.
- Official npm documentation states that supported GitHub Actions trusted publishing automatically creates provenance for a public package from a public repository, without `--provenance`, when the workflow has `id-token: write` and supported Node/npm versions.
- GitHub manual dispatch requires the workflow on the default branch and supports an explicit branch ref and inputs; the hardened predecessor additionally restricts execution to exact `main` and expected SHA.
- This Task must follow the preparation Task rather than combining version bump and publication: a main-only provenance SHA and post-publication Task/Test evidence cannot both be truthful under one first-delivery immutable pair.
- Implementation began on 2026-07-30 from clean aligned `main` at `60b3270e679bb9794de8c1fd40be3286cfd73dda`. The selected and dependency pairs validate, Task transaction inspection reports `NONE / NO_TRANSACTION_EVIDENCE`, and no pre-existing worktree change was present.
- The sole packaged dispatcher call for `$kyw-impl 0066` selected Task `0066` for `IMPLEMENT`, classified Tasks `0030`–`0064` as durable continuity, freshly evaluated Task `0065` as `HARDENED_EXACT_HEAD`, and prepared one opaque causal continuity transition without retry or manual delivery input.
- The Task `0065` continuity transition was applied exactly once on the selected branch and advanced the bounded checkpoint through Task `0065` at digest `55834a385fa8cc32d3c61dc5f4f645b6b5d81989b6eff1d11960758e974e3717`.
- Execution-time Git and GitHub reads align local/cached/direct/GitHub `main` at dependency merge `60b3270e679bb9794de8c1fd40be3286cfd73dda`. Local, dependency-main, and GitHub workflow blobs all equal `74c393fa6e342b7cd1db2ef99489d6e7cc465533`; the active workflow ID is `323508270` and it has no run history.
- A local dry-run package projection is byte-metadata identical to Task `0065`: 43 files, 128,987 packed bytes / 586,333 unpacked bytes, integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==`, and shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`; every packed input and the workflow are unchanged from the dependency SHA.
- Canonical registry reads list only `0.1.0` and `0.1.1`, keep only `latest=0.1.1`, show maintainer `kimyw`, show no deprecation, and return HTTP `404` for `0.1.2`. Authenticated npm reads identify `kimyw` as owner and public package access.
- Non-interactive `npm trust list` returned `EOTP` without trusted-publisher settings. Its one Task-created debug log was immediately cleared to zero bytes because the failure material can contain an ephemeral authentication URL; the existing Chrome session is awaiting security-key reauthentication before the tuple can be revalidated read-only.
- The authored planned `gh workflow run` example named a nonexistent `version` input. The delivered workflow's exact input is `expected_version`; the current Test command plan is corrected before any dispatch, with no external mutation having occurred.
- The first focused preflight command passed 55/55 tests. A read-only GitHub environment metadata probe returned `404`; no environment setting or repository state was changed, and workflow/publisher tuple validation remains authoritative.
- Current official npm requirements still set the trusted-publishing minimum at Node.js `22.14.0` and npm `11.5.1`, with automatic provenance for a public package published from a public repository through GitHub Actions OIDC. The workflow's Node `24.x` setup and runtime minimum guards match that contract.
- The registry currently marks npm `12.0.2` as `latest`; use that exact current CLI in fresh owned state for post-publication signature and attestation verification rather than treating local npm `11.18.0` as current.
- The user completed npm security-key reauthentication on resume. The authenticated settings edit surface proved provider `GitHub Actions`, organization/user `kimyeongwoo`, repository `kyw-dev`, workflow `publish.yml`, environment `npm-production`, allowed action `npm publish`, disallowed `npm stage publish`, public package access, the most restrictive publishing-access option, and sole maintainer `kimyw` with write access. The edit was cancelled without saving.
- The final irreversible-action preflight passed at `2026-07-30T09:20:36.5659458Z`: every local/cached/direct/GitHub main identity equaled `60b3270e679bb9794de8c1fd40be3286cfd73dda`, workflow ID/blob remained `323508270` / `74c393fa6e342b7cd1db2ef99489d6e7cc465533`, the 43-file candidate remained 128,987 bytes with exact integrity/shasum, authenticated identities/access matched, registry `0.1.2` returned `404`, and publish-run count was zero.
- Exactly one `gh workflow run publish.yml` command began at `2026-07-30T09:20:36.5901302Z`, exited zero at `2026-07-30T09:20:38.5912787Z`, and returned run `30530304990`. Read-only resolution binds it to workflow ID `323508270`, event `workflow_dispatch`, branch `main`, head SHA `60b3270e679bb9794de8c1fd40be3286cfd73dda`, attempt `1`, and creation `2026-07-30T09:20:38Z`; it is the sole matching run.
- Run `30530304990` completed successfully at `2026-07-30T09:21:18Z`. Its sole job `90830809454` succeeded on GitHub-hosted `ubuntu-latest`; every guard, checkout, stable-gate, candidate, absence, publish, and cleanup step succeeded. Bounded logs contain four sanitized `KYWPUBLISHEVIDENCE` records, one successful `npm publish` result, and no retry, token, OTP, fallback, or alternate mutation.
- The workflow candidate evidence is exact: `kyw-dev-0.1.2.tgz`, 43 files, 128,987 packed bytes, integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==`, shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`, and SHA-256 `b1dd93882aa94c7839a904a47e7175f55838003bb31c4e65bc61572715f78392`. Its Stable gate passed 395 tests with 391 pass / 4 intentional skips / zero failures, 82 linted modules, 338 formatted files, and the exact 43-file pack projection.
- Canonical registry state now contains `0.1.0`, `0.1.1`, and `0.1.2`, with only `latest=0.1.2` and no deprecation. Version `0.1.2` reports repository `git+https://github.com/kimyeongwoo/kyw-dev.git`, maintainer `kimyw`, `_npmUser` `GitHub Actions` with GitHub trusted-publisher marker, one registry signature, the exact candidate integrity/shasum/file count/unpacked size, and a SLSA provenance attestation URL.
- A fresh public tarball download was byte-identical to the workflow candidate: 128,987 bytes, exact SHA-1/SHA-256/SHA-512, 43-entry allowlist, exact package/plugin `0.1.2` manifests, source-matching README and legal files, no dependencies or lifecycle scripts, and isolated exact-version CLI output `0.1.2`.
- The attestation endpoint returned separate npm publish and SLSA provenance statements. Decoded DSSE payloads bind `pkg:npm/kyw-dev@0.1.2` and exact SHA-512 hex `3fb8ba72f09098d21bcf76e00794ca219a6dd3f439e60aa51e3cd1f6197aad69ca0a38d97967bbbae3e2b0108aedce4f27aaa1e9ce8c0ed7805b0e840de7001e` to repository `https://github.com/kimyeongwoo/kyw-dev`, workflow `.github/workflows/publish.yml`, `refs/heads/main`, commit `60b3270e679bb9794de8c1fd40be3286cfd73dda`, event `workflow_dispatch`, the GitHub-hosted builder, and run/attempt `30530304990/1`.
- Current npm `12.0.2` signature verification passed with the official Node.js `24.18.0` Windows binary after its archive matched the published Node SHASUMS256 value `0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821`; it verified one package and both attestation bundles with zero invalid or missing signatures. An earlier run under local Node `24.11.0` also exited zero but emitted an engine warning, and an attempted lifecycle-disabled `node@24.18.0` package install did not provide a runnable binary; neither diagnostic was accepted as the final proof.
- Cache-bypassed registry reads at `2026-07-30T09:31:57.0447391Z` prove that both canonical version and root metadata omit `gitHead`, and `npm view kyw-dev@0.1.2 gitHead` is empty. Local npm CLI source inspection explains that directory publication populates `gitHead` during package preparation while tarball publication resolves an existing manifest without injecting it. Because the authorized immutable object was intentionally published from the retained tarball, AC-04 cannot be satisfied in place or repaired by retry.

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

- Loaded and reconciled the applicable repository rules, complete implementation procedure, Task `0066` pair, and delivered Task `0065` pair.
- Validated the selected/dependency pairs, transaction state, clean worktree, and exact local/direct/GitHub `main` alignment through the packaged dispatcher.
- Created branch `task/0066-publish-and-prove-kyw-dev-0-1-2-through-npm-oidc` from exact aligned `main` and entered `IN_PROGRESS/RUNNING`.
- Applied the Task `0065` continuity transition exactly once and revalidated the active pair.
- Indexed and read the targeted README, SPEC, and architecture owner sections; inspected the delivered workflow, package/plugin identities, and candidate helper boundary.
- Proved exact dependency/main/workflow alignment, zero packed-input drift, candidate metadata parity, authenticated owner/public access, target-version absence, expected registry history/latest, and empty workflow/tag/Release histories.
- Ran the first focused preflight suite at 55/55 and preserved the read-only GitHub environment metadata `404` diagnostic.
- Checkpointed `BLOCKED/BLOCKED` with a valid pair, clean Task transaction state, zero publish-workflow runs, registry `404` for `0.1.2`, a zero-byte Task-created npm diagnostic, and no publication-side mutation.
- Resumed after user security-key authentication, verified the exact trusted-publisher/access/maintainer tuple read-only, and cancelled the edit surface without saving.
- Repeated the complete immediate preflight, then issued the sole authorized workflow dispatch for exact main SHA/version and resolved the one returned run without ambiguity.
- Observed the sole run to successful terminal status and retained bounded exact run/job/log/candidate/publication evidence.
- Proved public registry history/latest, OIDC publisher identity, candidate-byte parity, archive safety, isolated CLI behavior, registry signature, and exact SLSA provenance.
- Rechecked the immutable registry object cache-bypassed and identified the sole acceptance mismatch: canonical metadata omits required `gitHead`; no retry, rerun, direct publish, or repair mutation was attempted.
- Synchronized README/SPEC and their deterministic projections to the observed public release, `latest`, OIDC/provenance, missing-`gitHead`, install-command, and separate-authority truth. Exact permanent-document delta evidence passes with README +310 bytes, SPEC +421 bytes, AGENTS/architecture unchanged, and combined +731 bytes from Task `0065`.
- The post-document focused suite first failed 4/55 only because current delta evidence was not yet present and SPEC leaked a full Git SHA; after recording the table and retaining exact-commit meaning without the hash, it passed 55/55.
- All four stable commands passed: `npm test` at 393 tests / 390 pass / 3 skips / zero failures, lint at 82 modules, format check at 338 files, and pack check at 43 files / 129,110 bytes. The changed packed size reflects only post-publication README truth and does not alter the already-published 128,987-byte tarball.
- Final cache-bypassed proof at `2026-07-30T09:42:24.5621880Z` finds exactly one workflow run and attempt, one job, successful exact SHA/event/branch, versions `0.1.0`–`0.1.2`, `latest=0.1.2`, no deprecation, OIDC identity/signature/integrity unchanged, missing `gitHead` unchanged, and zero local/remote tags or GitHub Releases.
- Final scope/immutability inspection found only README, SPEC, the exactly-once continuity transition, the active pair, and its instruction-surface test changed. All 130 earlier Task/Test files equal `main`; Task `0064`/`0065` predecessor blobs match exactly, transaction state is `NONE / NO_TRANSACTION_EVIDENCE`, pair validation and `git diff --check` pass, and verification planning selects `STABLE`.

## Remaining

- No authorized in-place work remains. AC-04 and therefore AC-10/`STANDARD` delivery remain incomplete; recovery requires a separately authorized hard-dependent correction outcome/version rather than mutation or replay of `0.1.2`.

## Resume Point

- Do not resume this Task by dispatching, rerunning, retrying, publishing, mutating dist-tags, tagging, or creating a Release. If separately authorized, author a new hard-dependent correction Task whose preflight proves the chosen publication path supplies required source metadata before any new external mutation.

## Blockers

- Canonical npm registry metadata for immutable `kyw-dev@0.1.2` omits `gitHead`, so AC-04 is unmet even though OIDC identity, bytes, signatures, and provenance are exact. The current Task cannot repair or replay that version.
- Recovery requires separate explicit scope for a hard-dependent correction outcome/version and a publication design that can prove the required source metadata before any new external mutation. This Task does not allocate or authorize that work.
