# TASK 0053 — Split Task Authoring and Implementation Skills

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Separate the combined Task workflow into an explicit author-only `kyw-task` Skill and an explicit existing-Task execution-only `kyw-impl` Skill while preserving one shared deterministic artifact, queue, and delivery engine plus the ordinary `STANDARD` lifecycle.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Classify the existing combined workflow by authoring versus execution responsibility before changing it.
- Reduce `skills/kyw-task` to repository inspection, adaptive decomposition, genuine Task-level grilling, atomic complete pair-set publication, exact next-command reporting, and compatible `DRAFT/DRAFT` authoring or promotion.
- Add explicit-only `skills/kyw-impl` using existing Skill metadata conventions for exact, next, continuous, resume, verification, documentation synchronization, terminal state, and ordinary `STANDARD` delivery of already existing Tasks.
- Move the single canonical execution procedure from `kyw-task` to `kyw-impl` without keeping a duplicate full procedure.
- Reuse the existing packaged Task adapter and singular `src/core/task-artifact-*` runtime; change portable execution parsing and fallback guidance to `$kyw-impl NNNN` without creating another state, dependency, dispatcher, or delivery engine.
- Preserve legacy `DRAFT/DRAFT` authoring in `kyw-task`; make non-DRAFT `$kyw-task NNNN` stop with exact `$kyw-impl NNNN` migration guidance.
- Keep the three anchored Korean execution aliases unchanged for users while routing their owner to `kyw-impl` and preserving exact/next/continuous priority, seriality, fail-closed behavior, and no-background semantics.
- Align `kyw-grilling` terminal feature guidance to a new explicit `$kyw-task "<confirmed outcome>"` invocation while preserving fileless, read-only, and no-auto-chain behavior.
- Synchronize `README.md`, `AGENTS.md`, `CODEX_PROMPTS.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, the managed project template, plugin metadata, Skill metadata, installer ownership, package validation, fixtures, and focused tests where their durable meaning changes.
- Provide exactly five production Skills through direct and plugin installation, including safe compatibility for existing schema-1 four-Skill ownership metadata during doctor, update, and uninstall.
- Keep package version `0.1.0`, Task artifact templates and status/dependency grammar, current and legacy readers, publication boundaries, and ordinary small-prompt behavior unchanged.

## Out of Scope

- Changing the Task artifact schema, contract version, status pairs, dependency grammar, templates, delivery ledger schema, or historical numbered Task artifacts.
- Adding a database, daemon, watcher, queue service, background worker, generic orchestrator, provider abstraction, automatic Skill chaining, new permanent document, production dependency, or model-backed evaluator requirement.
- Retaining hidden execution compatibility for non-DRAFT `$kyw-task NNNN` or allowing `kyw-impl` to allocate an ID, create a Task directory, author a pair, or promote a DRAFT pair.
- npm login, logout, token or config mutation, npm auth or registry probing, `npm run release:check`, release-evidence actual mode, model-backed smoke or cohort execution, publication, registry mutation, package version change, tag, GitHub Release, public plugin submission, force push, branch deletion, CI rerun, bypass, or admin override.
- Unrelated cleanup, large-scale file renaming, historical Task rewrites, or changes to `kyw-audit` and ordinary small-prompt behavior beyond required invocation references.

## Acceptance Criteria

- [x] AC-01: User docs, repository routing, Skill contracts, and metadata consistently define `kyw-task` as Task/Test authoring only and `kyw-impl` as existing-Task execution only; both remain explicit-only.
- [x] AC-02: A goal-style `$kyw-task "goal"` invocation atomically creates only the smallest dependency-aware complete `READY/READY` pair set and stops without implementation, permanent-document, commit, PR, delivery, or automatic Skill-chain mutation.
- [x] AC-03: Successful authoring reports exactly one next `$kyw-impl NNNN` command for the first eligible created pair and never invokes it automatically.
- [x] AC-04: `$kyw-impl NNNN` preserves exact selection, one-current-Task enforcement, READY start, active resume, BLOCKED recheck, repository-complete delivery resume, implementation, live Task/Test evidence, durable-document routing, verification, terminal status, and ordinary `STANDARD` delivery.
- [x] AC-05: The managed exact, next, and continuous Korean aliases route to `kyw-impl` with existing selection priority, current-invocation-only seriality, fail-closed behavior, and no-background promise.
- [x] AC-06: `kyw-impl` exposes no creation or DRAFT-authoring path and performs zero Task allocation or pair mutation for a new-outcome, goal-style, missing, or otherwise non-existing Task request; it instead guides the user to a new explicit `$kyw-task "<outcome>"` invocation.
- [x] AC-07: `kyw-task NNNN` supports only compatible `DRAFT/DRAFT` authoring and promotion; any non-DRAFT pair receives state-appropriate `$kyw-impl NNNN` migration guidance and is not executed.
- [x] AC-08: Contract marker uniqueness, Task/Test template sections, status pairs, dependency grammar, static delivery declaration, current readers, and historical legacy readers remain compatible without schema/version change or mass rewrite.
- [x] AC-09: Creation, validation, state, dependency, dispatcher, and delivery decisions continue through one canonical packaged adapter/shared runtime graph with no duplicated deterministic engine or second workflow framework.
- [x] AC-10: `kyw-task` may record expected Documentation Impact but cannot mutate permanent documents; `kyw-impl` retains the existing minimal durable-document impact routing and synchronization during current-Task execution.
- [x] AC-11: Standalone grilling remains explicit-only, fileless, read-only, and no-auto-chain, and terminal feature-design guidance points to `$kyw-task "<confirmed outcome>"` without a create-only suffix.
- [x] AC-12: Direct user/project installation and plugin packaging expose the five production Skills exactly once, while install, update, uninstall, doctor, ownership containment, collision handling, and duplicate-source detection remain safe, including upgrade/read compatibility for legacy four-Skill schema-1 metadata.
- [x] AC-13: Model and reasoning-effort inheritance, per-field provenance honesty, one-current-Task enforcement, evidence honesty, user-work preservation, and separately gated authority remain intact.
- [x] AC-14: The final diff adds no new Task schema/state, permanent document, production dependency, daemon, database, watcher, background worker, generic orchestrator, or implicit/automatic Skill chaining.
- [x] AC-15: Planner-selected focused, stable, installer, plugin, package, and release-candidate verification runs successfully with every meaningful diff branch and acceptance criterion mapped to executed evidence; unexecuted checks are not reported as PASS.
- [x] AC-16: Package version, npm authentication/configuration, registry, publication, tags, GitHub Releases, public submission, and other separately gated release state remain unchanged.

## Plan

- [x] Finalize the before-change authoring/execution surface map and lock the minimal single-engine design.
- [x] Add the explicit-only `kyw-impl` Skill and transfer the canonical execution reference without duplication.
- [x] Reduce `kyw-task` to authoring and legacy-DRAFT responsibility, then change portable execution parsing and migration guidance.
- [x] Align managed routing, grilling terminal guidance, maintainer prompts, permanent documents, and project templates.
- [x] Extend direct/plugin distribution to five Skills with safe legacy four-Skill metadata compatibility and unchanged package version.
- [x] Split and extend authoring, implementation, dispatch, instruction-surface, installer, plugin, package, and behavioral acceptance tests.
- [x] Run `npm run verify:plan -- <all changed paths>` and its ordered focused, stable, and release-sensitive plan without crossing excluded release boundaries.
- [x] Review the final diff against scope and every matrix row, synchronize Task/Test evidence, validate the pair, and complete ordinary `STANDARD` delivery only after all required local evidence passes.

## Decisions

- Keep this as one atomic Task because authoring and execution halves cannot be shipped independently without leaving ambiguous command ownership.
- Use the exact batch key `split-task-and-impl`; final Task ID and directory allocation remain exclusively owned by the packaged adapter.
- Keep all five Skills explicit-only; the anchored Korean aliases remain repository routing rather than implicit Skill matching.
- Preserve the existing single Task runtime and packaged adapter as the canonical deterministic core; Skill instructions call only their owned command paths and no copied engine is introduced.
- Move the complete execution procedure to `kyw-impl`; do not retain a stale or full duplicate under `kyw-task`.
- Accept legacy ordered four-Skill schema-1 ownership metadata for safe reading and transition while all newly written install/update metadata lists five Skills.
- Preserve package version `0.1.0` and every publication boundary named by the user.

## Risks

- A second occurrence of the contract identity marker in either generated artifact would invalidate the atomic batch before publication; generation and post-create validation must prove exactly one occurrence per file.
- Splitting prose without changing deterministic invocation parsing could leave `$kyw-task` as a hidden execution alias or make managed fallbacks incorrect.
- Moving the execution reference while duplicating the adapter or core would create divergent state/delivery semantics; source identity and imports require direct review.
- Expanding the managed Skill list without legacy metadata compatibility would make existing four-Skill direct installs unreadable to doctor, update, or uninstall.
- Fixed package inventories, expected file counts, installer ownership hashes, plugin cache assertions, and behavioral fixtures may drift; all counts must come from actual results rather than preserved expectations.
- Release-sensitive paths require candidate verification, but registry/auth checks and release publication boundaries remain prohibited.

## Discoveries and Changes

- Preflight base is `bc6cf87b2e391f14f39c95726d8d0e89dd58cbe9` on clean `main`; local `main`, cached `origin/main`, direct remote `main`, and GitHub `main` agree, and no relevant open PR targets this outcome.
- The repository contains 52 Task/Test pairs: 46 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, and one historical `CANCELLED/BLOCKED`; there is no active, READY, or DRAFT pair and queue validation reports no error. Task 0051 remains an unrelated historical release blocker, while Task 0052 is complete.
- Packaged transaction inspection reports no lock, staging directory, release marker, or residue. The next identity is available for atomic adapter allocation, but this Task definition does not assume or hand-author that ID.
- Current authoring responsibility lives in `skills/kyw-task/SKILL.md` create phases and the adapter's creation/validation/transaction commands. Current execution responsibility lives in the same Skill's dispatch entry, `references/execution.md`, managed routing projections, and the shared delivery parser.
- Deterministic artifact behavior is already singular across the task contract, creation, queue, delivery, and facade modules. The packaged adapter is a thin package/direct-install bridge and can remain the one adapter used through owner-specific Skill instructions.
- Current distribution exposes four Skills, 24 direct-managed files, and 39 exact tarball paths at base. The plugin discovers the whole `skills/` directory; direct ownership and exact validation use fixed Skill-name and path inventories.
- The validator detects contract-identity comments by occurrence, so each generated artifact must contain one marker comment and must not repeat it in authoring prose or examples.
- Existing schema-1 install metadata requires the exact current four-Skill list; adding a fifth name without a legacy-read rule would break safe update, uninstall, and doctor for owned installations.
- The planned full changed-path set is release-sensitive because it includes plugin, distribution, and package validation surfaces; the planner is expected to select `npm run release:ci`, not the prohibited registry-facing release check.
- The final planner classified all 40 changed paths as `RELEASE` and selected only `npm run release:ci`; Task evidence paths were ignored for risk classification and hosted exact-head verification remains the external delivery gate.
- The first full release gate exposed three stale expectations rather than product failures: the grilling Skill hash in its offline benchmark, the plugin audit-prompt index after adding a separate implementation prompt, and their matching tests. Those expectations were corrected and focused reruns passed.
- A later independent coverage audit found and closed three gaps: every non-DRAFT authoring state now has migration evidence, legacy-only automatic execution guidance preserves exact existing-Task selection through `$kyw-impl NNNN`, and the plugin authoring prompt directly proves author-and-stop semantics.
- Final package evidence is 41 files, 94,420 bytes, SHA-256 `67640f86a873b0f2e00a1cf48fbe60c8a59e9c836a285ab84b2c0fb0475479fb`; direct installation owns 26 files for exactly five Skills.

## Documentation Impact

- SPEC: Update user-visible author-only and execution-only command behavior, five-Skill distribution, installation metadata compatibility, and MVP acceptance without weakening artifact, evidence, security, or publication requirements.
- ARCHITECTURE: Update component ownership, execution-reference authority, invocation and queue flow, adapter/shared runtime dependency direction, five-Skill direct/plugin layout, and legacy metadata read compatibility.
- README: Update Start here, first workflow, Task routing, installation/package Skill count, direct/plugin guidance, and repository map to the new two-command flow.
- AGENTS: Minimally change repository-wide existing-Task routing and canonical execution-reference ownership from `kyw-task` to `kyw-impl` while keeping the file thin.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Read the packaged combined workflow, its complete execution reference, all four permanent documents, `CODEX_PROMPTS.md`, and the external approved split brief.
- Completed clean Git, GitHub, Task inventory, queue, transaction, package, plugin, Skill, adapter, runtime, installer, template, and relevant test-surface preflight at the recorded base.
- Classified current authoring and execution ownership, identified the single-engine preservation design, and added legacy four-Skill metadata compatibility to the implementation boundary.
- Entered `IN_PROGRESS/RUNNING` on branch `task/0053-split-task-and-impl` after validating the atomically published pair and confirming no transaction residue.
- Added explicit-only `skills/kyw-impl`, moved the sole execution reference there, reduced `skills/kyw-task` to authoring and DRAFT promotion, and kept the single adapter at `skills/kyw-task/scripts/task-artifacts.mjs`.
- Changed the shared execution parser/fallback to `$kyw-impl`, made DRAFT implementation fail closed with `$kyw-task NNNN` guidance, added zero-allocation new-outcome guidance, and preserved the existing queue/delivery engine.
- Synchronized `README.md`, `AGENTS.md`, `CODEX_PROMPTS.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, the managed AGENTS template, plugin prompts, and grilling terminal guidance to the author-then-implement flow.
- Extended direct and plugin distribution to five explicit-only Skills while preserving schema-1 legacy four-Skill metadata reads for safe doctor, update, and uninstall; new install/update writes five Skills and 26 managed files.
- Added and executed focused authoring, implementation, dispatcher, legacy/current artifact, instruction, grilling, audit, behavioral, installer, plugin, isolation, planner, and distribution coverage, including the independently discovered legacy-only and non-DRAFT branches.
- Ran the exact 40-path planner and its ordered `npm run release:ci` gate to final success: 311/311 tests, lint over 73 JavaScript modules, format check over 301 text files, pack validation over 41 files, and the recorded release-candidate identity.
- Reviewed all changed paths against scope and the Test matrix; two independent read-only audits found no remaining documentation, ownership, package, compatibility, or coverage blocker.

## Remaining

- None — the repository outcome is complete; mutable `STANDARD` delivery is tracked in the external GitHub ledger.

## Resume Point

- None — no repository work remains; if interrupted, resume only the external exact-SHA `STANDARD` delivery ledger.

## Blockers

- Not applicable — preflight found no active Task, queue inconsistency, transaction residue, unexplained work, remote drift, conflict, or unresolved user-owned decision.
