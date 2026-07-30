# TASK 0064 — Harden the npm OIDC Trusted Publishing Workflow

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Introduce and deliver a manual-only, fail-closed `.github/workflows/publish.yml` that uses npm OIDC Trusted Publishing for `kyw-dev`, exactly matches the package's configured GitHub Actions trusted-publisher identity, publishes one already-verified tarball without a long-lived npm token or interactive OTP, and cannot publish merely because this Task is implemented or merged.

## Dependencies

- Task 0063.

## In Scope

- Read the authenticated npm trusted-publisher configuration without changing it, and record the case-sensitive provider, organization/user, repository, workflow filename, optional environment, allowed actions, and package publishing-access posture needed to evaluate this workflow.
- Require the configured publisher to identify GitHub Actions, repository `kimyeongwoo/kyw-dev`, workflow filename `publish.yml`, and permission for `npm publish`; mirror the configured optional environment exactly, and block without editing npm settings if any required field is absent or inconsistent.
- Add `.github/workflows/publish.yml` as a manual `workflow_dispatch` workflow only. It must accept an exact expected source SHA and expected package version, require the default `main` ref, and prove the event, repository, ref, checkout, package/plugin identity, and input values before any publication step.
- Use a GitHub-hosted runner, least-privilege `contents: read` and `id-token: write` permissions, immutable Action commit identities, disabled checkout credential persistence, disabled package-manager caching, bounded timeouts, non-cancelling publication concurrency, and no npm token, write secret, or interactive authentication path.
- Extend the existing packed-release verifier with the smallest dependency-free, machine-readable retained-candidate mode needed to create one owned tarball, verify its exact allowlist, hygiene, legal bytes, manifests, CLI smoke, size, integrity, shasum, and SHA-256, and pass that exact absolute tarball path to one `npm publish` invocation. Preserve the current disposable `npm run release:candidate` behavior.
- Make the workflow run the stable repository gate, enforce Node.js and npm Trusted Publishing minimums, verify the target version is absent immediately before mutation, publish no more than once, emit bounded candidate and exact-SHA evidence, and fail closed on mismatch, existing version, auth failure, ambiguous outcome, or any attempted retry.
- Add deterministic workflow, candidate-helper, verification-planner, foundation, and instruction-surface coverage for every trigger, permission, identity, version, candidate, token, retry, concurrency, and failure guard.
- Synchronize affected README, SPEC, and architecture truth without weakening the existing credential-free `ci.yml`, Task/Test ownership, continuity, terminal immutability, publication authority, or public-package boundaries.
- Run focused workflow/release checks, the four stable commands, the planner-selected Release checks, final diff coverage, Task-pair validation, transaction inspection, and `STANDARD` exact-head delivery.

## Out of Scope

- Dispatching or otherwise running `publish.yml`, calling a mutating `npm publish`, changing an npm dist-tag, or proving a new registry version.
- Bumping `package.json`, `.codex-plugin/plugin.json`, or any current version owner from `0.1.1`.
- Editing the npm trusted-publisher configuration, package publishing-access policy, account 2FA/security settings, tokens, owners, maintainers, or repository settings.
- Adding an automatic push, tag, Release, schedule, `workflow_run`, or reusable-workflow publication trigger.
- Creating a Git tag, GitHub Release, public plugin submission, credential, long-lived npm token, production dependency, lockfile, or npm lifecycle publication hook.
- Editing or reterminalizing Task `0063` or any earlier Task/Test pair, changing `ci.yml` behavior beyond compatibility assertions, rerunning workflows, bypassing gates, deleting branches, or unrelated cleanup.
- Implementing either dependent `0.1.2` Task.

## Acceptance Criteria

