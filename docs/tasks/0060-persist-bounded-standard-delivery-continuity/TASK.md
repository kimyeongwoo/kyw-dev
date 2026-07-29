# TASK 0060 — Persist Bounded STANDARD Delivery Continuity

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Make prior `STANDARD` delivery continuity durable across sessions and GitHub Actions log retention by persisting one repository-owned, fixed-size rolling checkpoint that lets normal `$kyw-impl` trust already evaluator-satisfied covered history and freshly validate only a strictly bounded uncovered suffix, without weakening exact-head proof for the current delivery.

## Dependencies

- Task 0059.

## In Scope

- Add one versioned, machine-owned rolling continuity checkpoint at `docs/tasks/.kyw-dev-standard-delivery-continuity.json`; it is repository evidence derived from the canonical GitHub ledger, not a second mutable delivery ledger or a fifth permanent document.
- Define a closed, size-capped schema that binds the exact repository and protected base, checkpoint and covered main identities, the exact ordered covered `STANDARD` Task set, terminal Task/Test state hashes, the hardened delivery-contract version, a cumulative evidence digest, the prior checkpoint digest or explicit genesis, and one sanitized transition receipt.
- Derive coverage from canonical queue and dependency truth rather than Task-number age or a numeric frontier alone, so `NONE`, blocked, cancelled, missing, reordered, or dependency-only outcomes cannot be silently treated as covered.
- Trust a checkpoint only when it is read from the exact aligned local/upstream/remote/GitHub `main` tree, its schema, size, hashes, repository identity, covered set, and local Git ancestry all validate, and the working-tree or Task-branch copy cannot influence pre-dispatch satisfaction.
- Preserve GitHub PR/Actions exact-SHA state as the mutable ledger for every newly delivered outcome. Represent covered prior delivery with a distinct durable continuity classification that records its earlier hardened evaluation without relabeling it `LEGACY_PRE_CONTRACT`, fresh live evidence, or current delivery success.
- Change pre-dispatch hydration to evaluate covered prior requirements from the trusted checkpoint and collect fresh GitHub evidence only for the uncovered suffix. In steady state, allow at most one newly delivered `STANDARD` outcome beyond the checkpoint; any larger gap fails closed instead of scanning or replaying the full history.
- Add a deterministic prepare/apply boundary so checkpoint advancement is read-only before the sole dispatcher call, occurs only after `IMPLEMENT`, `RESUME`, or `DELIVER` establishes the selected Task mutation boundary, is atomic and idempotent on resume, and covers only already delivered prior outcomes—never the currently selected Task.
- Bootstrap this repository exactly once from the already required Task 0059-era full hardened evaluation, producing a genesis checkpoint through Task 0059's eligible prior delivery set. After bootstrap, normal dispatch must contain no automatic whole-history fallback; a missing, corrupt, stale, forked, downgraded, or over-gap checkpoint blocks with a bounded recovery path.
- Support an empty-history genesis without GitHub reads. Require separately explicit migration/rebaseline authority for an existing delivered history that lacks a valid checkpoint outside this Task's one authorized bootstrap; never silently weaken hardened evidence because historical logs are unavailable.
- Reuse the existing production evaluator and hydration/queue engine, add only the minimal cohesive checkpoint module or boundary, and keep manual ledger/expectation inputs confined to low-level compatibility and deterministic test seams.
- Add deterministic fixtures for genesis, steady-state one-step advancement, `NONE` gaps, dependencies, continuous mode, resume/idempotency, expired or unavailable covered-task logs, malformed/tampered checkpoints, main/worktree divergence, over-gap histories, and exact uncovered hardened evidence.
- Update the canonical `kyw-impl` Skill/reference, shared packaged adapter/runtime inventory, root and generated repository rule projection, focused tests, and only the minimum durable product, architecture, and user-facing truth required by the new checkpoint contract.
- Verify source checkout, direct managed installation, and packed/plugin installation use the same checkpoint-aware runtime, with no production dependency, lifecycle hook, credential persistence, package/plugin version change, or package inclusion of repository-local checkpoint state.

