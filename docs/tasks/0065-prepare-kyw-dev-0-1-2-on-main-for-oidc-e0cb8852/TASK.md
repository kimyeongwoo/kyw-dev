# TASK 0065 — Prepare kyw-dev 0.1.2 on main for OIDC Publication

<!-- kyw-task-contract: 3 -->

## Status

READY

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

- [ ] AC-01: Read-only preflight proves the delivered trusted workflow/publisher match remains intact, public versions are exactly the expected history, `latest` remains `0.1.1`, and `kyw-dev@0.1.2` is unused before any version edit.
- [ ] AC-02: Every current package/plugin/CLI/foundation/installer/release identity owner and non-historical assertion agrees on `0.1.2`, while intentional `0.1.0` and `0.1.1` history remains unchanged.
- [ ] AC-03: README and SPEC truthfully distinguish the `0.1.2` source/package candidate from public npm `latest` at `0.1.1`; they make no publication, provenance, tag, Release, or public-submission claim for `0.1.2`.
- [ ] AC-04: The exact `0.1.2` candidate retains the positive package allowlist, truthful candidate README, package/plugin parity, legal bytes, CLI behavior, and absence of dependency fields, lockfile, repository-only material, secrets, machine paths, and lifecycle scripts.
- [ ] AC-05: Focused version, CLI, distribution, foundation, instruction-surface, release-harness, workflow, and installation regressions pass, including stale-current-version detection and historical-version preservation.
- [ ] AC-06: Exact retained-baseline byte/line evidence for README, AGENTS, SPEC, ARCHITECTURE, and their combined total is valid, and document ownership/budget guards pass without unnecessary AGENTS or architecture churn.
- [ ] AC-07: The exact planner selects Release; all required stable, candidate, isolated lifecycle, and registry dry-run checks pass without publication; the final candidate metadata and complete inspected inventory are auditable.
- [ ] AC-08: `.github/workflows/publish.yml` and its trusted tuple remain unchanged, no workflow run or mutating registry command occurs, `0.1.0` and `0.1.1` remain available, and no independent dist-tag, tag, Release, or public submission is created.
- [ ] AC-09: Final scope is fully mapped, the delivered workflow Task and all prior terminal pairs remain byte-immutable, Task transaction state is clean, and this Task retains `STANDARD` so the publication Task cannot dispatch until `0.1.2` is merged and exact post-main evidence is satisfied.

## Plan

- [ ] Revalidate dependency delivery, trusted-publisher/workflow identity, aligned main, clean worktree, queue/transaction state, registry history/latest, and `0.1.2` absence.
- [ ] Update exact current version owners and tests to `0.1.2` while preserving intentional historical release evidence.
- [ ] Synchronize README and SPEC candidate-versus-public truth; change architecture or AGENTS only if their durable meaning actually changes.
- [ ] Run focused version/distribution/workflow/install/release regressions and classify every remaining `0.1.1` occurrence by current or historical ownership.
- [ ] Run the exact Release plan, four stable commands, candidate, isolation, and registry dry-run gates without triggering publication.
- [ ] Pack and inspect one exact owned `0.1.2` candidate; retain bounded metadata evidence and clean only proven Task-owned temporary state.
- [ ] Recheck `0.1.2` absence, workflow immutability, prior-pair hashes, full diff/matrix coverage, document deltas, pair validation, and transaction cleanliness.
- [ ] Enter honest repository terminal state and complete the separate `STANDARD` delivery gate to exact `main`, with no registry mutation.

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

- Not applicable — implementation has not started.

## Remaining

- Prepare and verify exact `0.1.2` source/package truth, complete repository acceptance and `STANDARD` delivery to main, and leave all registry publication/provenance work to the dependent Task.

## Resume Point

- After dependency selection succeeds, requery registry versions/latest and require an `E404` for `kyw-dev@0.1.2`, then hash-check the delivered `publish.yml` before changing any version owner.

## Blockers

- Not applicable — no blocker is known. Occupation of `0.1.2`, workflow/publisher drift, or incomplete predecessor delivery must block rather than alter this Task's version or dependency.
