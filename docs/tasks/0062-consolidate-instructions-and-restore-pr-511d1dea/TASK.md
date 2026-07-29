# TASK 0062 — Consolidate Instructions and Restore Prompt Headroom

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Consolidate duplicated kyw-dev instruction and evidence wording into its existing canonical owners so the fixed representative authoring/implementation bundle falls from 36,849 bytes to at most 32,768 bytes, restoring at least 4,096 bytes and 1,024 estimated tokens of headroom without raising any limit or changing observable workflow, safety, approval, Task/Test, continuity, immutability, exact-SHA delivery, installation, or publication behavior.

## Dependencies

- Task 0061.

## In Scope

- Build a rule-family inventory across root and generated repository instructions, all five Skill entry surfaces and their references, canonical Task/Test templates, permanent owner projections, and the deterministic instruction/document validation registry before removing wording.
- Keep one owner for each rule family: SPEC for observable product contracts, ARCHITECTURE for stable ownership and flow, root AGENTS for repository routing and completion invariants, `skills/kyw-task/SKILL.md` for authoring, `skills/kyw-impl/references/execution.md` for existing-Task execution and delivery procedure, `skills/kyw-audit/references/audit.md` for independent audit procedure, and Task/Test templates for exact artifact and evidence shape.
- Replace repeated normative or evidence-format blocks on non-owner surfaces with the smallest projection needed before the owner is loaded; retain explicit links and deterministic semantic-parity checks.
- Consolidate `AGENTS.md`, `templates/project/AGENTS.md`, `skills/kyw-task/SKILL.md`, `skills/kyw-impl/SKILL.md`, `skills/kyw-impl/references/execution.md`, and canonical Task/Test evidence wording as justified by the owner map. Touch other Skill entry/reference text only when the same map proves a duplicated generic rule and its owner remains directly loadable.
- Reduce the unchanged four-path representative bundle—`templates/project/AGENTS.md`, `skills/kyw-task/SKILL.md`, `skills/kyw-impl/SKILL.md`, and `skills/kyw-impl/references/execution.md`—to at most 32,768 UTF-8 bytes and at most 8,192 estimated tokens while retaining the existing 36,864-byte and 9,216-token guards, the same four paths, and no extra required file or tool read.
- Update deterministic owner/projection, instruction-surface, template, and focused Skill tests so they assert canonical semantics and minimal projections without requiring copied prose.
- Preserve every pre-existing numbered Task/Test byte. Permit the rolling continuity checkpoint to advance only through the ordinary opaque selected-Task transition; do not hand-edit, rebaseline, or replace it.
- Verify source checkout, direct installation, and packed/plugin Skills retain identical meaning with package/plugin version, dependency fields, lifecycle policy, and publication state unchanged.

## Out of Scope