## Out of Scope

- Replacing GitHub PR/Actions exact-SHA state as the canonical mutable `STANDARD` ledger, weakening current-outcome exact-head, synthetic-merge, review, protected-merge, or post-main requirements, or using a checkpoint to finish the Task that creates it.
- Storing raw Actions logs, credentials, headers, API responses, full historical ledgers, one receipt file per Task, an ever-growing receipt array, or a repository snapshot of mutable GitHub state.
- Automatic recurring full-history replay, unbounded Git or GitHub scans, best-effort checkpoint repair, evidence guessing, Task-number-based legacy classification, or silent fallback to `LEGACY_PRE_CONTRACT`.
- Rewriting Task 0059 or any other historical Task/Test pair, changing current pair/status/dependency grammar, creating Tasks during implementation, or moving implementation/delivery responsibility into `kyw-task`.
- Redesigning CI topology, required job names, supported OS/Node lanes, workflow permissions, branch protection, review policy, or immutable Action pins.
- Git notes, tags, Releases, release assets, Actions artifacts, a ledger branch, database, daemon, watcher, background service, telemetry, alternate delivery provider, or hosted persistence service.
- Publication, registry/version/tag/Release/public submission, force or destructive Git work, workflow reruns, bypass/admin override, branch deletion, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: After the bootstrap checkpoint is present on aligned `main`, a normal one-line `$kyw-impl <READY Task>` reaches the existing dispatcher using repository checkpoint continuity plus fresh evidence for at most the single uncovered prior `STANDARD` outcome; it does not fetch, normalize, or evaluator-replay any checkpoint-covered GitHub run, job, review, commit, or log.
- [x] AC-02: Removing or expiring GitHub Actions logs and other re-fetchable evidence for checkpoint-covered outcomes does not change their prior-delivery satisfaction, while the same loss for the one uncovered outcome still fails closed with its exact Task and role.
- [x] AC-03: The checkpoint has one canonical path, closed versioned schema, deterministic serialization, fixed byte/field bounds, exact repository/base/main identities, exact ordered covered-set digest, terminal Task/Test state digest, cumulative evidence digest, and prior-digest/genesis binding; unknown, duplicate, oversized, noncanonical, or malformed content is rejected.
- [x] AC-04: Pre-dispatch validation reads checkpoint bytes only from exact aligned `main`, proves the referenced main/merge ancestry and current queue coverage locally, and rejects worktree substitution, branch-only edits, stale main, fork/rebase mismatch, history rewrite, covered-pair mutation, repository mismatch, or digest tampering.
- [x] AC-05: Coverage is computed from exact queue/dependency requirements, not numeric age. A checkpoint cannot cover an ineligible, nonterminal, delivery-incomplete, omitted, or differently ordered required Task, and a historical blocker or `NONE` delivery retains its existing semantics.
- [x] AC-06: This repository performs one explicit bootstrap that evaluates the pre-checkpoint history once and persists a genesis through the exact Task 0059-era covered set; subsequent normal invocations never automatically fall back to full-history discovery or log replay.
- [x] AC-07: An empty delivery history can create a genesis without GitHub access. An existing delivered history with no valid checkpoint, or a checkpoint lag exceeding one `STANDARD` outcome, reports a bounded migration/rebaseline blocker instead of scanning more history, guessing evidence, or mutating state.
- [x] AC-08: Checkpoint advancement is prepared without mutation before dispatch, applied only after a successful recognized selection inside the owned Task branch, atomically replaces only the canonical checkpoint, is idempotent across resume/compaction, and leaves byte-identical repository/refs/pair/transaction state on preparation, dispatch, or apply failure.
- [x] AC-09: A checkpoint created by Task N can cover only already delivered prior outcomes and never Task N itself. Task N becomes eligible for continuity only after its complete hardened delivery is freshly proven during a later selection, preserving the causal one-delivery lag.
- [x] AC-10: Fresh evidence for the one uncovered hardened outcome retains every existing repository/workflow/base/PR/head/run/attempt/job/log/checkout/synthetic-parent/review/merge/post-main identity rule, chronology separation, role uniqueness, and production-evaluator failure behavior.
- [x] AC-11: The checkpoint stores no raw log, credential, auth source, header, token, API response, or secret-bearing text; its size and per-transition work remain constant-bounded, and diagnostics expose only sanitized exact identities, digests, counts, classifications, and recovery categories.
- [x] AC-12: Hydration/checkpoint failures occur before queue selection or implementation mutation, the dispatcher is called zero times, and no failure is converted to satisfied continuity. A successful path calls the dispatcher exactly once and advances no checkpoint for terminal reporting alone.
- [x] AC-13: Current and legacy Task readers, hard dependencies, one-active and exact/next/continuous selection, completed-outcome retention, behavioral acceptance separation, `LEGACY_PRE_CONTRACT`, ordinary `STANDARD` authority, and five explicit-only Skill boundaries remain deterministic and fail closed.
- [x] AC-14: Source, direct user/project installation, and packed/plugin installation use one checkpoint-aware engine; repository-local checkpoint data is excluded from package bytes, and package/plugin version `0.1.0`, zero production dependencies, and lifecycle-script absence remain unchanged.
- [x] AC-15: SPEC, ARCHITECTURE, README, root/generated AGENTS projections, canonical `kyw-impl` instructions, and permanent-document growth evidence agree on the durable-but-not-current-ledger boundary; focused, live opt-in, Stable/Release, canonical pair, exact diff, package, history, and publication-safety checks pass.

