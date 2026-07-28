# TASK 0055 — Compact Permanent Documents and Add Growth Guardrails

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Compact the four permanent documents around one canonical owner per rule family, preserve the current product, safety, compatibility, delivery, and publication contracts, and extend the existing deterministic validation surface so progressive context loading and future document growth remain bounded and independently verifiable.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Rewrite `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md` as current durable truth instead of shortening sentences in place. Replace or merge the identified oversized sections, retain readable headings and prose, and keep the same four paths and roles.
- Keep README focused on purpose, installation choices, five explicit Skills, portable invocations and managed aliases, direct/plugin setup, supported environments, contributor commands, current publication boundary, and links to SPEC and ARCHITECTURE.
- Keep AGENTS as a compact repository-wide source-of-truth, one-active-Task, routing, preservation, documentation-ownership, evidence-honesty, completion, and separate-authority contract.
- Keep SPEC focused on observable product behavior: goals/non-goals, five-Skill contracts, Task/Test states and queue behavior, CLI behavior, evidence requirements, compatibility, safety, distribution, acceptance, and publication boundaries.
- Keep ARCHITECTURE focused on stable context, principles, component groups, authority and dependency direction, authoring and implementation/delivery flows, artifact runtime groups, installation/distribution boundaries, validation/CI boundaries, and portability/isolation trade-offs.
- Move detailed authoring, execution/resume/delivery, and audit procedure ownership back to `skills/kyw-task/SKILL.md`, `skills/kyw-impl/references/execution.md`, and `skills/kyw-audit/references/audit.md`; retain only the product or architecture projection needed on another surface.
- Keep deterministic algorithms, implementation constants, and exhaustive edge cases in source/tests. Keep current plan/evidence in the current Task/Test pair, historical evidence in historical Task/Test pairs, and mutable PR/Actions/review/merge identities in GitHub.
- Replace unconditional permanent-document loading in the repository rules and relevant Task authoring, implementation, and audit procedures with deterministic targeted loading and fail-closed full-read escalation. Keep `kyw-init`, rebaseline, major redesign, broad cross-owner changes, source conflicts, and unresolved targeted truth as full-read cases.
- Extend the existing foundation/instruction/document validation and its existing tests, templates, and Skill projections only as needed for path inventory, byte budgets, chronology, evidence leakage, canonical owner/projection, stale-command, growth-evidence, and progressive-loading checks.
- Preserve current templates and readers, including the current contract-v2 marker, Task schema, status pairs, hard-dependency grammar, legacy compatibility, one-active-Task selection, and the single deterministic Task/runtime/delivery engine.
- Record exact before/after UTF-8 bytes and line counts for every permanent document and the combined set in this Test during implementation.

## Out of Scope

- A fifth permanent document, generated summary mirror, documentation framework, database/index service, daemon, watcher, background job, mandatory LLM grader, fuzzy-similarity CI requirement, or production dependency.
- Duplicating the Skill/runtime engine, creating a generic transaction or documentation subsystem, or moving deterministic procedure into permanent documents.
- Rewriting any historical Task/Test pair, preserving chronology by copying it elsewhere in a permanent document, or changing GitHub's role as the mutable exact-SHA delivery ledger.
- Changing the package/plugin version from `0.1.0`, adding a registry probe, publishing, changing a version, creating a tag or GitHub Release, submitting a public plugin, or interpreting candidate/CI evidence as publication authority.
- Application behavior changes, installer/runtime redesign, CI topology redesign unrelated to reaching the existing validation from CI, model-backed evaluation, or unrelated cleanup.
- Meeting a byte target by collapsing prose into long lines, deleting a required contract, replacing owner content with empty links, or leaving a rule family without a canonical owner.

## Acceptance Criteria

