# TASK 0045 — Cohesive Skill Installation Core Modules

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Split the Skill installation core into cohesive acyclic internal modules while preserving its public facade, ownership metadata, path containment, symlink/type/hash safeguards, transaction and recovery behavior, doctor diagnostics, CLI contracts, and both supported installation surfaces.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Cohesive internal boundaries for scope/path resolution and containment; ownership metadata and hashing; install/update/uninstall transactions and recovery; read-only doctor diagnostics; and current plugin/direct-Skills discovery.
- `src/core/skill-installation.mjs` as the stable public facade, or an equivalent compatibility boundary for every current import/export and CLI consumer.
- Package allowlists, internal imports, runtime source inventory, and tests required for the extracted files.
- Existing cross-platform, hostile-filesystem, direct-install, plugin-cache, transaction, distribution, and real-tarball lifecycle coverage.

## Out of Scope

- New install backends, generic package managers, provider/plugin architecture, generic transaction framework, daemon, watcher, tracing, or background repair.
- Removing either supported direct-Skills or plugin-cache discovery surface.
- Weakening path containment, portable identity, symlink/junction, type, ownership, hash, unknown-content, or recovery checks.
- New user-visible install behavior except a correction proven necessary by existing acceptance evidence.
- Task artifact refactoring, publication, registry mutation, tag, or GitHub Release.
- Refactoring to satisfy an arbitrary line-count target.

## Acceptance Criteria

- [x] AC-01: Existing exports, CLI commands, output/result shapes, error codes, metadata schema, ownership rules, and supported import paths remain compatible.
- [x] AC-02: Install, update, uninstall, force-preservation, doctor, interrupted transaction recovery, direct-Skills, and plugin-cache flows retain every current safety invariant.
- [x] AC-03: Unknown user content is never overwritten, removed, followed through an unsafe link, or reclassified as owned.
- [x] AC-04: Internal modules have cohesive responsibilities and an acyclic dependency graph without a provider, backend, filesystem, or transaction framework.
- [x] AC-05: The npm package contains every required new runtime module and excludes development-only files.
- [x] AC-06: Existing cross-platform and real-tarball lifecycle tests pass unchanged except for necessary import-path or inventory updates.
- [x] AC-07: Stable, release-candidate, package, and canonical Task validation pass locally, while exact-head pull-request CI and post-merge `main` CI remain subsequent external `STANDARD` ledger evidence rather than pre-terminal behavioral PASS.

## Plan

- [x] Revalidate the public facade/CLI, metadata and transaction schemas, safety invariants, import graph, package inventory, and existing cross-platform tests.
- [x] Define the smallest cohesive module graph for path/scope, ownership, transactions/recovery, diagnostics, and discovery with explicit dependency direction.
- [x] Extract responsibilities incrementally behind the stable facade without changing behavior, errors, output, metadata, or mutation ordering.
- [x] Update package/runtime inventories and imports while retaining hostile-state and end-to-end facade tests.
- [x] Prove unknown-content preservation and every path/link/type/hash/transaction/doctor invariant through existing and compatibility-focused coverage.
- [x] Synchronize architecture ownership, run focused/planner/Stable/candidate checks, canonical validation, and exact diff review.
- [x] Record terminal evidence for ordinary `STANDARD` delivery.

## Decisions

- The current installer module and CLI remain stable facades; extracted modules are internal implementation details.
- Boundaries follow safety ownership and dependency direction, not file length.
- Both current installation surfaces and every fail-closed invariant are frozen during the refactor.
- Task transactions and installer transactions remain separate, purpose-built mechanisms.
- No new package dependency or abstraction framework is justified.

## Risks

- Moving filesystem helpers can change the order or immediacy of mutation-time revalidation.
- Shared error mapping, metadata normalization, or recovery state can drift when split across modules.
- New runtime files can be omitted from the npm allowlist or installed support inventory.
- Tests that mock extracted internals can miss cross-platform or real-tarball failures protected by current end-to-end suites.
- Refactor-only scope can hide a safety weakening unless exact hostile-state coverage is retained.

## Discoveries and Changes