## Plan

- [x] Freeze the checkpoint trust model, schema, canonical path, size limits, ordered coverage digest, cumulative transition digest, genesis rule, one-outcome lag, and failure taxonomy before changing runtime behavior.
- [x] Add dependency-free checkpoint parsing, canonical serialization, hash/identity validation, aligned-main loading, queue coverage computation, and atomic/idempotent advancement behind the shared Task facade.
- [x] Integrate trusted checkpoint coverage and a one-outcome uncovered bound into automatic hydration before the existing evaluator and sole dispatcher call; preserve exact live collection for the uncovered outcome and prohibit recurring full-history fallback.
- [x] Implement the one-time Task 0059-era bootstrap and empty-history genesis, then add deterministic prepare/apply sequencing that advances only after selected-Task ownership is established.
- [x] Add positive, mutation, failure, resume, continuous, causality-lag, covered-log-unavailable, over-gap, no-secret, and fixed-work fixtures, plus an opt-in live proof that bootstrap and the next steady-state transition behave as specified.
- [x] Synchronize the canonical Skill/reference and the minimum SPEC/ARCHITECTURE/README/AGENTS owner projections, preserving the existing GitHub-ledger and authority boundaries.
- [x] Verify source/direct/packed parity, package exclusion and identity, focused regressions, planner-selected non-publishing gates, canonical pair/queue integrity, complete diff-to-matrix coverage, and zero unauthorized external mutation.

## Decisions

- Keep one Task because checkpoint schema, bootstrap, bounded hydration, advancement ordering, and installed-runtime parity form one atomic queue-safety outcome; a persisted checkpoint that dispatch cannot trust, or a dispatcher that cannot durably advance it, is not independently shippable.
- Use one rolling repository checkpoint instead of per-Task receipts or a growing ledger. Git history retains prior checkpoint versions; normal selection validates only the current aligned-main checkpoint and never recursively replays that history.
- Treat the checkpoint as immutable continuity evidence derived from a previously complete production evaluation, not as an alternate mutable ledger. GitHub remains authoritative for the uncovered and current delivery lifecycle.
- Preserve a causal one-delivery lag: the selected Task may advance continuity only through its already delivered predecessors, so no Task can attest to its own future PR, merge, or post-main result.
- Fix the steady-state uncovered bound at one `STANDARD` outcome. Missing/stale checkpoints and larger gaps require an explicit migration/rebaseline path rather than a permissive scan.
- Permit this Task's single bootstrap because Task 0059 established complete automatic hydration while current exact evidence is available; do not turn bootstrap into recurring normal behavior.
- Read and validate checkpoint input from exact aligned `main`, never the mutable worktree, and apply the prepared transition only inside the selected Task's owned mutation boundary.
- Reuse built-in Node cryptography, canonical JSON, the current queue/hydration/evaluator, and existing transaction primitives where they conform; add no dependency or generic persistence framework.

