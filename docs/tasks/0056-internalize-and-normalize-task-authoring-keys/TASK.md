# TASK 0056 — Internalize and Normalize Task Authoring Keys

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Make ordinary `$kyw-task "<outcome>"` authoring accept product outcome/title input without exposing an internal task key or its length limit, while deriving a deterministic portable key and rejecting every invalid batch before transaction acquisition or Task ID/path allocation.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Change the production kyw-task authoring instructions and packaged adapter path so ordinary callers provide outcome/title content and the adapter derives the internal key before any transaction work.
- Define one deterministic normalization algorithm for ASCII, Unicode, punctuation-heavy, repeated-whitespace, separator-heavy, empty-normalization, long, and shared-prefix titles.
- Bound derived keys to 48 characters and add the smallest justified stable suffix only when truncation or an otherwise ambiguous normalized value needs collision resistance.
- Prevalidate batch keys, title slugs, dependency resolution, contract markers, rendered paths, payload size, complete Task/Test pairs, and graph validity before allocator or transaction hooks can run.
- Preserve the narrow explicit-key reader required by historical fixtures and low-level tests without presenting it as the normal production authoring surface.
- Extend authoring, adapter, transaction, contract, instruction-surface, compatibility, and package-selection regressions, then project only durable changed truth to the permanent documents.

## Out of Scope

- Recombining kyw-task authoring with kyw-impl implementation or delivery.
- Replacing the current or legacy Task readers, status/dependency grammar, single-active-Task rule, or deterministic runtime/delivery engine.
- Adding a database, registry, daemon, watcher, provider framework, random user-visible identifier, generic ID service, or production dependency.
- Redesigning installer ownership, force, doctor, recovery, publication, authentication, versioning, tags, GitHub Releases, or public submission.
- Rewriting historical Task/Test pairs or changing package/plugin version `0.1.0`.

## Acceptance Criteria

- [x] AC-01: The normal production kyw-task authoring surface accepts product outcome/title content and does not require a caller-authored task key, a manual short-key workaround, or knowledge of the 48-character internal bound.
- [x] AC-02: The packaged adapter derives one deterministic portable lowercase-ASCII key internally, rejects unusable input clearly, and never emits a key longer than 48 characters.
- [x] AC-03: Unit and adapter coverage deterministically handles normalized key lengths 0, 1, 47, 48, and 49, a very long title, Unicode, punctuation-heavy text, repeated whitespace/separators, values that normalize empty, and distinct long titles with the same prefix.
- [x] AC-04: Truncation or ambiguous normalization uses the smallest justified stable suffix that distinguishes source titles; it uses no database, registry, randomness, user-visible generic ID, or external service.
- [x] AC-05: Batch key uniqueness, title/slug validity, dependency resolution, contract-marker cardinality, final paths, serialized payload size, complete pair validity, and dependency graph validity all fail before Task ID/path allocation and before transaction acquisition or publication.
- [x] AC-06: Every rejected case allocates no Task ID or directory and leaves no lock, release marker, staging root, manifest, partial directory, payload file, or current-invocation scratch residue in or outside the repository.
- [x] AC-07: A low-level explicit-key reader may remain only where historical/test compatibility requires it; current and legacy readers keep working, while normal Skill instructions and the production adapter invocation no longer expose key authoring or its limit.
- [x] AC-08: Atomic contiguous allocation, complete-pair validation, one-shot transaction safety, rollback proof, author-only kyw-task behavior, user-work preservation, and all five explicit Skill boundaries remain intact.

## Plan

- [x] Specify the derived-key normalization and minimal stable-suffix rules from current contract and collision evidence before changing code.
- [x] Refactor the packaged production adapter so it derives keys and runs a side-effect-free complete-batch planning phase before allocator and transaction hooks.
- [x] Retain and label only the smallest compatibility entry for explicit keys, with no normal-Skill exposure.
- [x] Add positive, failure, boundary, collision, ordering, zero-residue, rollback, reader, instruction, and distribution tests.
- [x] Update only permanent-document owner sections whose durable behavior or boundary changes, run the exact changed-path verification plan, and audit the final diff against every acceptance criterion.

## Decisions

- This pair uses the current low-level explicit envelope key only because the behavior it removes has not yet been implemented; that transport detail is not the future product surface.
- Key derivation belongs in the packaged adapter's pure planning stage. Downstream transaction code consumes an already validated plan and does not invent or repair keys.
- Collision resistance is source-title deterministic and local to the normalized value; a global registry or probabilistic identifier would expand storage and failure boundaries without need.
- The canonical owner uses visible-title normalization, NFKC/lowercase, ASCII kebab folding, and an eight-hex SHA-256 suffix only for an empty/lossy/truncated base. Eight hex characters retain the prior smallest 32-bit fallback convention; collision freedom is not assumed, so batch and retained-manifest equality checks still fail closed.
- Exact IDs and paths are projected only after complete validation, then the ownership-proven transaction manifest atomically claims their allocation before publication; allocation hooks are observed only after lock acquisition.
- The implementation must prove validation ordering through observable hooks or equivalent seams, not infer it merely because a rejection eventually occurs.
- Package/plugin version remains `0.1.0`, no production dependency is added, and STANDARD delivery remains separate from publication authority.