- [x] AC-01: Authenticated read-only evidence records the configured npm publisher's exact case-sensitive provider/repository/workflow/environment/allowed-action tuple, and the workflow matches it without changing npm or account settings.
- [x] AC-02: `.github/workflows/publish.yml` is manual-only, exists under the trusted filename, has no automatic trigger, and cannot run from a non-`main` ref or a mismatched repository, event, expected SHA, checkout SHA, package version, or plugin version.
- [x] AC-03: The publishing job uses a supported GitHub-hosted runner, bounded timeouts, non-cancelling serialization, immutable Action SHAs, `contents: read`, `id-token: write`, disabled persisted Git credentials/cache, and no `NODE_AUTH_TOKEN`, npm token secret, interactive OTP, or broader permission.
- [x] AC-04: One dependency-free retained-candidate path packs exactly once into an owned safe directory, validates the existing package contract, emits bounded machine-readable filename/size/integrity/shasum/SHA-256 evidence, and preserves current disposable candidate behavior and cleanup.
- [x] AC-05: The workflow runs stable and exact-candidate checks, enforces supported Node/npm versions, proves `0.1.2`-style input identity and registry absence immediately before mutation, then contains exactly one publish command for the exact verified tarball and no retry, fallback token, independent dist-tag, tag, or Release action.
- [x] AC-06: Failure coverage proves wrong tuple/environment, trigger/ref/SHA/version, unsafe candidate path, stale or occupied version, missing OIDC permission, token reference, duplicate publish, retry, and ambiguous outcome all stop closed before an additional external mutation.
- [x] AC-07: Existing `.github/workflows/ci.yml`, exact-head `STANDARD` roles, required job names, package boundary, no-dependency/no-lifecycle contracts, and release commands remain compatible.
- [x] AC-08: README, SPEC, and ARCHITECTURE distinguish credential-free CI, manual OIDC publication, automatic provenance, and separate publication authority; AGENTS remains unchanged unless implementation discovers a repository-wide rule conflict.
- [x] AC-09: Focused workflow/release regressions, the exact verification plan, all four stable commands, and the required non-publishing Release checks pass with exact recorded results and permanent-document delta evidence.
- [x] AC-10: Final review maps every changed path, preserves Task `0063` and all earlier terminal pairs byte-for-byte, finds no workflow run or registry/version/tag/Release/public-submission mutation from this Task, leaves no Task transaction residue, and retains `STANDARD` delivery so the next Task is ineligible until this outcome is merged with hardened exact-SHA evidence.

## Plan

- [x] Revalidate aligned `main`, Task `0063` delivery, queue/transaction state, current registry versions, existing CI/action pins, and the package's authenticated trusted-publisher tuple.
- [x] Design the manual dispatch inputs, main/SHA/version gates, optional environment projection, permissions, concurrency, evidence line, and single-publication failure behavior.
- [x] Add the smallest retained-candidate mode to the existing pack verifier and cover safe output, exact metadata, cleanup, and compatibility branches.
- [x] Add `publish.yml` with immutable external actions, supported runtime/npm checks, stable verification, exact candidate preparation, registry-absence preflight, and one OIDC-backed tarball publication command.
- [x] Add focused static/behavioral tests and update release-path classification or owner projections only where required.
- [x] Synchronize affected permanent-document owners and record exact retained-baseline byte/line deltas for all four permanent documents plus the combined total.
- [x] Run focused tests, planner-selected Release verification, the four stable commands, non-publishing candidate/isolation checks, diff/immutability review, pair validation, and transaction inspection.
- [x] Enter honest repository terminal state without dispatching the workflow or mutating npm, then complete the separate `STANDARD` delivery gate.

## Decisions

- Use three serial Tasks. A trusted workflow must first be delivered to the default branch; an exact `0.1.2` source candidate must then be delivered at its own immutable main SHA; only a later Task may dispatch that SHA and record post-publication evidence without rewriting either delivered predecessor.
- Hard-depend on delivered Task `0063` because this is a forward release-process addition after the manual `0.1.1` publication, and the prior contract-3 pair remains byte-immutable.
- Treat npm's authenticated trusted-publisher record as canonical for the optional environment and allowed action. The known repository identity is `kimyeongwoo/kyw-dev` and the required trusted filename is `publish.yml`; any mismatch blocks rather than authorizing a configuration edit.
- Use `workflow_dispatch` only and require exact `main` event SHA plus explicit expected version. Merging this workflow must never publish.
- Publish the exact once-packed, fully verified tarball by absolute path. A second implicit pack from the working tree is not sufficient for the hardened integrity contract.
- Reuse the current immutable `actions/checkout` and `actions/setup-node` identities unless implementation proves an update is required and verifies the replacement digest; do not introduce another Action when shell/Node code already owns the check.
- Keep `.github/workflows/ci.yml` credential-free and unchanged in behavior. The separate publishing workflow alone receives job-scoped OIDC permission.
- Keep delivery `STANDARD`; static repository acceptance does not pre-claim the later merge or any publication run.

## Risks

- npm does not validate a trusted-publisher tuple when it is saved; a case, filename, repository, environment, or allowed-action mismatch may remain latent until publication unless read-only preflight captures it exactly.
- Authenticated trusted-publisher inspection may require proof of presence. That read-only access must not leak or retain an auth URL, OTP, security-key response, cookie, or token.
- `id-token: write` is powerful within the job. Any automatic trigger, broad environment, reusable indirection, or step injection could widen publication authority.
- A helper that retains a tarball can weaken existing temporary-directory cleanup or expose archives outside owned state unless containment and identity checks fail closed.
- A registry check and publish are not atomic. If another actor occupies the version after preflight, the sole publish must fail and the workflow must not retry or mutate a tag.
- Static YAML assertions can miss GitHub interpretation errors; deterministic tests, GitHub workflow registration after merge, and the later first real run are distinct evidence boundaries.
- Permanent-document growth and release-policy projections can drift if detailed workflow procedure is copied outside its source/tests instead of summarized by the owning sections.