- [x] AC-01: The permanent-document set remains exactly `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`; their established roles remain intact and no new permanent document or generated mirror is added.
- [x] AC-02: The compacted documents retain the current product behavior and five-Skill structure, `kyw-task` author-only and `kyw-impl` existing-Task-only boundaries, independent audit, explicit-only invocation, single deterministic Task/runtime/delivery engine, current contract marker and Task schema, status/dependency grammar, one-active-Task rule, current/legacy readers, user-work preservation, evidence honesty, acceptance-specific verification, `HARDENED_EXACT_HEAD` `STANDARD` delivery, direct/plugin installation safety, ordinary small-prompt behavior, version `0.1.0`, and separate publication/registry/version/tag/Release authority.
- [x] AC-03: SPEC owns observable product contracts and acceptance while ARCHITECTURE owns stable components, boundaries, dependency direction, control/data flow, distribution structure, and present-tense trade-offs; neither retains the other owner's detailed material.
- [x] AC-04: Task authoring, existing-Task execution/resume/verification/docs/delivery, and independent audit procedures are owned by their respective Skill/reference; deterministic algorithms, implementation constants, and exhaustive edge cases are owned by source/tests; current and historical evidence remain in current/historical Task/Test and GitHub instead of permanent documents.
- [x] AC-05: Every guarded rule family has one declared canonical owner and only an explicit minimal projection on other surfaces; duplicated detailed procedures and ownerless retained rules fail deterministic validation.
- [x] AC-06: Implementation records before/after UTF-8 bytes, line counts, and percentage change for all four documents and their combined total; without contract loss or unreadable line folding, README is at most 18,432 bytes, AGENTS at most 4,096 bytes, SPEC at most 34,816 bytes, ARCHITECTURE at most 49,152 bytes, and the combined set at most 106,496 bytes, or the Task remains blocked with the exact retained contract and smallest safe alternative recorded instead of silently relaxing a target.
- [x] AC-07: AGENTS satisfies the 4,096-byte compaction target and the validator separately enforces a future 8,192-byte hard ceiling, including deterministic boundary cases at 4,096/4,097 and 8,192/8,193 bytes.
- [x] AC-08: Exact path inventory, per-document and combined size policy, mutable chronology, Task/Test evidence leakage, owner/projection, duplicated detailed procedure, and stale-command checks run through the existing foundation/instruction/document validation reached by ordinary CI; no fuzzy or model-backed grader is required.
- [x] AC-09: A permanent-document change records a four-document plus combined before/after byte-and-line delta in the current TEST evidence. A per-document increase of at least 2,048 bytes, a positive increase satisfying `increase * 100 >= before * 10`, or any positive combined net increase additionally requires mapped durable-necessity and replacement/absorption evidence; warning/hard budget changes require the reason existing sections cannot absorb the meaning, the new durable meaning, before/after bytes, removed or replaced duplication, explicit Task acceptance, and explicit user approval, and are never automatic.
- [x] AC-10: Progressive loading always reads applicable AGENTS and the selected/current TASK/TEST when they exist, first indexes or searches README/SPEC/ARCHITECTURE, then reads only owner sections indicated by Goal, scope, Documentation Impact, and changed code; `kyw-init`, rebaseline, major redesign, broad cross-owner change, source conflict, or inability to establish durable truth from targeted sections escalates to a full permanent-document read and fails closed on unresolved conflict.
- [x] AC-11: Focused mutation tests and integration regressions prove current/legacy Task readers, five Skills, installer, package selection, behavioral acceptance, instruction surfaces, CI reachability, and ordinary `STANDARD` delivery contracts did not regress; a generic full-suite PASS alone does not satisfy this criterion.
- [x] AC-12: The final diff changes no historical Task/Test pair, package/plugin version, registry/publication state, tag, or GitHub Release state, and performs no unrelated cleanup.

## Plan