## Risks

- A rolling digest can appear trustworthy while omitting a required Task unless coverage is recomputed from exact queue/dependency truth and terminal pair hashes.
- Reading the worktree checkpoint before dispatch would let the selected branch satisfy its own prerequisites; the trust source must be exact aligned `main` bytes.
- Advancing before selection or outside the Task branch would dirty shared state and violate zero-mutation failure ordering; preparation and application need separate, tested ownership boundaries.
- A checkpoint that covers the current Task would be self-referential because its post-main delivery does not exist in that Task's repository bytes.
- Rebase, squash, custom merge subjects, concurrent main advancement, or later edits to completed pairs can invalidate main/transition bindings and must stop rather than be normalized optimistically.
- Multiple delivered `STANDARD` outcomes can accumulate if older runtimes or manual workflows skip advancement; automatically replaying them would recreate the unbounded behavior this Task removes.
- Overly detailed receipts can leak logs or grow without bound; overly compact receipts can obscure provenance. The schema needs minimal exact identities plus cryptographic digests and clear classifications.
- Checkpoint schema migration can become a hidden historical rewrite; unknown versions must block and any future migration needs explicit compatible acceptance.
- Package/direct/plugin copies can diverge if checkpoint logic is placed in a Skill wrapper instead of the shared installed runtime.
- Permanent truth currently says fresh external collection is non-persistent and required for queue advancement; all affected owners must be reconciled without redefining the checkpoint as a second current delivery ledger.

## Discoveries and Changes