- Fresh transition preflight verified local/upstream/origin/direct-remote `main` at Task 0044 merge SHA `bf2d63e6b751f16e70ad04c14e2a03299c7bc040`, with no staged or unstaged path, no Git/installer/Task transaction residue, and only the pre-created 0045–0047 pairs untracked.
- A fresh exact GitHub ledger verified Tasks 0030–0044, including exact `taskId: "0044"`, PR #30 head `a7e0fd0b34d9f31b983c374a810fb58542ec34eb`, PR run `30146141684`, merge SHA `bf2d63e6b751f16e70ad04c14e2a03299c7bc040`, and main run `30146224428`. Canonical continuous dispatch selected Task 0045 with no hard dependency.
- The current 3,017-line installer core exposes 28 public facade symbols. `src/cli/run.mjs` imports the stable facade for install, update, uninstall, doctor, and shared result/error contracts; help and version remain CLI-owned.
- The smallest proposed internal graph is a shared scope/path/error primitive layer; package inventory and ownership metadata above shared; installed-state inspection above shared/inventory; transactions/recovery above shared/inventory/state; read-only doctor/discovery above shared/inventory/state; and a public re-export-only facade. This direction is acyclic and adds no provider, backend, filesystem, or transaction framework.
- Existing end-to-end tests already own hostile filesystem, ownership, recovery, CLI, doctor, direct-Skills, plugin-cache, and real-tarball behavior. New internal coverage is limited to exact public export inventory, exact module dependency direction/cycle absence, and packed-file inclusion.
- The original AC-07/T-07 phrasing made mutable hosted delivery look like a repository PASS prerequisite. It was reconciled with the permanent repository-versus-delivery boundary without changing the stable ID or required delivery gate.
- Mechanical extraction produced five cohesive internals: shared scope/path/error primitives; inventory and ownership metadata; installed-state inspection; transaction/recovery; and read-only doctor/discovery. `src/core/skill-installation.mjs` now only re-exports the unchanged 28-symbol public surface.
- `readRegularFile` needs the managed-parent proof before it can safely read any inventory or metadata file, so `assertRealDirectory` and `assertSafeManagedParents` moved with that primitive into the shared leaf. A source-body comparison against the pre-Task monolith matched all 426 shared, 303 inventory, 302 state, 1,272 transaction, and 569 doctor normalized lines.
- The exact import graph is acyclic and is enforced by a regression test. The facade depends only on the five internals; transactions and doctor depend on shared/inventory/state; state depends on shared/inventory; inventory depends on shared; shared has no installer-internal dependency.
- The npm allowlist now includes all five new runtime files. Direct-Skills inventory remains unchanged because that installation surface copies its dedicated Task runtime rather than the npm CLI installer implementation.
- Focused extraction runs exposed four missing cross-module imports and the expected packed-file inventory change before reaching 83/83 PASS. No failing result was treated as evidence until the corresponding defect was corrected and the complete focused command passed.
- Local release verification passed 283/283 tests, lint across 69 JavaScript modules, formatting across 282 text files, a 39-file 100,457-byte package check, and an identical packed release candidate with SHA-256 `0d3f40d4d0795511f80e75507353a491db0fcb6edf8ca87e16774b142ab9c8b2`.
- Final repository checks classified the exact 12 Task-owned paths as `RELEASE`, validated all 47 canonical Task pairs, found no Task transaction evidence, and passed `git diff --check`. Exact-head pull-request and post-merge `main` CI remain external delivery ledger work.

## Documentation Impact

- SPEC: Unchanged — the refactor preserves all user-visible installation behavior and requirements.
- ARCHITECTURE: Updated with installer module responsibilities, dependency direction, stable facade, and package/runtime ownership.
- README: Updated one internal-path statement to identify `src/core/skill-installation.mjs` as the stable facade; installation guidance and CLI behavior are unchanged.
- AGENTS: Unchanged — repository-wide workflow and completion rules are unaffected.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed fresh local, direct-remote, PR, Actions, queue, lock, and transaction preflight.
- Revalidated the full Tasks 0030–0044 external ledger before canonical selection.
- Inventoried the 28-symbol public facade, CLI consumers, core responsibility regions, package allowlist, runtime source inventory, and focused regression ownership.
- Revalidated AC-01–AC-07 against T-01–T-07 and defined the minimal acyclic dependency direction before moving code.
- Extracted five exact-body installer internals behind the stable facade and resolved every cross-module dependency without changing public behavior.
- Added exact facade-export and acyclic-import-graph regressions and extended the tarball allowlist/count for the new runtime files.
- Re-ran the full hostile install/update/uninstall/recovery/doctor, CLI, distribution, isolation, and actual-tarball focused coverage to 83/83 PASS.
- Synchronized architecture and README ownership statements while confirming no SPEC or AGENTS change.
- Passed exact-path planning, 283/283 aggregate tests, lint, formatting, package/candidate verification, current/all-Task canonical validation, transaction inspection, and complete diff review.
- Recorded reproducible repository evidence for `STANDARD` delivery without claiming mutable hosted results.

## Remaining

- None — repository implementation, documentation, and local verification are complete; mutable hosted delivery is tracked by the external GitHub ledger.

## Resume Point

- None — resume only external `STANDARD` delivery from this exact terminal Task pair and commit.

## Blockers

- Not applicable — no blocker is known.