- [x] Re-prove the exact current `main`, branch/upstream, clean worktree, active queue, and transaction state; establish a current-main implementation base while preserving this newly allocated pair.
- [x] Build a retained-contract inventory from the four documents and the canonical Skills/references, then map each oversized section to replace, merge, shorten to a projection, or remove.
- [x] Compact README and AGENTS first, preserving the user/contributor entry contract and replacing the unconditional read-all rule with the thin progressive-loading invariant.
- [x] Compact SPEC around observable behavior and acceptance, removing authoring/execution/audit procedure, transaction ordering, internal payload examples, algorithms, exhaustive edge cases, and chronology while retaining required public contracts.
- [x] Compact ARCHITECTURE around stable component groups, dependency/control flows, distribution/validation boundaries, and trade-offs, replacing the exhaustive repository/module/test/evaluator inventories and implementation constants.
- [x] Align only the affected canonical Skill/reference and generated AGENTS template projections with progressive loading, evidence ownership, and growth-delta procedure; do not duplicate an execution or audit checklist.
- [x] Extend `scripts/lib/validate-foundation.mjs` and existing focused tests with one deterministic permanent-document policy registry, budget/delta validation, explicit owner/projection anchors, forbidden chronology/evidence/procedure patterns, and command-reference validation.
- [x] Replace current instruction assertions that require historical README chronology with present-publication-boundary assertions, and add deterministic positive/negative mutation cases for every guardrail and progressive-loading escalation.
- [x] Measure final bytes/lines, record the exact delta evidence, run acceptance-specific focused checks plus the final planner-selected regression tier, inspect package impact, validate this pair, and review the complete final diff against AC-01 through AC-12.

## Decisions

- Compaction and growth prevention are one atomic outcome. Compaction alone would regress through future append-only edits, while a guardrail alone would canonize the oversized baseline.
- The four permanent documents keep their current paths. No additional index, summary, history, or generated document is introduced.
- Existing sections are replaced or merged instead of receiving a chronology appendix:
  - README `Release status` becomes a current publication boundary without Task/PR/run/candidate chronology; `Task routing and evidence` becomes a concise command/outcome projection; development retains supported commands but delegates release-harness algorithms and evaluator internals.
  - AGENTS merges repeated lifecycle/checklist prose into thin routing, preservation, evidence, documentation-owner, progressive-loading, and completion invariants with links to canonical procedure.
  - SPEC keeps observable five-Skill, CLI, artifact-state, evidence, safety, compatibility, distribution, acceptance, and publication contracts while replacing step-by-step agent/transaction procedure with concise behavior requirements.
  - ARCHITECTURE replaces the full tree, per-module inventory, per-fixture/test catalog, evaluator constants, transaction sequences, and historical references with stable component groups, dependency directions, high-level flows, invariants, and current trade-offs.
- Canonical procedure owners remain `skills/kyw-task/SKILL.md`, `skills/kyw-impl/references/execution.md`, and `skills/kyw-audit/references/audit.md`. Templates own artifact shape; source/tests own deterministic mechanics and exhaustive cases. Other surfaces may carry only a named, tested projection.
- `scripts/lib/validate-foundation.mjs` remains the deterministic policy owner and existing foundation/instruction tests remain the CI entry. The design may add pure helpers inside that existing surface but must not add a documentation framework or production dependency.
- One explicit registry will enumerate each guarded rule family, canonical owner, allowed projection paths/anchors, and exact forbidden detailed anchors. Checks use exact strings, bounded regular expressions, structural headings, and declared command/path lookup; they do not use fuzzy similarity percentages or an LLM.
- One-time compaction acceptance targets are distinct from future budgets:

  | Document | Compaction target | Future warning | Future hard |
  |---|---:|---:|---:|
  | `README.md` | 18,432 B (18 KiB) | 20,480 B (20 KiB) | 24,576 B (24 KiB) |
  | `AGENTS.md` | 4,096 B (4 KiB) | 4,096 B (4 KiB target) | 8,192 B (8 KiB) |
  | `docs/SPEC.md` | 34,816 B (34 KiB) | 40,960 B (40 KiB) | 49,152 B (48 KiB) |
  | `docs/ARCHITECTURE.md` | 49,152 B (48 KiB) | 57,344 B (56 KiB) | 65,536 B (64 KiB) |
  | Combined | 106,496 B (104 KiB) | 114,688 B (112 KiB) | 131,072 B (128 KiB) |

