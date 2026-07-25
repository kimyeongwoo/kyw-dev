# TASK 0044 — Cohesive Task Artifact Core Modules

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Split the corrected and ownership-hardened Task artifact core into cohesive acyclic internal modules while preserving the public facade, adapter commands, exports, result shapes, error codes, exact messages, package bytes, and every observable Task contract.

## Dependencies

- Task 0041.
- Task 0042.

## In Scope

- Cohesive internal boundaries for Task Markdown/contract parsing and state predicates; queue inventory, dependency graph, and dispatch; delivery evidence classification; and Task creation/transaction logic.
- `src/core/task-artifacts.mjs` as the stable public facade, or an equivalent compatibility boundary for every existing import and export.
- Package allowlists, runtime imports, direct-install support inventory, and tests required for new internal files.
- Existing end-to-end facade and adapter coverage plus narrowly scoped internal-invariant tests where ownership materially improves.

## Out of Scope

- New user-visible Task behavior, schema, status, dependency syntax, command, result code, error code, or exact message.
- Renaming or removing public exports, adapter commands, paths, or compatibility behavior.
- Classes, dependency-injection containers, repository/service abstractions, generic filesystem adapters, or a shared transaction framework.
- Refactoring to satisfy an arbitrary line-count target.
- Skill installation core refactoring, publication, registry mutation, tag, or GitHub Release.

## Acceptance Criteria

- [x] AC-01: Every current public export, adapter command, result shape, error code, exact message, import path, and package behavior remains compatible.
- [x] AC-02: Extracted internal modules have one clear responsibility each, form an acyclic dependency graph, and retain a stable facade.
- [x] AC-03: Queue truthfulness from Task 0041 and transaction ownership/recovery safety from Task 0042 remain behaviorally unchanged.
- [x] AC-04: Existing focused tests continue to exercise public facade behavior, and new internal tests cover only invariants that cannot be owned clearly through the facade.
- [x] AC-05: The packed tarball and direct-install runtime contain every required new internal module and no development-only file.
- [x] AC-06: No production or development package dependency, generic framework, or arbitrary size target is added.
- [x] AC-07: Stable, package, direct-install, Task adapter, and canonical Task validation pass locally, while exact-head and post-merge hosted CI remain subsequent external `STANDARD` ledger evidence rather than pre-terminal behavioral PASS.

## Plan

- [x] Revalidate Tasks 0041/0042 delivery, the public export/adapter/package surface, import graph, and complete focused regression suite.
- [x] Define the smallest cohesive internal module graph and document its responsibility and allowed dependency direction before moving code.
- [x] Extract parsing/state, queue/dispatch, delivery, and creation/transaction responsibilities incrementally behind the stable facade.
- [x] Update package/direct-install inventories and imports, retaining public-surface tests and adding only necessary internal invariant coverage.
- [x] Prove export/result/error/message compatibility and unchanged truthfulness/transaction behavior through exact diff and tests.
- [x] Synchronize architecture ownership, run focused/planner/Stable/candidate checks, canonical validation, and final diff review.
- [x] Record terminal repository evidence for subsequent ordinary `STANDARD` delivery.

## Decisions

- The existing Task artifact module remains the compatibility facade; internal filenames and boundaries are implementation details.
- Module boundaries follow cohesive responsibilities and dependency direction, not a line-count quota.
- Correctness and safety behavior from Tasks 0041/0042 is frozen during extraction.
- No new abstraction framework or dependency is justified for a local behavior-preserving split.

## Risks

- Moving code can silently change initialization order, shared constants, error identity, or exact messages even when tests compile.
- New internal files can be omitted from npm or direct-install runtime inventories.
- Tests rewritten around internals can stop protecting the public facade.
- Mixing cleanup or feature changes into the split would obscure behavior drift and violate this Task boundary.

## Discoveries and Changes