## Discoveries and Changes

- Local `HEAD`, local/cached `main`, direct remote `main`, and GitHub `main` align at `59664f4f02c58e9703776bb8ad9a40a2e658d7d5`; the tracked worktree is clean and only the pre-created Tasks `0064`–`0066` are untracked.
- Task `0063` is `DONE/PASSED`, PR `#51` is merged, its exact PR-head checks passed, and the exact merge SHA has a successful post-main CI run. No selectable active, ready, or draft pair and no Task creation transaction exists.
- `.github/workflows/` currently contains only credential-free `ci.yml`; there is no publishing workflow and no workflow was triggered during authoring.
- `package.json` and plugin metadata are `0.1.1`, the repository has no dependency fields or lockfile, and current release verification owns disposable real-tarball validation but not a retained workflow candidate.
- The public registry currently lists `0.1.0` and `0.1.1`, `latest` is `0.1.1`, and `kyw-dev@0.1.2` returns `E404`.
- Current npm documentation requires npm CLI `11.5.1` or later and Node.js `22.14.0` or later for Trusted Publishing, a GitHub-hosted runner, `id-token: write`, exact case-sensitive publisher fields, and an exact repository URL. GitHub Actions and GitLab trusted publishes of public packages from public repositories automatically create provenance attestations.
- Current npm publisher fields are organization/user, repository, workflow filename, optional environment, and allowed actions; the workflow filename is only `publish.yml`, not the full `.github/workflows/` path.
- Local npm `11.18.0` exposes `npm trust list kyw-dev --json`, but the authenticated command and npm settings page both required interactive security verification and returned no publisher configuration. Authoring did not continue authentication, retain the issued auth-session URLs, or change external state; implementation must complete a read-only inspection before editing.
- Existing CI pins `actions/checkout` and `actions/setup-node` by full commit SHA, disables persisted checkout credentials and package-manager caching, asserts exact checkout identities, and separates actual PR head, synthetic merge, and post-main evidence.
- Implementation began on 2026-07-30 after the selected/dependency pairs validated, Task transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, the only worktree paths were the pre-created Tasks `0064`–`0066`, and local `HEAD`, local/cached/direct/GitHub `main` all aligned at `59664f4f02c58e9703776bb8ad9a40a2e658d7d5`.
- The sole packaged dispatcher call for `$kyw-impl 0064` selected Task `0064` for `IMPLEMENT`, classified Tasks `0030`–`0062` as durable continuity and Task `0063` as fresh `HARDENED_EXACT_HEAD`, and prepared one opaque causal continuity transition without retry or manual delivery input.
- The opaque transition was applied exactly once on the selected active branch; the rolling checkpoint now covers Task `0063` at digest `d0b2656132acd9f0f0197c3fbba2efba3aded7cb3a1dcafc0ecfb412ea326e1d`.
- Local runtime inspection found Node.js `24.11.0`, npm `11.18.0`, and authenticated npm identity `kimyw`. Official npm truth still requires Node.js `22.14.0` or later and npm `11.5.1` or later for OIDC publication; the newer `npm trust` management command itself requires npm `11.15.0` or later.
- The non-interactive `npm trust list kyw-dev --json` read stopped with `EOTP` before returning configuration. Its one generated debug log contained authentication-session material and was immediately deleted without reading or retaining that material; no registry or package setting changed.
- Authenticated read-only npm package settings then proved the exact publisher tuple: provider `GitHub Actions`, organization/user `kimyeongwoo`, repository `kyw-dev`, workflow filename `publish.yml`, environment `npm-production`, `npm publish` allowed, and `npm stage publish` not allowed. Package access is `public`, publishing access requires two-factor authentication and disallows bypass-2FA tokens, and the untouched edit view was cancelled without saving.
- The implemented `publish.yml` has only `workflow_dispatch`, two required string inputs, exact repository/main/event/SHA/version guards, job-scoped `contents: read` plus `id-token: write`, the verified `npm-production` environment, immutable existing Action pins, fixed non-cancelling concurrency, zero npm fetch retries, and one exact-tarball publish command followed only by guarded local cleanup.
- The packed-release verifier now exposes a retained JSON candidate and strict cleanup mode over the existing validation path. It creates one physical root under the system temporary boundary, rejects unsafe roots/collisions/malformed reports/unsupported entries, cross-checks npm and actual archive allowlists/digests/package identity, removes extraction state, and preserves the unchanged disposable command result.
- README, SPEC, and architecture now distinguish credential-free CI, manual OIDC publication, automatic public provenance, retained-candidate handoff, and separate authority. AGENTS and `ci.yml` remain byte-unchanged.
- The final 19-path planner selected `RELEASE` and one `npm run release:ci` local command while retaining the existing 11-job PR and 10-job post-main hosted roles. The standalone Stable commands passed 393 tests with 390 passes, three explicit skips, and zero failures; lint covered 82 JavaScript modules, format covered 338 UTF-8/LF files, and package selection covered 43 files / 128,953 bytes.
- `npm run release:ci` repeated the same Stable result and produced the current 43-file / 128,953-byte candidate at SHA-256 `e3287e4de7172f69e1d2f4394e7597865f688eedca714a1c47b4409e9199133d`. The planner did not require `npm run release:check`, so no registry dry-run was added.
- The release-isolation runner completed one `CLEAN` attempt, matched the same candidate bytes, passed all direct and local-marketplace lifecycle steps, preserved the npm userconfig/normal Agents/normal Codex sentinels, and removed its exact owned root. No `kyw-dev-packed-release-*` temporary root remains.
- Final read-only external inspection found registry versions `0.1.0` and `0.1.1`, `latest` at `0.1.1`, and `0.1.2` absent with HTTP 404; no registered or executed `publish.yml` workflow, local/remote Git tag, GitHub Release, or search-indexed public plugin submission was found. No external mutation or workflow dispatch command ran.
- Final immutability review found three earlier contract-3 terminal pairs (`0061`–`0063`) and no tracked Task/Test diff other than the rolling checkpoint; all still match aligned `HEAD`. `AGENTS.md`, `.github/workflows/ci.yml`, `package.json`, and `.codex-plugin/plugin.json` are also byte-unchanged, and no dependency, lifecycle, lockfile, or package-allowlist drift exists.