- Exceeding a warning is not silently accepted: it requires the same current-Task delta and durable-necessity evidence. Exceeding a hard value fails until a separately authorized policy change supplies all AC-09 evidence; validators never raise a limit from observed bytes.
- Permanent-document delta evidence stays in the existing TEST `Results`/matrix rather than a new section or file. It includes all four paths plus combined before/after UTF-8 bytes and lines, signed deltas, integer percentage calculation, the canonical owner of added meaning, and what existing duplicate was replaced or why absorption was impossible.
- Progressive context loading is fail-closed. The always-loaded context is applicable AGENTS plus the selected/current pair when one exists. README/SPEC/ARCHITECTURE are first indexed by heading or targeted search; Goal, scope, Documentation Impact, changed paths, and code dependencies select owner sections. Any broad/conflicting/uncertain case escalates to a full read. `kyw-init` remains a full-read workflow.
- Current publication truth may say version `0.1.0` is implemented but unpublished and that publication/registry/version/tag/Release/public submission need separate authority. Exact historical candidate identities and outcomes remain only in historical Task/Test and GitHub.

## Risks

- Aggressive deletion could remove a safety or compatibility contract hidden inside procedural prose. The retained-contract inventory and AC-02 mutation tests must prove each named contract directly before size acceptance.
- Exact anchor checks can be too broad and reject legitimate observable words such as `SHA`, `candidate`, or CLI exit codes. Patterns must target mutable identities, historical chronology, copied evidence headings, and procedure-only anchors while retaining generic product vocabulary.
- Owner/projection validation can become another duplicated rule catalog. Keep one compact registry in the existing validator and test its own canonical-owner uniqueness and allowed projections.
- Progressive loading can miss a cross-owner requirement. Selection must derive from four explicit signals and escalate on broad scope, conflict, or insufficient truth; tests must include false-narrowing attempts.
- Byte targets could be unsafe after retained-contract review. Do not relax them implicitly: block and record the exact indispensable text and the smallest safe alternative for user decision.
- Source-level validation changes are package/release-sensitive under the existing verification planner. Run the planner-selected non-publishing verification, but do not cross registry or publication authority.

## Discoveries and Changes

### Repository baseline

- Expected and observed current `main`: `fc0703db8b81c33ac414805fcb1fff8f5e994246` at local `main`, cached `origin/main`, direct `ls-remote`, and GitHub `main`.
- Current branch: `task/0054-harden-pr-ci-actual-head-evidence`; HEAD and upstream are `74ea1f649f30167df874418b9796e566667ae189`.
- HEAD is zero commits ahead and one merge commit behind `main`, but both resolve to tree `4e84c44728b364a07b5738efa9455c7a6c8ab193`. This is content-equivalent, not permission to implement from a stale identity; implementation must re-prove and establish current exact-main ancestry.
- Staged, unstaged, and untracked path sets were empty before authoring. There was no open PR to `main`.
- The queue contained 54 complete pairs: 48 `DONE/PASSED`, five `BLOCKED/BLOCKED`, one `CANCELLED/BLOCKED`, and zero active, DRAFT, READY, or IN_PROGRESS pairs. Latest Task 0054 was `DONE/PASSED`.
- Packaged transaction inspection returned `state: NONE`, `category: NO_TRANSACTION_EVIDENCE`; no lock, staging root, release marker, partial directory, or creation residue was observed.
- Package and plugin versions are both `0.1.0`; the package declares no dependency or devDependency field. Exactly five Skills exist and each declares explicit-only invocation.

### Permanent-document baseline

| Document | UTF-8 bytes | Lines | Heading structure |
|---|---:|---:|---|
| `README.md` | 21,605 | 245 | H1 × 1, H2 × 8, H3 × 8 |
| `AGENTS.md` | 4,489 | 75 | H1 × 1, H2 × 8 |
| `docs/SPEC.md` | 47,998 | 616 | H1 × 1, H2 × 20, H3 × 31 |
| `docs/ARCHITECTURE.md` | 93,002 | 973 | H1 × 1, H2 × 36, H3 × 19 |
| Combined | 167,094 | 1,909 | Four existing documents |

