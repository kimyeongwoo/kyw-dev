# TASK 0065 — Prepare kyw-dev 0.1.2 on main for OIDC Publication

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Prepare the next unused patch release, `kyw-dev@0.1.2`, as an exact verified source and package candidate, synchronize repository version/candidate truth, and deliver it to `main` with hardened exact-SHA evidence without dispatching the trusted-publishing workflow or mutating the npm registry.

## Dependencies

- Task 0064.

## In Scope

- Revalidate that the trusted-publishing workflow predecessor is evaluator-complete on `main`, unchanged, registered under `.github/workflows/publish.yml`, and still matches the authenticated npm publisher tuple.
- Requery public npm versions and `latest`; require `0.1.2` to remain unused immediately before the version change and before terminalization, and block rather than silently choosing a different patch if the fact changes.
- Update `package.json`, `.codex-plugin/plugin.json`, the CLI/current-version owner projections, installer diagnostics, release metadata, and current non-historical assertions from `0.1.1` to `0.1.2`.
- Keep repository and packed README/SPEC truth explicit that source/package metadata is the `0.1.2` release candidate while public npm `latest` remains `0.1.1` until the dependent publication Task succeeds.
- Preserve historical `0.1.0` and `0.1.1` evidence, registry availability, and immutable prior Task/Test bytes; do not globally replace historical version text.
- Run focused version, distribution, installation, foundation, instruction, workflow, and release-evidence coverage, followed by the exact verification plan, four stable commands, release candidate/isolation/dry-run gates, and one exact owned candidate inspection.
- Record candidate filename, packed/unpacked size, file count, SHA-256, integrity, shasum, exact allowlist, manifest/plugin identity, README state, dependency/lifecycle absence, and safe cleanup as pre-publication evidence.
- Synchronize affected permanent documents and exact retained-baseline byte/line deltas without claiming that `0.1.2`, provenance, a tag, a Release, or a plugin submission already exists.
- Complete final diff/coverage, pair/queue/transaction validation, prior-task immutability checks, and `STANDARD` delivery so `0.1.2` exists on exact `main` before publication is eligible.

## Out of Scope

- Dispatching `publish.yml`, directly invoking mutating `npm publish`, publishing or staging any version, changing a dist-tag, or verifying `0.1.2` as public.
- Editing the trusted-publisher configuration, workflow permissions/triggers/steps, npm account/package security, owners, maintainers, or tokens.
- Creating a Git tag, GitHub Release, public plugin submission, another package version, production dependency, lockfile, or lifecycle hook.
- Changing runtime behavior, Task dispatch/continuity/immutability semantics, installer architecture, current CI job roles, or release policy.
- Editing or reterminalizing the delivered workflow Task, Task `0063`, or any other existing pair.
- Implementing the dependent publication/provenance Task, rerunning workflows, bypassing gates, deleting branches, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: Read-only preflight proves the delivered trusted workflow/publisher match remains intact, public versions are exactly the expected history, `latest` remains `0.1.1`, and `kyw-dev@0.1.2` is unused before any version edit.
- [x] AC-02: Every current package/plugin/CLI/foundation/installer/release identity owner and non-historical assertion agrees on `0.1.2`, while intentional `0.1.0` and `0.1.1` history remains unchanged.
- [x] AC-03: README and SPEC truthfully distinguish the `0.1.2` source/package candidate from public npm `latest` at `0.1.1`; they make no publication, provenance, tag, Release, or public-submission claim for `0.1.2`.
- [x] AC-04: The exact `0.1.2` candidate retains the positive package allowlist, truthful candidate README, package/plugin parity, legal bytes, CLI behavior, and absence of dependency fields, lockfile, repository-only material, secrets, machine paths, and lifecycle scripts.
- [x] AC-05: Focused version, CLI, distribution, foundation, instruction-surface, release-harness, workflow, and installation regressions pass, including stale-current-version detection and historical-version preservation.
- [x] AC-06: Exact retained-baseline byte/line evidence for README, AGENTS, SPEC, ARCHITECTURE, and their combined total is valid, and document ownership/budget guards pass without unnecessary AGENTS or architecture churn.
- [x] AC-07: The exact planner selects Release; all required stable, candidate, isolated lifecycle, and registry dry-run checks pass without publication; the final candidate metadata and complete inspected inventory are auditable.
- [x] AC-08: `.github/workflows/publish.yml` and its trusted tuple remain unchanged, no workflow run or mutating registry command occurs, `0.1.0` and `0.1.1` remain available, and no independent dist-tag, tag, Release, or public submission is created.
- [x] AC-09: Final scope is fully mapped, the delivered workflow Task and all prior terminal pairs remain byte-immutable, Task transaction state is clean, and this Task retains `STANDARD` so the publication Task cannot dispatch until `0.1.2` is merged and exact post-main evidence is satisfied.