## Risks

- Unicode folding can collapse distinct titles or normalize a title to no portable characters; the fallback and suffix rules must be stable across supported Node/OS combinations.
- A suffix that is too long wastes the portable key budget, while one that is too short can retain shared-prefix collisions; tests must justify the chosen minimum.
- Moving validation earlier can accidentally diverge from canonical pair/graph validators; the planning phase must reuse one contract owner rather than fork validation rules.
- Zero repository residue is insufficient if an adapter-created external payload survives; failure tests must inspect both transaction artifacts and the owned scratch path.

## Discoveries and Changes

- Read-only inspection found that the current production Skill tells authors to provide a lowercase ASCII key and exposes the 48-character constraint.
- `src/core/task-artifact-contract.mjs` currently truncates an ASCII slug at 48 characters and uses a deterministic fallback for titles with no portable slug, but long shared prefixes do not receive a collision suffix.
- `src/core/task-artifact-creation.mjs` validates the input envelope before transaction acquisition, then preallocates IDs/paths before rendered complete-pair and dependency-graph validation; this does not yet satisfy AC-05.
- Existing artifact tests already cover contiguous allocation, graph failures, lock ownership, rollback, races, adapter file transport, large payloads, and current/legacy compatibility; they are regression owners rather than evidence that this outcome is complete.
- The authoring-time preflight found 55 valid historical pairs through Task 0055, no active/READY/DRAFT pair, no transaction evidence, and no current-key scratch residue; implementation had not started at that observation.
- `deriveTaskKey` is now the sole production normalization/suffix owner and `slugifyTaskTitle` delegates to it. Missing batch keys derive internally; explicit low-level keys remain byte-preserved.
- Complete planning now validates payload, title/key/slug/path, dependencies, marker/status/sections/AC-to-T mapping, pair completeness, graph, and retained transaction collisions before allocation or transaction hooks. Invalid fixtures leave the tasks root absent and caller-owned payload bytes unchanged.
- The normal Skill, direct adapter, and packed adapter now exercise title-only single/batch authoring with `taskTitle` dependencies; the explicit-key compatibility fixture remains isolated.

## Documentation Impact

- SPEC: Added one observable requirement that outcome titles produce portable internal keys without caller shortening.
- ARCHITECTURE: Projected the side-effect-free key/planning boundary, transaction-owned allocation, and retained low-level explicit-key compatibility.
- README: Unchanged; it already showed outcome-only invocation and contained no short-key workaround.
- AGENTS: Unchanged; repository-wide routing and completion invariants did not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed read-only inspection of the current authoring contract, adapter planning/transaction order, normalization behavior, existing regression owners, repository queue, and transaction state.
- Authored this implementation-independent acceptance and verification boundary; no source, workflow, test, permanent document, or historical pair has been modified.
- Revalidated exact local/cached/direct/GitHub main `51f45b3baf3db909deae24beb99a0cb67e43bf0d`, the clean tracked worktree, the six authorized untracked authoring artifacts, the three canonical pairs, the inactive queue, and `NONE / NO_TRANSACTION_EVIDENCE`.
- Reconstructed 23 locally proven `LEGACY_PRE_CONTRACT` delivery entries plus full fresh `HARDENED_EXACT_HEAD` evidence for Tasks 0054 and 0055. The production evaluator classified all 25 prior STANDARD outcomes `SATISFIED`.
- Invoked the packaged dispatcher once with the trusted-local expectations, fresh GitHub ledger, and empty execution-preflight issue arrays. It selected Task 0056 for `IMPLEMENT` with `STANDARD_LIFECYCLE` authority and no ceremonial confirmation.
- Implemented canonical deterministic key derivation, keyless title-based adapter input, title dependencies, complete pre-allocation validation, bounded payload handling, retained-manifest collision detection, and allocation-after-lock evidence hooks without a production dependency.
- Added boundary, fresh-process determinism, collision, ordering, zero-residue, rollback/recovery, instruction, direct/packed adapter, current/legacy reader, and distribution coverage. Acceptance-focused, planner-selected Stable, candidate, and permanent-document growth checks passed.
- Reviewed the exact 20-path diff against AC-01 through AC-08; README, AGENTS, historical pairs, package/plugin versions, dependencies, and Task 0057/0058 authored bytes remain unchanged.

## Remaining

- None — the repository outcome and acceptance evidence are complete; mutable STANDARD delivery is tracked separately in GitHub.

## Resume Point

- None — no repository implementation work remains after terminal validation.

## Blockers

- Not applicable — repository acceptance is complete and no delivery blocker is currently known.