The fresh measurements exactly match the prior read-only baseline supplied by the user.

### Ownership and duplication findings

- Task-authoring detail appears in README's routing section, SPEC's `$kyw-task` numbered procedure, ARCHITECTURE's `kyw-task` mechanics and lifecycle transaction sequence, and the canonical `kyw-task` Skill.
- Existing-Task execution, resume, evidence, documentation sync, and delivery detail appears in README routing, AGENTS routing/lifecycle/completion, SPEC's long `$kyw-impl` and Test lifecycle sections, ARCHITECTURE's `kyw-impl` and lifecycle flows, and the canonical execution reference.
- Audit mode, command grammar, finding fields, repair procedure, and verdict detail appears in SPEC and ARCHITECTURE as well as the canonical audit Skill/reference.
- Installer safety appears as useful user behavior in README and SPEC, but lock/hash/rollback ordering is repeated in SPEC and especially ARCHITECTURE instead of remaining an implementation algorithm behind a stable transaction invariant.
- Task/Test section lists and evidence-field procedure are repeated across SPEC, ARCHITECTURE, AGENTS, and the execution/audit references; templates already own exact shape.
- README retains Task-specific release and release-harness chronology, SPEC retains “after Task 0009,” and ARCHITECTURE retains Task 0001/0009/0011/0012/0026/0027 references and fixture/run history. No full exact 40-character SHA was found in the four documents.
- ARCHITECTURE contains exhaustive repository/module inventories, transaction steps, evaluator signal/timeout/retry/delay/log behavior, fixture inventories, unit/integration/Skill/E2E test catalogs, and historical benchmark evidence that belong in source/tests or historical Task/Test.

### Existing validation surface

- `scripts/lib/validate-foundation.mjs` validates package/plugin identity, version `0.1.0`, zero dependencies, five explicit-only Skills, canonical templates, legal bytes, package allowlist, and important owner-specific Skill anchors. It does not currently validate the actual four permanent-document byte set, budgets, chronology, delta evidence, or a generic canonical-owner registry.
- `test/foundation.test.mjs` reaches that validator through ordinary `npm test`; `test/instruction-surfaces.test.mjs` validates projections, local links, a README-only `< 24,000` limit, representative loaded bytes, installation guidance, and current routing/delivery anchors.
- The current README instruction test explicitly requires historical Task 0020/0029/0038/0047/0048 chronology. That assertion conflicts with current-truth ownership and must be replaced with present publication-boundary assertions.
- `scripts/format-check.mjs` already enforces UTF-8, no BOM, LF, final newline, trailing whitespace, and canonical JSON; `scripts/verification-plan.mjs` already routes permanent-document changes to foundation/instruction tests and format, and fails closed to higher tiers for runtime or release-sensitive changes.
- All `npm run <name>` references found in the permanent documents currently resolve to declared package scripts, and all referenced `node ./...mjs` command paths exist. There is no general stale-command guardrail preventing future drift.
- Hosted CI reaches unfiltered `npm test`, lint, format, and package checks. Extending the existing validator/tests therefore adds the guardrail to the existing CI surface without a new workflow framework.
- Implementation preflight found that two planned TEST commands used the provisional nonexistent slug `0055-doc-compaction-guardrails`; both were corrected to this pair's actual directory before execution.

### Implementation findings

- The compacted permanent set is 81,778 UTF-8 bytes and 1,354 lines, down 85,316 bytes (51.06%) and 555 lines. Every per-document and combined one-time target is satisfied without long-line folding; exact rows are bound to current bytes in TEST Results.
- README now owns current install/use/contributor entry and publication state, AGENTS owns four thin rule sections, SPEC owns observable behavior and acceptance, and ARCHITECTURE owns stable structure and present-tense trade-offs. Historical identities, detailed procedure, exhaustive catalogs, and implementation constants were removed from permanent truth.
- Progressive loading is projected through root and generated AGENTS plus the init, authoring, implementation, and audit owners. The representative template/authoring/implementation instruction bundle is 36,367 bytes, below its prior 36,382-byte bound despite adding the fail-closed loading contract.
- Renaming and merging the generated AGENTS headings exposed a real production contract dependency in `src/core/template-contracts.mjs`; the canonical required-section registry and its focused compatibility test were synchronized rather than weakening foundation validation.

