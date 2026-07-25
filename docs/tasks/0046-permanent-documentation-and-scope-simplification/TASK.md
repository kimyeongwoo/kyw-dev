# TASK 0046 — Permanent Documentation and Scope Simplification

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Reduce user and maintainer cognitive load by putting the happy path first, removing duplicated chronology and normative wording, and recording deliberate scope boundaries without changing runtime behavior, deleting unique safety/release truth, or creating another permanent document.

## Dependencies

- Task 0043.
- Task 0044.
- Task 0045.

## In Scope

- Restructure the top of `README.md` around product purpose, installation choice, the four explicit Skills/commands, a short first-use workflow, and current release/publication status.
- Consolidate deep implementation and evaluator explanation in its authoritative Architecture location and replace duplicate README/SPEC/Architecture prose with concise links or projections.
- Give every normative rule one clear owner while preserving useful user-facing projections.
- Keep root `AGENTS.md` thin and synchronize the canonical managed template only where its projection changes.
- Record deliberate GitHub-first `STANDARD` delivery, exactly the current direct-Skills and plugin-cache surfaces, development-only evaluator scope, Node 22/24 full support plus bounded Node 26 compatibility, prohibition on generic provider/install-backend/transaction/tracing/watcher/daemon frameworks, and separately approved publication/tag/Release boundaries.
- Preserve current status and superseded release-candidate history without turning README into a chronological Task log.

## Out of Scope

- Runtime, Task, installer, evaluator, CI-matrix, delivery, package, or command behavior changes.
- A fifth permanent document, documentation generator, schema compiler, or docs framework.
- Removing unique safety constraints, commands, provenance requirements, evidence boundaries, or release/publication truth.
- Expanding evaluator infrastructure, changing supported installation surfaces, removing Node 26 compatibility, or inventing a delivery provider abstraction.
- Publication, registry mutation, version bump, tag, GitHub Release, public plugin submission, or an automatically created publication Task.

## Acceptance Criteria

- [x] AC-01: A new user can find product purpose, installation choice, explicit invocation, first workflow, and current release status near the top of README without reading evaluator internals.
- [x] AC-02: Every normative rule has one clear authoritative owner; duplicate copies are removed or converted to concise, accurate links or projections.
- [x] AC-03: The four-permanent-document rule remains intact and no new permanent document is created.
- [x] AC-04: Root `AGENTS.md` remains thin and its canonical managed-template projection is byte- or meaning-consistent where required.
- [x] AC-05: Commands, safety guarantees, Task aliases, model/effort provenance, supported surfaces, Node policy, GitHub-first delivery, and publication boundaries remain accurate.
- [x] AC-06: Evaluator history and implementation detail no longer dominate the primary user path, while unique evidence and security constraints remain accessible in their authoritative location.
- [x] AC-07: Repository tests verify instruction surfaces, links/references, package metadata, and documentation contracts after consolidation.
- [x] AC-08: The final diff contains no runtime behavior change, generic framework, new permanent document, publication action, or silent deletion of unique durable truth.

## Plan

- [x] Revalidate delivered Tasks 0043/0044/0045, permanent document ownership, duplicate passages, user happy path, template projections, and unique safety/release facts.
- [x] Produce a duplication/ownership map that names the authoritative destination before deleting or shortening any durable statement.
- [x] Reorder README around first use and current status, then consolidate deep implementation/evaluator material into concise links to Architecture.
- [x] Deduplicate SPEC/Architecture wording while retaining one normative owner and accurate projections; keep AGENTS/template thin and aligned.
- [x] Record every deliberate non-change and verify no runtime/package/configuration behavior changed.
- [x] Run documentation/instruction/foundation/package tests, exact-path planning, Stable checks, link/reference review, canonical validation, and manual before/after review.
- [x] Record terminal evidence and complete ordinary `STANDARD` repository work for external delivery.

## Decisions

- Permanent ownership remains SPEC for behavior, Architecture for components/constraints, README for user entry, and AGENTS for thin repository invariants.
- The primary README path optimizes for first successful use, not historical implementation chronology.
- GitHub-first delivery, two installation surfaces, development-only evaluators, and bounded Node 26 compatibility are deliberate product boundaries.
- No generic provider, backend, transaction, tracing, watcher, daemon, documentation framework, or automatic publication path is introduced.
- Unique safety, provenance, command, and release facts are moved or linked, never silently discarded.

## Risks

- Deduplication can accidentally remove the only normative statement or weaken a safety boundary.
- Moving text without updating links and projections can create instruction drift or packaging failures.
- A docs-only Task can unintentionally change packaged Skill behavior if instruction wording becomes normative rather than descriptive.
- Overcompressing release history can falsely imply current approval or publication.
- Manual readability gains must not substitute for deterministic instruction/link/package verification.

## Discoveries and Changes