## Plan

- [x] Revalidate dependency delivery, trusted-publisher/workflow identity, aligned main, clean worktree, queue/transaction state, registry history/latest, and `0.1.2` absence.
- [x] Update exact current version owners and tests to `0.1.2` while preserving intentional historical release evidence.
- [x] Synchronize README and SPEC candidate-versus-public truth; change architecture or AGENTS only if their durable meaning actually changes.
- [x] Run focused version/distribution/workflow/install/release regressions and classify every remaining `0.1.1` occurrence by current or historical ownership.
- [x] Run the exact Release plan, four stable commands, candidate, isolation, and registry dry-run gates without triggering publication.
- [x] Pack and inspect one exact owned `0.1.2` candidate; retain bounded metadata evidence and clean only proven Task-owned temporary state.
- [x] Recheck `0.1.2` absence, workflow immutability, prior-pair hashes, full diff/matrix coverage, document deltas, pair validation, and transaction cleanliness.
- [x] Enter honest repository terminal state with `STANDARD` retained as the separate external queue gate, with no registry mutation.

## Decisions

- Use exact patch version `0.1.2`: authoring observed public `0.1.0` and `0.1.1`, `latest` at `0.1.1`, and `E404` for `0.1.2`. If it is occupied at execution, block and require a new explicit contract instead of silently renumbering.
- Keep this release-preparation outcome separate from publication. The trusted workflow is restricted to exact `main`, and contract-3 evidence cannot truthfully record a later registry mutation before the candidate's source SHA is delivered.
- Hard-depend on the workflow Task; dependency satisfaction includes its evaluator-complete `STANDARD` delivery, so preparation cannot start from an unmerged or unregistered workflow.
- Treat `0.1.2` package metadata and public `latest` as separate simultaneous facts during this Task. Documentation must state both without calling the candidate published.
- Use the delivered retained-candidate helper for exact tarball proof, but do not preserve a local archive as publication authority across Tasks; the later workflow must independently create and publish its exact candidate from the delivered main SHA.
- Keep the workflow byte-stable. Any required workflow correction is a new hard-dependent Task, not scope absorbed into this version bump.
- Keep delivery `STANDARD`; the later publication Task depends on the exact merge and post-main result, not merely local candidate success.

## Risks

- `0.1.2` can become occupied between authoring and execution; npm versions are immutable and the Task must not reinterpret “next unused” after its exact contract is published.
- Updating current-version assertions can accidentally rewrite historical `0.1.1` publication evidence or leave one observable surface stale.
- A source version ahead of public `latest` is temporarily intentional but easy to document ambiguously; candidate and registry state must remain explicit until publication succeeds.
- Candidate bytes can drift after inspection if a packed input changes. Final package-input review must follow all edits, and the later workflow must repack from the delivered SHA.
- Registry dry-run or local candidate success does not prove OIDC authentication, provenance, or publication and must not be reported as such.
- `STANDARD` delivery failure after local candidate verification blocks the publication dependency; no workflow dispatch may bypass it.

## Discoveries and Changes