- The current queue contains 59 valid pairs: 53 `DONE/PASSED`, five `BLOCKED/BLOCKED`, one `CANCELLED/BLOCKED`, and no active, ready, or draft pair; Task 0059 is the latest completed current-contract outcome and this Task depends on it.
- Task-creation transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`; the worktree is clean, the current Task 0059 branch and its upstream match, and its tree is byte-equivalent to merged local/remote `main`.
- Task 0059 added automatic hydration and proved full exact prior delivery, but `discoverRequiredStandardDeliveries` still selects every prior current-contract completion for a new READY transition and local discovery still maps every completed current `STANDARD` Task to derive the contract anchor.
- Current code bounds one invocation at 128 required deliveries, 4,096 first-parent commits, 64 Task-path commits, 512 commands, 100 GitHub results per page, two review pages, ten attempts, and 8 MiB per log. Those ceilings stop runaway work but do not make prior continuity durable or independent of retained external logs.
- Task 0059's retained live evidence rebuilt 28 prior deliveries before READY selection in about 343 seconds and later rebuilt a three-Task terminal closure in about 178 seconds; all normalized evidence and caches are intentionally invocation-local and discarded.
- No continuity checkpoint exists. Current SPEC, ARCHITECTURE, README, and `kyw-impl` explicitly require fresh non-persistent external collection, while GitHub remains the only canonical mutable ledger; this Task intentionally changes historical continuity storage without changing the current-delivery ledger.
- Full reading of all four permanent documents found no unresolved ownership conflict: SPEC owns the observable bounded continuity rule, ARCHITECTURE owns the checkpoint component/storage/trust flow, README owns one-line behavior and recovery prerequisites, and root/generated AGENTS own the concise repository-wide completion projection.
- No application/runtime, test, workflow, permanent document, historical pair, Git ref, GitHub object, package metadata, or publication state was changed during authoring.
- Explicit one-time recovery preflight reconfirmed the previous 29-Task hydration failure at exactly 512 commands and zero dispatcher/repository mutation, then kept this pair `READY/READY` while implementing and deterministically testing the minimal bootstrap slice.
- The explicit bootstrap re-evaluated all 29 prior required deliveries with separate bounded local and external phases and wrote one canonical genesis through Task 0059. The completed trust path additionally recomputes all covered terminal pair hashes from aligned-main bytes and requires the exact predecessor checkpoint at its source-main commit; final fresh production hydration uses 70 commands and zero historical job-log fetches.
- The packaged dispatcher was called exactly once after bounded hydration and returned `SELECTED / IMPLEMENT / 0060 / STANDARD_LIFECYCLE` with `standardDeliveryAuthorized: true`; branch `task/0060-persist-bounded-standard-delivery-continuity` now owns implementation.
- The shared runtime now separates schema-3 durable continuity from the unchanged schema-2 hardened evaluator, permits only one uncovered prior outcome, prepares an opaque causal transition before dispatch, and applies it only after active selected-branch ownership with atomic idempotent replacement.
- Final diff review separated checkpoint-global covered-prefix validation from the smaller dependency closure of an exact terminal invocation; completed Task delivery can therefore freshly prove only its uncovered current outcome while reusing the exact covered subset and still validating all checkpoint-bound terminal pairs.
- Empty history prepares a zero-GitHub genesis; existing history without a valid checkpoint, gaps larger than one, stale/forked/main/pair/predecessor drift, malformed canonical bytes, and wrong-Task or self-covering transitions all stop without automatic replay.
- Source checkout, direct user/project installation, and the real packed/plugin adapter use the same added core module. The repository checkpoint is not packaged; version `0.1.0`, dependency fields, lifecycle hooks, tags, Releases, and publication state remain unchanged.

## Documentation Impact

- SPEC: Replace recurring fresh full-prior hydration with trusted rolling checkpoint continuity plus at most one fresh uncovered delivery, while preserving GitHub as the canonical mutable ledger and exact current-delivery requirements.
- ARCHITECTURE: Add the repository checkpoint component, fixed-size schema/trust source, rolling transition flow, one-delivery causality lag, bootstrap/migration boundary, and constant-bounded pre-dispatch data path; update evidence-storage and trade-off sections.
- README: Keep the one-line `$kyw-impl` UX, explain that old covered logs are unnecessary, identify Git/GitHub access for the uncovered delivery, and give fail-closed checkpoint recovery guidance without exposing internal payloads.
- AGENTS: Add only the thin repository-wide invariant that selected `STANDARD` work preserves/advances trusted prior-delivery continuity while GitHub still gates the current mutable delivery; keep root and generated template projections aligned.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed the fresh read-only recovery preflight, exact 512-bound reproduction, Task 0059 targeted hardened evaluation, and zero-mutation comparison.
- Implemented and focused-tested the minimal checkpoint schema, continuity evaluator class, split bounded bootstrap, explicit bootstrap writer, trusted bootstrap hydration path, and sole packaged dispatcher selection.
- Created the owned Task 0060 branch from exact aligned `main` after selection and entered the canonical implementation lifecycle.
- Completed aligned-main repository/GitHub identity and predecessor trust, terminal-pair recomputation, exact queue-prefix coverage, empty genesis, one-step hardened advancement, causal opaque prepare/apply, selected-branch containment, atomic/idempotent resume, over-gap and failure-atomic behavior.
- Synchronized the shared facade, installed runtime inventory, adapter commands, canonical Skill/reference, SPEC, ARCHITECTURE, README, and root/generated AGENTS projections without adding a dependency, service, provider framework, or alternate ledger.
- Completed deterministic continuity/hydration/evaluator/queue/instruction/installation/distribution regressions, the pre-merge live proof, planner-selected Release verification, direct behavioral fixtures, canonical pair/queue validation, and diff/history/package/publication/residue audits.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker is known.