- Changing any observable product behavior, workflow routing, acceptance meaning, status/dependency grammar, delivery classification, evidence threshold, or external authority boundary.
- Editing, renaming, deleting, reformatting, or reopening Tasks 0001 through 0061 or their Test files, including Task 0061's immutable terminal evidence.
- Changing Task artifact readers, queue, batch transaction, dispatcher, hydration, delivery evaluator, checkpoint schema, continuity algorithm, or exact-SHA runtime mechanics.
- Raising or weakening representative instruction limits, permanent-document warnings or hard limits, AGENTS targets, package limits, or verification gates.
- Moving equivalent prose into a new required reference, generated summary, configuration file, permanent document, prompt framework, or extra automatic context read.
- Broad stylistic rewriting of unaffected Skills, permanent documents, source modules, tests, or historical evidence.
- Changing the configured model or reasoning effort; running model-backed evaluators without separate acceptance need and explicit cost authority.
- Publication, registry/version/tag/Release/public submission, force or destructive recovery, workflow reruns, bypasses, branch deletion, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: Every in-scope instruction and evidence rule family has exactly one named canonical owner; necessary projections are minimal, directly traceable to that owner, and deterministic tests reject missing owners, stale projections, unlisted copies, or ownerless semantics.
- [x] AC-02: The fixed four-path representative bundle measures no more than 32,768 UTF-8 bytes and 8,192 estimated tokens, creating at least 4,096 bytes and 1,024 estimated tokens of headroom while the existing 36,864-byte and 9,216-token limits, four-path inventory, and three-path permanent index remain unchanged.
- [x] AC-03: The five explicit-only Skills preserve their exact invocation and stop boundaries: grilling remains fileless, initialization still requires confirmed shared understanding, Task authoring publishes complete pairs and stops, implementation acts only after selected existing-Task dispatch, and audit repair still requires the literal fix form.
- [x] AC-04: User-work preservation, inspect-first and fail-closed behavior, model/effort preservation, truthful executed evidence, and separate authority for publication, registry/version/tag/Release/public submission, force/destructive work, reruns, bypasses, branch deletion, and unrelated mutation remain semantically unchanged.
- [x] AC-05: Task/Test templates and readers retain canonical sections, five-field provenance, mapped stable acceptance/test IDs, reasoned inapplicability, honest failure/blocking history, supported lifecycle pairs, hard dependencies, one-active selection, atomic authoring, compaction handoff, final-diff coverage, and terminal validation without rewriting earlier pairs.
- [x] AC-06: Rolling continuity retains aligned-main trust, fixed-bounded checkpoint coverage, at most one freshly hydrated predecessor, causal transition application, gap/rebaseline failure, expired-covered-log behavior, immutable future terminal pairs, report-only delivered invocation, hard-dependent correction routing, and prior-contract grandfathering.
- [x] AC-07: `HARDENED_EXACT_HEAD` retains distinct actual PR-head, synthetic merge compatibility, reviewed protected merge, and post-merge main roles with exact repository/workflow/run/attempt/job/checkout identities; missing, stale, reused, mismatched, or incomplete evidence still fails closed and CI never substitutes for behavioral acceptance.
- [x] AC-08: Root and generated AGENTS wording remains semantically aligned and below existing limits; README, SPEC, and ARCHITECTURE durable meaning remains unchanged; any permanent-document edit records exact before/after byte and line evidence without changing warning or hard budgets.
- [x] AC-09: Source, direct user/project, and packed/plugin installations expose the same five Skill contracts; package/plugin version `0.1.0`, zero dependency fields, lifecycle-script absence, package allowlist, legal bytes, and unpublished authority remain unchanged.
- [x] AC-10: Focused owner/projection and Skill checks, Task/runtime/delivery regressions, direct behavioral fixtures, planner-selected non-publishing verification, package inspection, all prior-pair hash comparison, pair/queue validation, complete diff mapping, and whitespace checks pass with no out-of-scope path or unverified required branch.

## Plan

- [x] Re-prove Task 0061 repository and external delivery satisfaction, aligned-main/checkpoint state, clean worktree, pair inventory, transaction state, exact instruction measurements, and the immutable Tasks 0001–0061 hash baseline before mutation.
- [x] Enter the selected pair lifecycle, apply only any opaque predecessor-continuity transition returned by dispatch, and record the exact pre-change rule-family owner/projection and byte inventory.
- [x] Remove duplicated blocks from non-owners, keeping readable minimal projections and direct links while leaving permanent product/architecture/user meaning unchanged.
- [x] Consolidate generic Task/Test evidence wording around the canonical templates and procedure owners without weakening live evidence, audit, compaction, failure-history, or provenance requirements.
- [x] Update deterministic validation and mutation tests for owner uniqueness, minimal projections, unchanged guards, the 32 KiB target, path-count stability, and semantic retention.
- [x] Run focused Skill/template/instruction and Task/delivery suites, direct behavioral acceptance, exact changed-path planning, and the required Stable or Release checks for packaged instruction bytes.
- [x] Compare all prior pair hashes, validate every pair and the queue, inspect package/publication boundaries and the full final diff, record permanent-document deltas if applicable, and close every matrix row before terminal status.

## Decisions

