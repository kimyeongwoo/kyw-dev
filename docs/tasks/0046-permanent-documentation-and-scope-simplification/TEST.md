# TEST 0046 — Permanent Documentation and Scope Simplification

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Hard dependencies: Tasks 0043, 0044, and 0045 must be repository-complete and externally delivered before implementation.
- Product requirements: `../../SPEC.md`, especially permanent document ownership, user-visible commands/surfaces, compatibility, and publication decisions.
- Architecture constraints: `../../ARCHITECTURE.md`, especially instruction authority/projections, component ownership, evaluator boundary, CI/runtime policy, and context strategy.
- Repository rules: `../../../AGENTS.md`.
- Verification policy: deterministic documentation/instruction/package checks plus a manual first-use and duplication review, full Stable, canonical validation, and hosted exact-SHA delivery.
- Installed CLI provenance: `codex-cli 0.145.0` from the installed `codex` command (`OBSERVED` before implementation); it does not substitute for the active API surface fields below.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose a Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — README happy path | Review the first README sections for purpose, installation choice, four explicit invocations, first-use flow, and truthful current release status. | Manual/static | PASS | Ordering regression and manual review confirm the first-use path before release, Task, install-detail, and development sections; README is 17,922 bytes/221 lines. |
| T-02 | AC-02 — Single normative owner | Build and recheck a rule-family ownership map, rejecting unexplained duplicate normative copies and broken projections. | Audit/static | PASS | Owner map assigns behavior to SPEC, system constraints to ARCHITECTURE, first use to README, and repository invariants to AGENTS; complete diff review found only identified projections. |
| T-03 | AC-03 — Four-document boundary | Compare repository/document inventory and assert no new permanent document or parallel summary artifact. | Static/integrity | PASS | Deterministic inventory equals `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `SPEC.md`; no fifth permanent document or parallel artifact exists. |
| T-04 | AC-04 — Thin AGENTS/template parity | Run foundation and instruction tests and compare root/template projections for byte or semantic consistency as required. | Static/contract | PASS | Focused foundation/instruction/template suite passed 77/77; root and template AGENTS remained unchanged because their projections did not change. |
| T-05 | AC-05 — Commands, safety, provenance, surfaces, and deliberate boundaries | Validate every retained command/link/alias and assert GitHub-first, two-surface, evaluator, Node, model/effort, and publication wording against authoritative truth. | Static/compatibility | PASS | Contract assertions, 12 file references, 11 heading anchors, and 14/14 unique-fact checks preserve commands, aliases, safety, provenance, two surfaces, Node policy, exact-SHA delivery, and publication separation. |
| T-06 | AC-06 — Evaluator detail relocation without loss | Compare unique evaluator/security/evidence statements before and after and verify the primary README path no longer embeds deep chronology. | Manual/audit | PASS | README no longer embeds evaluator headings/Task chronology; evaluator commands/cost remain projected and lifecycle/security/evidence facts remain under Architecture §13. |
| T-07 | AC-07 — Repository documentation contracts | Run instruction-surface, foundation, template, link/reference, format, and package-selection tests. | Unit/package | PASS | Focused 77/77 and corrected 32/32 suites passed; final Stable passed 286/286, lint 69 modules, format 282 files, pack 39 files/92,971 bytes. |
| T-08 | AC-08 — Docs-only final diff | Classify every changed hunk and path, require zero runtime behavior change/new framework/new permanent document/publication, and run Stable plus hosted delivery. | Integrity/Stable | PASS | Exact eight-path planner selected STABLE; canonical pair validation, transaction inspection, diff check, and complete hunk review passed. Mutable hosted delivery remains external ledger evidence. |

## Regression Coverage

- Exact explicit Skill invocations and managed Task aliases, create/dispatch behavior projections, provenance rules, and `STANDARD` authority boundaries.
- Direct-Skills and plugin-cache installation guidance, Node 22/24/26 policy, commands, package identity, current release status, and superseded-candidate history.
- Unique filesystem, evaluator, credential, evidence, publication, and recovery safety constraints in their authoritative location.
- Four permanent documents, thin AGENTS/template parity, package allowlist, links/references, and absence of runtime/configuration changes.

## Commands

- `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs test/template-contracts.test.mjs test/kyw-task.test.mjs test/skill-installation.test.mjs` (initial and corrected focused runs).
- `node --test test/instruction-surfaces.test.mjs test/kyw-task.test.mjs test/kyw-audit.test.mjs` (focused correction).
- `npm run verify:plan -- README.md docs/SPEC.md docs/ARCHITECTURE.md docs/tasks/0046-permanent-documentation-and-scope-simplification/TASK.md docs/tasks/0046-permanent-documentation-and-scope-simplification/TEST.md test/instruction-surfaces.test.mjs test/kyw-task.test.mjs test/kyw-audit.test.mjs`.
- `npm run check` (initial stopped run and corrected full run).
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0046-permanent-documentation-and-scope-simplification`.
- Canonical validation of every `docs/tasks/NNNN-*` pair with the same validator; `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Inline deterministic local Markdown file/anchor, four-template inventory, and order-independent 14-fact ownership checks.
- `git diff --check`, exact changed-path inventory, complete bounded diff review, and final AC-to-test review.
- External after this repository verdict: exact-head pull-request CI and post-merge `main` CI through the `STANDARD` GitHub ledger.

## Results

- Fresh preflight confirmed exact clean `main` SHA `b0763337849af5ecde3ee28a0fe055486aa8cc51`, only the pre-created 0046–0047 pairs, no active Git/installer/Task transaction, and a freshly satisfied exact-SHA delivery ledger through Task 0045.
- Canonical continuous dispatch selected Task 0046 as the lowest eligible `READY/READY` pair with dependencies 0043/0044/0045 satisfied.
- Initial current-pair validation passed.
- README changed from 40,439 bytes/338 lines to 17,922 bytes/221 lines and now exposes purpose, installation choice, four explicit Skills, first workflow, and current release status before maintainer/evaluator detail.
- The initial focused suite returned 71/74 because three legacy static assertions required removed README chronology or duplicated normative wording. After those tests were updated to their canonical owners and concise projections, the same suite passed 77/77.
- The first `npm run check` stopped during tests on one further legacy audit README assertion. The corrected focused audit/Task/instruction run passed 32/32; the repeated `npm run check` then passed 286/286 tests in 46.5 seconds, lint across 69 JavaScript modules, format across 282 UTF-8/LF text files, and package selection across 39 files and 92,971 bytes.
- Local-reference review resolved 12 Markdown file references and 11 heading anchors. The first unique-fact checker used an order-sensitive combined pattern and rejected Architecture even though both required facts existed; the corrected order-independent checker passed all 14 facts.
- Final exact-path planning selected `STABLE` for the eight Task-owned paths and one `npm run check` command. Current-pair and all 47 canonical pair validations passed; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`; `git diff --check` passed.
- Complete path/hunk review found only README, SPEC, ARCHITECTURE, three contract tests, and this Task/Test pair. Root/template AGENTS, runtime, package/configuration, dependencies, CI, and the untouched future Task 0047 pair did not change; no framework, fifth document, publication, registry, tag, Release, or public submission was introduced.

## Unverified

- None — T-01 through T-08 and all repository verification are complete. Exact-head pull-request CI and post-merge `main` CI are subsequent mutable external ledger evidence and are not claimed here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