- Authoring baseline is clean aligned `main` at `59664f4f02c58e9703776bb8ad9a40a2e658d7d5`, package/plugin version `0.1.1`, public versions `0.1.0` and `0.1.1`, and `latest` at `0.1.1`.
- Public lookup for `kyw-dev@0.1.2` returns `E404`; therefore `0.1.2` is the exact next unused patch at authoring time.
- The current `0.1.1` registry object has integrity `sha512-9lxVcV+H2vi4ocVezUo/6nqBVlZZEZ8an8BLMSh6+4VF2HUT4TZIZapteK95AMuupIN3StFijUCiRX4tXp4spw==` and shasum `9e6b10f85f34f3d8f5dde8fadcecfa6fa026ae9a`; Task `0063` records the matching frozen SHA-256 and manual, non-provenance publication history.
- Current version owners and known focused coverage are `package.json`, `.codex-plugin/plugin.json`, `README.md`, `docs/SPEC.md`, `scripts/lib/validate-foundation.mjs`, CLI/distribution/foundation/instruction/release-evidence/skill-installation tests, and packed plugin/install projections.
- Architecture currently derives public package, plugin, CLI, and installation identities from one version and does not hard-code `0.1.1`; it should remain unchanged unless the implementation changes durable flow rather than release state.
- The predecessor workflow Task is designed to add a retained exact-candidate mode while preserving disposable release commands and to forbid all publication during its own implementation/delivery.
- Implementation began on 2026-07-30 from clean aligned `main` at `96b1d120f02c518fcb5f550af524ec035711fef6`; the selected and dependency pairs validate, Task transaction inspection reports `NONE / NO_TRANSACTION_EVIDENCE`, and no pre-existing worktree change was present.
- The sole packaged dispatcher call for `$kyw-impl 0065` selected Task `0065` for `IMPLEMENT`, classified Tasks `0030`–`0063` as durable continuity, freshly evaluated Task `0064` as `HARDENED_EXACT_HEAD`, and prepared one opaque causal continuity transition without retry or manual delivery input.
- The continuity checkpoint now covers Task `0064` at digest `c10bd9c40d700f21c34ca55795bed6829e440445c34b14d6603a350f438991dc`; the first local apply command was rejected during CLI argument parsing before token validation or mutation, after which the dispatcher token was passed as one opaque argument and applied exactly once.
- Execution-time npm reads still list only `0.1.0` and `0.1.1`, keep `latest` at `0.1.1`, and return `E404` for `0.1.2`. Authenticated identity remains `kimyw`.
- The registered GitHub `publish.yml`, Task `0064` head, local `main`, and GitHub `main` all resolve to workflow blob `74c393fa6e342b7cd1db2ef99489d6e7cc465533`; the workflow has no run history.
- Non-interactive `npm trust list` again stopped with `EOTP` without returning settings. The authenticated npm package settings instead proved the unchanged tuple: provider `GitHub Actions`, organization/user `kimyeongwoo`, repository `kyw-dev`, workflow `publish.yml`, environment `npm-production`, `npm publish` allowed, and `npm stage publish` disallowed; package access remains public and the untouched edit form was cancelled without saving.
- Current version ownership is intentionally split: source/package/plugin/CLI/install metadata and candidate assertions are `0.1.2`, while public installation commands and registry truth remain at `0.1.1`. No non-Task `0.1.1` occurrence remains outside those public-current meanings.
- The first focused run passed 103 of 109 tests and exposed two stale current-version projections: the foundation README anchor still named `0.1.1`, and one case-sensitive historical-evidence sentence no longer matched. Updating the anchor to `0.1.2` and restoring the stable sentence boundary produced 109/109 focused passes.
- The exact 11-path planner selected `RELEASE`. Standalone Stable checks completed 393 tests with 390 passes, three explicit skips, and zero failures; lint covered 82 modules, format covered 338 files, and package selection covered 43 files / 128,987 bytes.
- `npm run release:ci`, one-attempt `CLEAN` isolation, and `npm run release:check` all passed. The dry-run emitted the same `kyw-dev-0.1.2.tgz` identity without registry mutation.
- The retained exact candidate contains 43 allowlisted files, is 128,987 packed bytes / 586,333 unpacked bytes, and has SHA-256 `b1dd93882aa94c7839a904a47e7175f55838003bb31c4e65bc61572715f78392`, integrity `sha512-P7i6cvCQmNIbz3bgB5TKIZpt0/Q55gqlHjzR9hl6rWnKCjjZeWe7uuPisBCK7c5PJ6qh6c6MDteAWw6EDecAHg==`, and shasum `a54f67a307dae1243c94cd362bbb074b2216db9b`. Independent hashes, manifest parity, README candidate/public truth, dependency/lifecycle absence, and the exact allowlist matched; guarded cleanup returned success and the owned root is absent.
- Final registry reads still list only `0.1.0`/`0.1.1`, keep `latest=0.1.1`, and return `E404` for `0.1.2`. Local/cached/direct/GitHub `main` remain aligned at `96b1d120f02c518fcb5f550af524ec035711fef6`.
- Final GitHub reads find no `publish.yml` run, local/remote tag, or GitHub Release. A first Release-list diagnostic requested one unsupported JSON field and failed read-only; the corrected supported-field query returned an empty list.
- All 128 prior Task/Test files are byte-unchanged from `main`; their path/hash manifest SHA-256 is `5f24152bde7fdb3114aeadca6dd6746243871e350d008cea3357ad683e47d33c`. Only this Task/Test pair differs among numbered pairs.
- Final document measurements exactly match the retained table, Task `0065` and `0066` validate, transaction state is `NONE / NO_TRANSACTION_EVIDENCE`, `git diff --check` passes, and no `kyw-dev-packed-release-*` temporary root remains.
- The terminal-lifecycle `npm test` rerun completed 393 tests with 390 passes, three explicit skips, and zero failures, validating the `DONE/PASSED` queue state before delivery.