- Keep one Task because deleting duplication and proving semantic retention form one atomic outcome; splitting measurement from contract verification would permit a smaller but unsafe instruction surface or a safe surface without the requested headroom.
- Depend directly on Task 0061 because this outcome corrects the prompt-headroom regression only after its future-terminal immutability contract is delivered; the predecessor pair remains byte-immutable.
- Define substantial headroom as a fixed 32 KiB target under the unchanged 36 KiB guard. This restores at least 4 KiB, approximately 1,024 estimated tokens, instead of accepting another near-limit pass.
- Keep the representative bundle's four files and existing permanent index fixed so savings cannot be manufactured by moving equivalent mandatory text into another automatic read.
- Prefer owner links, concise semantic projections, and structural tests over identical paragraphs or brittle exact-sentence assertions; unique safety or approval meaning is retained even when wording changes.
- Treat this as behavior-preserving packaged-instruction work with `STANDARD` delivery; no runtime schema, algorithm, dependency, version, publication, or model-setting change is justified.

## Risks

- Removing text from a projection may delete the only rule available before its detailed owner is loaded; owner-map and surface-specific mutation tests must prove load-order sufficiency.
- Exact-string tests may encode duplication rather than behavior; replacing them carelessly could weaken a contract, so each removed assertion must relocate to the owner and retain a minimal projection check where required.
- A byte target can encourage dense or ambiguous prose; semantic parity, readability review, and explicit safety/approval regressions remain acceptance gates independent of size.
- Consolidating evidence wording may accidentally weaken failure retention, provenance, blocking, audit, or compaction handoff requirements; template and execution/audit tests must exercise each branch.
- Normal continuity advancement for Task 0061 is allowed only through the opaque adapter transition; manual checkpoint editing or a second delivery interpretation would violate the prerequisite contract.
- Packaged Skill edits can drift between source, direct-install runtime, and plugin bytes unless distribution and package verification cover all surfaces.

## Discoveries and Changes