- Fresh transition preflight verified local/upstream/origin/direct-remote `main` at Task 0043 merge SHA `529ddb84cbca032609f082a0d9ecd4b790f4ecca`, with no staged or unstaged path, no Git/Task transaction residue, and only the pre-created 0044–0047 pairs untracked.
- Tasks 0041 and 0042 are repository-complete and freshly delivery-satisfied. Task 0043 is also delivery-satisfied at PR head `60aa25a09e3b8b0251287d0c295d162c1bdce9da`, PR run `30145432613`, merge SHA `529ddb84cbca032609f082a0d9ecd4b790f4ecca`, and main run `30145518428`.
- The current 4,049-line core exposes 25 public facade symbols and six adapter commands. Direct-install inventory explicitly copies only `task-artifacts.mjs` and `template-contracts.mjs`, while the tarball uses an exact source-file allowlist.
- The smallest proposed internal graph is a Task-specific shared filesystem/identity layer; contract/state and delivery classifiers above it; queue/dispatch depending on contract, delivery, and shared primitives; creation/transaction depending on queue, contract, and shared primitives; and a public re-export-only facade. This direction is acyclic and adds no generic framework.
- Existing facade tests already exercise truthfulness and transaction behavior. New internal coverage is limited to exact public export inventory, module responsibility/import direction, cycle absence, and packed/direct-install inclusion.
- The original AC-07/T-07 phrasing made mutable hosted delivery look like a repository PASS prerequisite. It was reconciled with the permanent repository-versus-delivery boundary without changing the stable IDs or required delivery gate.
- The mixed core was mechanically partitioned into shared ownership primitives, contract/state parsing, delivery classification, queue/dispatch, and creation/transaction modules. `task-artifacts.mjs` now contains only the original 25-symbol public re-export surface.
- The package and direct-install inventories now include all five internal modules. Managed direct-install inventory grows from 19 to 24 files and the exact tarball from 29 to 34 files; actual installed and extracted adapters execute successfully.
- Two focused red phases exposed only cross-module wiring omissions: first `stagingPrefix` and `dependencyGraphErrors`, then `creationLockName`. Each failure was retained in `TEST.md`, fixed with the smallest import/export change, and followed by a green complete focused suite.
- `npm run release:ci` passed 281 tests, lint across 64 JavaScript modules, format across 277 UTF-8/LF files, a 34-file/99,566-byte package check, and packed-candidate SHA-256 `46dffb5b517a84d1a0f792f0a63c966f0d6c67e831675a07dcb3c27cb20ed5f6`.
- Final local integrity review found all 47 Task/Test pairs canonical, no Task transaction evidence, no package manifest or dependency change, no whitespace error, and no path outside this Task except the untouched pre-created 0045–0047 queue pairs.
- A read-only source-range comparison against `HEAD:src/core/task-artifacts.mjs` reported `BODY_MATCH` for all five extracted responsibility regions; executable bodies are unchanged apart from required internal export wiring and module imports.

## Documentation Impact

- SPEC: No product behavior or requirement changed; no edit.
- ARCHITECTURE: Updated core responsibilities, dependency direction, stable facade, and complete package/direct-install runtime ownership.
- README: Clarified that the existing public Task artifact path is the stable facade; no command or user workflow changed.
- AGENTS: No repository-wide workflow or completion rule changed; no edit.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed fresh local, direct-remote, PR, Actions, dependency, queue, lock, and transaction preflight.
- Revalidated Tasks 0041/0042 delivery and Task 0043 exact-SHA delivery before selection.
- Inventoried the public exports, adapter commands, current source responsibilities, package allowlist, direct-install mappings, and focused facade suites.
- Revalidated AC-01–AC-07 against T-01–T-07 and defined the minimal acyclic module direction before moving code.
- Extracted the five cohesive internal modules and retained `src/core/task-artifacts.mjs` as the exact 25-export public facade.
- Added exact public-export and acyclic import-graph tests without coupling behavior tests to internal functions.
- Updated npm tarball and direct-install runtime inventories and proved the package-root and installed fallback adapters against real bytes.
- Completed the focused, planner-selected RELEASE, canonical all-Task, transaction-residue, dependency-manifest, whitespace, changed-path, and final acceptance-to-test reviews.
- Recorded all failed and successful commands in the matching `TEST.md`; repository acceptance evidence is terminal and hosted delivery remains external.

## Remaining

- None — repository acceptance work is complete; ordinary `STANDARD` delivery continues only in the external GitHub ledger.

## Resume Point

- None — this terminal pair is audit-complete; delivery resumes from the external ledger using the exact Task 0044 outcome commit.

## Blockers

- Not applicable — no blocker is known.
