# TASK 0042 — Ownership-Safe Task Batch Transactions

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Make adaptive Task batch creation ownership-safe across races, interruption, rollback, diagnosis, and recovery so unknown content is never deleted or overwritten, another transaction lock is never released, and publication never relies on a stale pre-lock snapshot.

## Dependencies

- Task 0041.

## In Scope

- The Task core and packaged adapter `create-batch` transaction boundary.
- A small versioned transaction manifest containing an unpredictable token, expected staging/final paths, exact regular-file identities and SHA-256 values, requested IDs/keys, and bounded diagnostic process/time/host metadata where observable.
- Token- and identity-checked lock release, including replacement-race protection.
- Full queue, dependency-source, target-path, and prepared-content revalidation after lock acquisition and immediately before first final publication.
- Rollback restricted to exact transaction-owned, type-checked, entry-set-checked, identity-checked, and hash-checked content.
- Fail-closed preservation for unknown, replaced, linked, modified, or extra lock/staging/final content.
- One bounded read-only transaction diagnostic and one explicit proof-based, idempotent recovery path through the packaged Task adapter.
- File-backed batch input as the default multi-pair or large-payload transport while preserving small inline JSON compatibility.
- Windows-valid file-backed payload coverage above common command-line limits and failure injection across staging, publication, rollback, and lock release.

## Out of Scope

- A generic transaction framework shared with Skill installation or another subsystem.
- Daemons, watchers, tracing, databases, background cleanup, global repository locks, or automatic stale-lock deletion.
- Recovery authorized only by age, TTL, PID liveness, or hostname.
- Removing compatible `create --title`, small inline batch JSON, existing adapter commands, or schema-v1 compatibility.
- Refactoring the entire Task core; cohesive module extraction belongs to the dependent Task.
- Publication, registry mutation, force/destructive recovery, tag, or GitHub Release.

## Acceptance Criteria

- [x] AC-01: The creation lock contains a versioned transaction identity and is removed only after the releaser proves the lock still belongs to its token and expected identity.
- [x] AC-02: Replacing the lock path after acquisition cannot cause the original transaction to unlink or overwrite the replacement.
- [x] AC-03: After lock acquisition, drift in queue frontier, referenced dependency Task content/status, target paths, or prepared pair hashes aborts before publication with no new dispatchable Task.
- [x] AC-04: Rollback never recursively deletes a directory containing an unexpected file, symlink, changed pair file, foreign replacement, or any other unproven identity.
- [x] AC-05: When rollback ownership cannot be proven, creation returns a deterministic fail-closed blocker, preserves the lock and diagnostic/recovery evidence, and makes no success or no-partial-queue claim.
- [x] AC-06: Read-only diagnostics report only bounded relative paths, transaction state, expected-versus-observed categories, and token/hash prefixes, without credentials or unnecessary absolute user paths.
- [x] AC-07: Explicit recovery mutates only fully proven manifest-owned content, is idempotent, and otherwise reports a blocker while preserving every byte.
- [x] AC-08: Normal success publishes the complete canonically valid `READY/READY` set and leaves no lock, staging, manifest, or recovery residue.
- [x] AC-09: File-backed batch creation succeeds with a valid multi-Task payload larger than 8 KiB on supported platforms, including Windows semantics, and Skill guidance makes this the default for multi-pair or large content.
- [x] AC-10: One-pair creation, batch schema v1, exact allocated IDs, dependency-graph validation, direct-install fallback, small inline JSON, adapter result contracts, and package boundaries remain compatible.

## Plan

- [x] Revalidate Task 0041 delivery, current create-batch ownership assumptions, filesystem behavior, adapter inputs, and failure-injection coverage.
- [x] Define the minimal versioned manifest, token/identity checks, bounded diagnostic schema, and proof-only recovery states.
- [x] Revalidate queue/dependency/content identities under the held lock and again at the final pre-publication boundary.
- [x] Replace broad rollback cleanup with exact entry/type/hash-proven movement or removal and preserve fail-closed evidence on uncertainty.
- [x] Add read-only inspect and explicit recover adapter paths without automatic stale cleanup or a generic transaction abstraction.
- [x] Make file-backed payloads the documented default and add large Windows-valid process coverage plus boundary-by-boundary fault injection.
- [x] Run focused, cross-platform-ready, Stable/package, canonical queue, residue, and final diff verification; then record terminal repository evidence for ordinary `STANDARD` delivery.

## Decisions

- Ownership is established by unpredictable transaction identity plus exact path/type/entry/hash evidence, never by path name alone.
- Age, process liveness, and host are diagnostics only and never independently authorize mutation.
- Unprovable cleanup is a preserved fail-closed recovery state, not an opportunity for recursive best-effort deletion.
- File-backed schema-v1 JSON is canonical for multi-pair or large input; inline JSON remains a compatibility surface.
- Task and installer transactions remain separate purpose-built implementations.