## Documentation Impact

- SPEC: Compact to observable product behavior, requirements, safety/compatibility/distribution, evidence, acceptance, and publication boundaries; add durable ownership, growth, and progressive-loading product requirements while removing procedure, algorithms, catalogs, and chronology.
- ARCHITECTURE: Compact to stable components, boundaries, dependency/control flows, direct/plugin distribution, validation/CI boundary, transaction invariants, and trade-offs; describe the deterministic document-policy component and progressive-loading flow without implementation constants.
- README: Compact to purpose, install/setup/usage/commands/contributor entry, five Skills, portable/managed invocations, supported environments, and current publication summary; remove historical release and harness procedure.
- AGENTS: Compact below 4 KiB as the repository-wide invariant/routing/completion surface; replace unconditional full reads and long procedure projections with fail-closed progressive loading and canonical links.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Re-ran read-only Git/local-remote-GitHub main, branch/upstream, worktree, open-PR, Task queue, transaction/residue, version, Skill, document-size/heading, canonical-owner, chronology, algorithm/catalog, and validation-surface inspection.
- Confirmed one atomic independently verifiable outcome, no hard dependency, no active Task, no unexplained user work, no creation residue, and no authoring blocker.
- Authored the complete acceptance and test contract before implementation and preserved its baseline measurements and lifecycle evidence.
- Re-proved local, cached, direct-remote, and GitHub `main` at `fc0703db8b81c33ac414805fcb1fff8f5e994246`; verified the old 0054 branch had the same tree, the only worktree bytes were this untracked pair, no transaction or open PR existed, and no active Task existed.
- Reconstructed trusted delivery continuity for the 24 repository-complete current Tasks from local Git ancestry plus fresh GitHub API/job-log evidence: 23 pre-hardened Tasks use legacy continuity at anchor `4463051d2bd073048321b09f0b6524ea31fb8f80`, while Task 0054 uses the full `HARDENED_EXACT_HEAD` graph. The packaged dispatcher selected Task 0055 with `IMPLEMENT`, then `RESUME`, under `STANDARD_LIFECYCLE` authority.
- Created and switched to `task/0055-compact-permanent-documents-and-add-growth-guard` directly from exact current `main`, preserving this pair unchanged.
- Rewrote all four permanent documents around their canonical owners and met every one-time byte target; recorded the exact four-row plus combined delta evidence in TEST Results.
- Replaced unconditional full-document loading with targeted heading/index selection and fail-closed full-read escalation across AGENTS, the generated template, and the canonical init/authoring/implementation/audit procedures.
- Synchronized the generated AGENTS template's new four-section shape with the production template contract and added a focused missing-section regression; the focused template-contract suite passed 8/8.
- Added one exact permanent-document policy/ownership/projection registry, immutable compaction and future-budget contracts, chronology/evidence/procedure/stale-command guards, progressive-loading selection, chained Task delta evidence, and explicit budget-change approval validation.
- Ran the final 80-test focused bundle, six-scenario direct behavioral acceptance, exact-path verification planner, and its non-publishing `npm run release:ci` gate; all final commands passed, including 333/333 aggregate tests, lint, format, pack, and the isolated release candidate.
- Reviewed the complete 19-path final inventory and diff against AC-01 through AC-12. No historical Task/Test, package/plugin version, dependency, registry/publication, tag, Release, or unrelated path changed.

## Remaining

- None — the repository outcome and reproducible acceptance evidence are complete; mutable GitHub PR/Actions delivery remains the canonical external queue gate.

## Resume Point

- None — repository implementation needs no resume; continue ordinary `STANDARD` delivery from exact-path staging without crossing publication or destructive boundaries.

## Blockers

- Not applicable — no blocker is known.