- Fresh transition preflight verified local/upstream/origin/direct-remote `main` at Task 0045 merge SHA `b0763337849af5ecde3ee28a0fe055486aa8cc51`, with no staged or unstaged path, no Git/installer/Task transaction residue, and only the pre-created 0046–0047 pairs untracked.
- A fresh exact delivery ledger through Task 0045 included exact `taskId: "0045"`, PR #31 head `0a4c62638ad92f59456453a931b4edcf47a1c7eb`, PR run `30146868175`, merge SHA `b0763337849af5ecde3ee28a0fe055486aa8cc51`, and main run `30146962005`. Canonical continuous dispatch selected Task 0046 as `READY/READY` with Tasks 0043/0044/0045 satisfied.
- The initial canonical pair validation passed and the installed CLI provenance is `codex-cli 0.145.0`.
- The pre-edit ownership map assigns product purpose, Skill/CLI behavior, compatibility, safety requirements, and publication decisions to SPEC; components, module boundaries, transaction/evaluator internals, CI flow, and deliberate technical exclusions to ARCHITECTURE; installation choices, exact commands, first use, current status, and contributor entry to README; and only repository-wide execution invariants to AGENTS.
- README currently puts 78 lines of development and evaluator implementation before the first workflow, repeats long Skill procedures already owned by SPEC and the Task execution reference, duplicates the package tree owned by ARCHITECTURE, and carries chronological release prose. The retained user projection must keep the two supported installation choices, four explicit Skill forms, anchored Task aliases, essential safety/recovery guidance, exact developer commands, and truthful unpublished/superseded status.
- Unique evaluator command, cost, authentication, result, interruption, isolation, and diagnostic facts were checked before shortening. Operational entry commands remain in README; implementation, security, evidence, and lifecycle detail remains or is consolidated under ARCHITECTURE validation/release sections; immutable Task-specific history remains in its Task artifacts.
- README was rebuilt from 40,439 bytes and 338 lines to 17,922 bytes and 221 lines. Its first path is now purpose, one of two installation choices, all four explicit Skill forms, the first workflow, and truthful release status; detailed maintainer and evaluator material follows those sections.
- README retains the exact developer/release/evaluator entry commands, direct-install safety and exit-code guidance, anchored Task aliases, model-call/cost boundary, Node policy, duplicate-source warning, unpublished status, and separately approved publication boundary. Deep evaluator, CI, isolation, and package-tree detail now links to its Architecture owner.
- SPEC now names the two supported installation/discovery surfaces, GitHub PR/Actions as the current `STANDARD` ledger, and the deliberate absence of unattended daemon/watcher/repair behavior or generic provider/install-backend abstraction.
- ARCHITECTURE now owns one release-isolation lifecycle description and a deliberate-scope table for delivery, distribution, transactions, evaluators, Node compatibility, and publication. Task-specific evaluator chronology was removed from permanent truth and remains in immutable Task/Test evidence.
- Root and template `AGENTS.md` remain unchanged because repository execution invariants and their managed projection did not change. `templates/project/` still contains exactly `README.md`, `AGENTS.md`, `SPEC.md`, and `ARCHITECTURE.md`.
- The initial focused suite exposed three legacy README-literal assertions and passed 71/74; after updating those contract projections it passed 77/77. The first Stable invocation exposed one additional legacy audit README assertion; its focused correction passed 32/32 before the repeated Stable gate passed.
- Exact local Markdown-reference review resolved 12 file references and 11 heading anchors. The corrected order-independent unique-fact audit passed 14/14 after its first order-sensitive checker pattern rejected a document that contained both required facts.
- Final exact-path planning classified the eight Task-owned paths as `STABLE`. `npm run check` passed 286/286 tests, lint across 69 JavaScript modules, format across 282 UTF-8/LF text files, and package selection across 39 files and 92,971 bytes.
- Current-pair and all 47 canonical pair validations passed both before and after terminal recording; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`; `git diff --check` passed. Complete diff review found no runtime, package/configuration, dependency, generic framework, new permanent document, publication, AGENTS, template, or unrelated change.

## Documentation Impact

- SPEC: Updated deliberate product non-goals and supported delivery/installation boundaries; remains the normative behavior owner.
- ARCHITECTURE: Consolidated release/evaluator lifecycle detail and added deliberate technical-scope boundaries; remains the system owner.
- README: Rebuilt the entry path around purpose, install choice, explicit Skills, first use, and truthful release status.
- AGENTS: Reviewed and unchanged because repository-wide behavior and completion rules did not change; the canonical managed template is likewise unchanged.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed fresh local, direct-remote, PR, Actions, queue, lock, and transaction preflight.
- Revalidated prerequisite delivery through Task 0045 and activated only Task 0046.
- Read the current pair, permanent truth, and canonical managed AGENTS projection and revalidated AC-01–AC-08 against T-01–T-08.
- Built the section-level authoritative-owner, duplicate-projection, and unique-fact map before the first permanent-document edit.
- Rebuilt README around first use and replaced duplicate normative/detail prose with concise projections and links.
- Consolidated deliberate product non-goals in SPEC and release/evaluator/scope ownership in ARCHITECTURE without changing behavior.
- Added deterministic first-use ordering, release-truth, four-document, deliberate-boundary, local-reference, and concise-projection regressions.
- Passed the corrected focused suites, exact-path Stable planning, 286/286 aggregate tests, lint, formatting, package selection, link/anchor and unique-fact checks, canonical validation, transaction inspection, and complete diff review.
- Recorded reproducible repository evidence for `STANDARD` delivery without claiming mutable hosted results.

## Remaining

- None — repository documentation, contract tests, and local verification are complete; mutable hosted delivery is tracked by the external GitHub ledger.

## Resume Point

- None — resume only external `STANDARD` delivery from this exact terminal Task pair and commit.

## Blockers

- Not applicable — no blocker is known.