## Risks

- Lock replacement and check/use races can cause foreign lock deletion unless close/unlink validates the same identity.
- Recursive cleanup can erase user or attacker-controlled extras when ownership is inferred from a parent path.
- Revalidating only allocation after lock acquisition leaves dependency and prepared-byte drift publishable.
- Recovery that is too permissive is destructive; recovery that loses evidence can make a legitimate transaction permanently unauditable.
- Windows command-line and filesystem semantics require real file-backed process tests rather than POSIX-only assumptions.

## Discoveries and Changes

- Task 0041 is externally delivered: repository `main`, `origin/main`, and the direct remote `main` all resolved to merge SHA `c738352a9275494ed656edf4283cf8f5f5d4ce04`, with successful exact-SHA post-merge CI recorded in the external ledger.
- The Task 0042 preflight found no staged or unstaged path and only the six pre-created current-contract queue pairs 0042–0047 as untracked content; no unexpected commit, ref, PR, or Actions drift was found.
- The current batch transaction writes no ownership identity into its lock, revalidates only allocation and target absence after acquiring it, and uses recursive staging cleanup based on a parent path. Those are the concrete ownership gaps covered by AC-01 through AC-07.
- The pre-implementation intent-to-test review maps every acceptance criterion to T-01 through T-10. Implementation must add actual lock-replacement, dependency/content-drift, unprovable-rollback, diagnostic, recovery, and large file-backed process evidence rather than treating existing happy-path tests as coverage.
- No production dependency or generic transaction framework is needed; the implementation remains within the Task artifact core and packaged adapter.
- The lock is now an append-only schema-v1 manifest with an unpredictable token, hash-chained lifecycle records, exact root/lock/stage/pair identities, expected byte lengths and SHA-256 values, and bounded owner metadata. Release atomically moves only the acquired identity to a token-specific marker before final proof and unlink.
- Final Task paths use exclusive directory and file creation rather than overwrite-capable directory rename. Durable records cover partial final directories/files so rollback and recovery can prove each mutation boundary.
- Rollback preflights the complete plan and uses proof, quarantine rename, `unlink`, and empty-directory `rmdir`; no batch cleanup path uses recursive removal. Unknown files, changed bytes, links/junctions, type changes, and replacements remain untouched with a deterministic blocker.
- The first Stable run exposed three instruction/document projection regressions (foundation atomic-publication wording, README create-only projection, and representative instruction bytes). The exact failures were retained, the projections were reconciled without weakening behavior, and the complete Stable gate subsequently passed.

## Documentation Impact

- SPEC: Updated observable create-batch revalidation, ownership-safe rollback/recovery, lock release, diagnostic privacy, and file-backed-input behavior.
- ARCHITECTURE: Recorded the append-only manifest, exclusive final creation, proof-only cleanup/recovery, diagnostic, and release-marker boundaries.
- README: Added concise file-backed-default and supported inspect/recover guidance.
- AGENTS: Reviewed; no repository-wide routing or completion invariant changed, so it was not edited.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed the local/remote/GitHub preflight, verified Task 0041 delivery, and selected Task 0042 as the dependency-satisfied lowest `READY/READY` pair.
- Recorded installed Codex CLI provenance (`codex-cli 0.145.0`) without changing the active API model or reasoning effort.
- Read the current Task/Test pair, permanent truth, Skill execution contract, batch core, adapter, and relevant unit/direct-install/package tests.
- Revalidated the acceptance-to-test mapping and identified the exact stale-snapshot, ownership, cleanup, diagnostic, recovery, and transport gaps before implementation.
- Implemented the purpose-built ownership manifest, full post-lock/final-boundary snapshots, exclusive final creation, exact rollback, bounded diagnostics, and explicit idempotent recovery without a new dependency or generic framework.
- Added deterministic lock, queue/dependency/target, partial-final, manifest, staging, publication, rollback, release, privacy, recovery, residue, linked-entry, compatibility, and greater-than-8-KiB file-backed process coverage.
- Synchronized SPEC, ARCHITECTURE, README, and the kyw-task Skill; reviewed AGENTS with no required change.
- Completed focused 38/38, direct-install/packed 42/42, planner-selected Stable 278/278 plus lint/format/package checks, canonical 47-pair validation, residue inspection, and final scope/diff review.

## Remaining

- None — repository implementation and verification are complete; required GitHub delivery is tracked externally by the `STANDARD` ledger.

## Resume Point

- None — repository work is terminal at `DONE`; resume only the ordinary external `STANDARD` delivery lifecycle if its ledger is not yet satisfied.

## Blockers

- Not applicable — no blocker is known.