## Documentation Impact

- SPEC: Add the observable manual OIDC publication contract, tokenless/OTP-free workflow boundary, automatic provenance expectation, and fail-closed authority distinction without changing current public version truth.
- ARCHITECTURE: Add the separate trusted-publishing component/flow, exact publisher identity, job-scoped OIDC permission, retained exact-candidate handoff, and provenance/evidence boundary while preserving credential-free CI.
- README: Add concise maintainer-facing workflow and authority guidance, including that merging or CI success does not publish and that no npm token is required by the publishing job.
- AGENTS: Unchanged — repository-wide selection, publication authority, continuity, immutability, and completion rules already cover this Task.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
- External publication authority: none — this Task must not dispatch the workflow, publish, bump a version, mutate a dist-tag, create a tag or Release, or submit publicly.

## Completed

- Loaded and reconciled the applicable repository instructions, the complete implementation procedure, this Task/Test pair, delivered Task `0063`, and the targeted permanent-document owners.
- Validated the selected/dependency pairs, queue-facing lifecycle, transaction state, clean tracked diff, explained pre-created Task paths, exact local/remote/GitHub `main` alignment, unchanged Task `0063`, and authenticated GitHub access.
- Called the packaged dispatcher exactly once, selected Task `0064` for `IMPLEMENT`, and established branch `task/0064-harden-the-npm-oidc-trusted-publishing-workflow`.
- Applied the one opaque predecessor-continuity transition and revalidated its selected Task, branch, and source-main identities.
- Completed authenticated read-only npm publisher/package-access inspection, recorded only non-secret fields, and left the external configuration unchanged.
- Implemented the manual trusted-publishing workflow, retained-candidate/cleanup modes, foundation/planner ownership, exhaustive mutation and distribution coverage, and affected permanent truth.
- Preserved the first 42/47 focused failure, synchronized the exact permanent-document delta evidence, fixed the uncovered mutation assertion, and passed the corrected focused suite at 47/47.
- Passed current formatting over 338 UTF-8/LF files, lint over 82 JavaScript modules, pair validation, transaction inspection, whitespace review, and the exact 19-path Release plan.
- Passed all four standalone Stable commands, `npm run release:ci`, the one-attempt `CLEAN` isolation lifecycle, current registry/run/tag/Release reads, final scope and immutable-history review, and validation of all three pre-created Task pairs.
- Re-ran the full test suite after the lifecycle transition; terminal `DONE/PASSED` queue and continuity state again passed 393 tests with 390 passes, three explicit skips, and zero failures.
- Entered `DONE/PASSED`; repository acceptance is complete and `STANDARD` remains the separate GitHub exact-head delivery gate.

## Remaining

- None — repository outcome complete; external `STANDARD` delivery remains the separate queue gate.

## Resume Point

- None — repository outcome complete; continue only through the declared `STANDARD` delivery gate.

## Blockers

- Not applicable — no repository blocker is known. No publication workflow run or registry mutation is authorized or required by this Task.