- Full reading of README, AGENTS, SPEC, and ARCHITECTURE found no unresolved authority conflict. The existing Architecture authority table already names canonical procedure and projection owners; this Task aligns wording to that durable design rather than changing product behavior.
- Local `HEAD`, `main`, and `origin/main` are aligned at merge `d5bd9400943165d5e160103f1209910c77e8d05b`; the worktree was clean before authoring.
- Task 0061 is `DONE/PASSED`, PR 49 is merged at the aligned main SHA, all displayed PR checks succeeded, and post-main CI run `30427211938` completed successfully. Implementation must still use ordinary production hydration rather than hand-supplied delivery claims.
- The rolling continuity checkpoint currently covers Task 0060 at main `4aa0d7dfea29b8980677a870d48a57b39f8092ef`, leaving exactly the expected one-outcome causal gap for Task 0061.
- The queue contains 61 pairs: 55 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, one historical `CANCELLED/BLOCKED`, and no active, ready, or draft pair before this authoring transaction.
- Transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`; no creation lock, staging residue, or partial pair was present.
- The representative bundle is 36,849 bytes and an estimated 9,213 tokens against unchanged limits of 36,864 and 9,216, leaving only 15 bytes and approximately three estimated tokens of headroom. Its path sizes are 3,075, 6,768, 4,660, and 22,346 bytes respectively.
- The four permanent documents total 93,225 bytes, 21,463 bytes below their 112 KiB combined warning. README, root AGENTS, SPEC, and ARCHITECTURE all remained byte-stable; only the generated AGENTS projection was consolidated.
- The exact Task/Test templates total 3,448 bytes and already own canonical evidence shape. The implementation Skill and execution reference, root/generated AGENTS, and several static tests repeat portions of routing, authority, provenance, lifecycle, and terminal evidence wording.
- Package/plugin version is `0.1.0`; dependency and development-dependency fields are absent, and no lifecycle or publication action is part of this outcome.
- Implementation preflight on 2026-07-29 revalidated the pair, found `NONE / NO_TRANSACTION_EVIDENCE`, and found 62 valid queue entries: 55 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, one historical `CANCELLED/BLOCKED`, this sole `READY/READY` pair, and no active pair.
- Local `HEAD`, local `main`, fetched `origin/main`, and direct remote `main` all equal `d5bd9400943165d5e160103f1209910c77e8d05b`; the only worktree paths before selection were this expected untracked Task/Test pair.
- The Tasks 0001–0061 implementation baseline contains 122 Task/Test files with deterministic manifest SHA-256 `d92573b2d2b9f1255084629ef43b1b4657f2558fced9972dbd4955c7914b6b39`.
- The sole packaged dispatcher call production-evaluated Task 0061 as `HARDENED_EXACT_HEAD`, selected Task 0062 for `IMPLEMENT`, and prepared one opaque causal continuity transition without a retry or manual delivery input.
- The opaque transition was applied exactly once on the selected active branch; the rolling checkpoint now covers Task 0061 at digest `178ce087bc71c109d389cfabb2d1605b3be2f58998e659a7d9c76bd7b42b4366`.
- The pre-change focused instruction/template baseline passed 78/78 tests.
- The representative bundle now measures 30,286 bytes and an estimated 7,574 tokens: 3,041 bytes for generated AGENTS, 6,613 for Task authoring, 4,209 for the implementation entry, and 16,423 for the execution owner. This removes 6,563 bytes / approximately 1,639 tokens and leaves 6,578 bytes / 1,642 estimated tokens below the unchanged guards.
- The deterministic registry now fixes 14 named rule families and guards every actual owner and required projection. Mutation tests blank each owner/projection, remove a required family, add an unlisted projection, and copy owner-only detail onto an unlisted surface.
- Generic provenance, artifact-shape, live-evidence, documentation-routing, verification-tier, and terminal wording now points to root AGENTS or the canonical Task/Test templates while the implementation reference retains the executable procedure.
- The first post-consolidation focused run failed 10 brittle or stale textual expectations across foundation, instruction, Task, and implementation tests. Semantic anchors and minimal load-order phrases were aligned without restoring copied blocks; the full focused command then passed 79/79.
- Runtime, delivery, continuity, and future-terminal regressions completed with 90 passes, no failures, and three explicit host/live skips; installation/distribution completed 48/48, and all six direct behavioral fixtures validated.
- Exact SHA-256 comparison found all 122 Task/Test files in Tasks 0001–0061 identical to `HEAD`, preserving manifest `d92573b2d2b9f1255084629ef43b1b4657f2558fced9972dbd4955c7914b6b39`; all 62 pairs, the queue, and the empty transaction state validated.
- The exact 12-path planner selected `RELEASE`. One full gate exposed a stale exact-sentence verification-plan assertion; after converting it to a semantic tier-order assertion, its focused 9/9 check and the complete `npm run release:ci` gate passed.
- The final non-publishing release gate passed 384/387 tests with three explicit skips and zero failures, then lint, format, 43-file package allowlist, and packed candidate verification at 128,837 bytes / SHA-256 `929e10c47c4139aa4822cc34a56fe44c07975210502084d64baf6841ca1fb511`.

### Final changed-path coverage

| Paths | Scope and matrix coverage |
|---|---|
| `templates/project/AGENTS.md`, `skills/kyw-task/SKILL.md`, `skills/kyw-impl/SKILL.md`, `skills/kyw-impl/references/execution.md` | Owner/projection consolidation and fixed-bundle headroom: AC-01–AC-09 / T-01–T-09. |
| `scripts/lib/validate-foundation.mjs` | Fixed 14-family inventory, exact owner/projection registry, and fail-closed missing/extra family validation: AC-01, AC-03–AC-09 / T-01, T-03–T-09. |
| `test/foundation.test.mjs`, `test/instruction-surfaces.test.mjs`, `test/kyw-impl.test.mjs`, `test/verification-plan.test.mjs` | Mutation coverage, unchanged limits/path inventories, semantic Skill/execution assertions, and planner-tier retention: AC-01–AC-04, AC-08, AC-10 / T-01–T-04, T-08, T-10. |
| `docs/tasks/.kyw-dev-standard-delivery-continuity.json` | Sole opaque causal transition covering delivered Task 0061: AC-06–AC-07 / T-06–T-07. |
| This `TASK.md` and `TEST.md` | Live scope, failures, commands, matrix, handoff, and terminal evidence only: AC-05, AC-10 / T-05, T-10. |

No README, root AGENTS, SPEC, ARCHITECTURE, canonical Task/Test template, package/plugin manifest, runtime, workflow, dependency, version, tag, Release, registry, or publication path changed.

### Pre-change rule-family owner/projection inventory

| Rule family | Canonical owner | Required minimal projections |
|---|---|---|
| Observable five-Skill invocation, stop, safety, delivery, installation, and publication contracts | `docs/SPEC.md` | README first-use/status guidance, root/generated AGENTS authority summaries, and concise Skill entry triggers |
| Stable component ownership, dependency direction, flows, and distribution | `docs/ARCHITECTURE.md` | README repository links and concise SPEC/Skill cross-references |
| Repository context loading, Task routing, user-work preservation, documentation routing, evidence honesty, and completion | Root `AGENTS.md` | `templates/project/AGENTS.md` plus the shortest portable load/preservation handshake in Task execution/audit owners |
| Fileless decision interview | `skills/kyw-grilling/SKILL.md` | README/SPEC/ARCHITECTURE outcome summaries |
| Initialization/adoption/rebaseline and four-document confirmation boundary | `skills/kyw-init/SKILL.md` | README/SPEC/ARCHITECTURE outcome summaries |
| Adaptive Task/Test authoring and atomic publication | `skills/kyw-task/SKILL.md` | README/SPEC/ARCHITECTURE/plugin invocation summaries only |
| Existing-Task selection, resume, verification, continuity, and delivery procedure | `skills/kyw-impl/references/execution.md` | `skills/kyw-impl/SKILL.md` dispatch handoff plus concise root/README/SPEC/ARCHITECTURE projections |
| Independent audit and literal bounded repair | `skills/kyw-audit/references/audit.md` | `skills/kyw-audit/SKILL.md` mode handoff plus README/SPEC/ARCHITECTURE summaries |
| Exact Task contract shape and lifecycle fields | `templates/task/TASK.md` | Authoring/execution/audit semantics and deterministic template validation |
| Exact Test evidence, five-field provenance, matrix, failure history, and final coverage shape | `templates/task/TEST.md` | Authoring/execution/audit semantics and deterministic template validation |

## Documentation Impact

- SPEC: Unchanged — observable behavior, acceptance, safety, continuity, immutability, and delivery contracts are retention sources, not change targets.
- ARCHITECTURE: Unchanged — the existing instruction-authority, projection, Task runtime, continuity, and exact-SHA structures already describe the intended canonical ownership.
- README: Unchanged — installation, invocation, usage, current release state, and contributor entry do not change.
- AGENTS: Root `AGENTS.md` is unchanged; only the generated template projection is consolidated, with routing, preservation, authority, and completion semantics retained by owner/projection tests.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded and reconciled the complete permanent-document set, the canonical execution procedure, this pair, and Task 0061/Test 0061 with no unresolved authority conflict.
- Revalidated aligned main and remote identity, the queue and transaction state, the exact 36,849-byte representative bundle, the permanent-document baseline, and all 122 prior Task/Test hashes.
- Called the packaged dispatcher exactly once with an empty verified execution preflight; it returned `SELECTED / IMPLEMENT / 0062`, ordinary `STANDARD` authority, and one opaque predecessor-continuity transition.
- Created branch `task/0062-consolidate-instructions-and-restore-pr-headroom` from verified main and entered the paired `IN_PROGRESS/RUNNING` lifecycle on 2026-07-29.
- Applied the opaque Task 0061 continuity transition exactly once; no transition payload was retained.
- Recorded the exact pre-change owner/projection inventory and confirmed the focused 78-test instruction/template baseline.
- Consolidated the four representative instruction paths to 30,286 bytes / 7,574 estimated tokens while retaining the unchanged four-path and three-permanent-index inventories and unchanged guards.
- Added a fixed 14-family owner inventory with owner/projection/ownerless mutation coverage and replaced brittle copied-prose assertions with semantic owner anchors.
- Passed the complete post-change focused foundation, instruction, template, and five-Skill command at 79/79 after retaining the initial 10-failure discovery.
- Passed Task/runtime/delivery regressions, direct behavioral fixtures, installation/distribution parity, exact prior-pair hash comparison, all-pair/queue/transaction inspection, and the planner-selected non-publishing Release gate.
- Reviewed and mapped the exact 12-path final scope, confirmed all permanent and package owners stayed unchanged, and passed final UTF-8/LF formatting and whitespace checks.
- Entered `DONE/PASSED`; the terminal pair and all 62 Task directories validate, the queue has 56 terminal successes and no active Task or error, and transaction inspection remains `NONE / NO_TRANSACTION_EVIDENCE`.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