## Documentation Impact

- SPEC: Change current package/plugin metadata to `0.1.2` while keeping canonical public registry truth at `0.1.1` and preserving separate publication authority.
- ARCHITECTURE: Expected unchanged — version-independent OIDC, candidate, package, CI, and delivery flows are owned by the predecessor; edit only if implementation changes those durable boundaries.
- README: State that repository/package metadata is the `0.1.2` candidate while `kyw-dev@0.1.1` remains public `latest`, and preserve accurate installation commands.
- AGENTS: Unchanged — repository-wide routing, publication authority, continuity, and immutability rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
- External publication authority: none — this Task may bump repository version owners and run non-publishing checks, but must not dispatch, publish, mutate a dist-tag, tag, Release, or public submission.

## Completed

- Loaded and reconciled the applicable repository rules, complete implementation procedure, Task `0065` pair, delivered Task `0064` pair, and targeted README/SPEC/architecture owner sections.
- Validated the selected/dependency pairs, transaction state, clean worktree, exact local/remote/GitHub `main` alignment, and Task `0064` PR/head/merge/post-main delivery through the packaged dispatcher.
- Created branch `task/0065-prepare-kyw-dev-0-1-2-on-main-for-oidc-e0cb8852` from exact aligned `main` and entered `IN_PROGRESS/RUNNING`.
- Applied the Task `0064` continuity transition exactly once, revalidated current registry/workflow/publisher state without mutation, and preserved the failed pre-application CLI parse attempt as evidence.
- Updated package/plugin/foundation/current installer and release assertions to `0.1.2`, synchronized README/SPEC candidate-versus-public truth, and left architecture and AGENTS unchanged.
- Preserved the initial 103/109 focused failure, corrected the two stale version projections, and passed the focused suite at 109/109.
- Passed the exact Release plan, four standalone Stable commands, `release:ci`, one-attempt `CLEAN` isolation, and registry dry-run without publication.
- Created, independently inspected, and safely cleaned one exact retained `0.1.2` candidate; recorded complete metadata and the 43-file allowlist in TEST.
- Completed final registry/workflow/tag/Release, immutable-history, document-delta, pair, queue-facing, transaction, temporary-state, and full-diff coverage review.
- Entered `DONE/PASSED` and passed the terminal-lifecycle full suite; repository acceptance is complete and `STANDARD` remains the separate external delivery gate.

## Remaining

- None — repository outcome complete; external `STANDARD` delivery remains the separate queue gate.

## Resume Point

- None — repository outcome complete; continue only through the declared `STANDARD` delivery gate.

## Blockers

- Not applicable — no repository blocker is known. Publication remains unauthorized and intentionally absent; only the declared `STANDARD` delivery gate remains.
