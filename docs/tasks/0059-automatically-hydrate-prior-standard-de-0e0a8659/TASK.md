# TASK 0059 — Automatically Hydrate Prior STANDARD Delivery Evidence

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Make the normal `$kyw-impl NNNN` production path automatically discover, normalize, and fail-closed evaluate every prior required `STANDARD` delivery from trusted repository/Git truth and fresh GitHub exact-SHA evidence before its sole dispatcher call, so a normal user supplies only the one-line invocation and no manual delivery ledger, expectations object, run ID, job ID, synthetic SHA, or historical anchor.

## Dependencies

- Task 0058.

## In Scope

- Add prior-`STANDARD` evidence discovery and hydration to the normal existing-Task implementation path before queue selection, using the repository, current Git graph, Task queue, workflow contract, and fresh GitHub PR/Actions evidence as authoritative inputs.
- Determine the exact set of prior required deliveries from the actual queue and requested transition, and construct the trusted-local expectations and fresh external ledger inputs needed by the existing production evaluator without a repository snapshot file or manual handoff ledger.
- Classify only outcomes proven by local Git ancestry to predate the hardened contract anchor as `LEGACY_PRE_CONTRACT`; bind the exact anchor, outcome, merge, repository, and base identities, and never infer legacy eligibility from Task numbering or age alone.
- Hydrate `HARDENED_EXACT_HEAD` evidence with the actual PR head and base, PR run and attempt, every distinct required actual-head checkout job and gate, the distinct synthetic merge job and exactly two ordered base/head parents, expected-head merge state, and a distinct post-main run/attempt with exact checkout jobs and gate.
- Keep failed run/attempt chronology separate from the accepted final graph, prohibit jobs from different attempts or roles from being combined, and preserve the existing evaluator as the terminal `SATISFIED`/blocker authority rather than replacing behavioral acceptance with CI state.
- Add a deterministic local/GitHub evidence adapter or equivalent minimal production boundary, bounded query planning, invocation-local caching, normalization, diagnostics, and focused fixtures required for automatic hydration and dispatch integration.
- Fail before selection or implementation mutation when local identity, ancestry, Task mapping, GitHub access, API shape, run/job/log evidence, attempt identity, checkout assertions, merge parents, or required role completeness cannot be established; report the exact Task and evidence role that blocked hydration.
- Preserve optional manual ledger/expectation arguments only as low-level compatibility or deterministic test seams if still needed, while removing them from the normal `$kyw-impl` instruction and user workflow.
- Update the canonical `kyw-impl` Skill/reference, shared packaged adapter/runtime, tests, and only the minimum durable product, architecture, and user-facing truth required by the changed behavior.
- Verify direct and plugin/packed installations use the same hydration-enabled runtime, without a second engine, production dependency, lifecycle installation hook, credential persistence, or secret-bearing evidence.

## Out of Scope

- Task creation batch sibling Git lifecycle, allocation, authoring transactions, or automatic Skill chaining.
- Historical scratch-residue scoping, cleanup of ignored evaluator output, or a generic repository hygiene feature.
- Generalizing adapter `process.argv[1]` robustness, evaluator process determinism, Task key derivation, or current Task/Test schema and dependency grammar.
- Redesigning CI topology, supported OS/Node lanes, workflow permissions, Required check identity, or adding model-backed required CI.
- A generic GitHub provider framework, alternate delivery backend, database, registry, daemon, watcher, background service, persistent cache, telemetry, or retry worker.
- Rewriting historical Task/Test pairs or promoting `BLOCKED` evidence, CI success, or a legacy compatibility classification into behavioral acceptance or hardened exact-head proof.
- Adding a sixth production Skill, changing the five-Skill ownership boundary, or moving implementation/delivery responsibility into `kyw-task`.
- Publication, npm authentication or registry probing/mutation, package or plugin version change, tag, GitHub Release, public submission, force/destructive Git work, branch deletion, workflow rerun, bypass, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: In a clean repository whose local `main`, upstream, direct remote `main`, and GitHub `main` are aligned, a user can enter only `$kyw-impl <READY Task>` and the normal production path completes prior-delivery hydration before one dispatcher call, returning `SELECTED/IMPLEMENT` without any user-authored JSON ledger, expectations object, mega-prompt, run/job ID, synthetic SHA, or historical anchor.
- [x] AC-02: A fresh Codex session recovers the same selection result from repository/Git/GitHub truth alone, and the required prior-delivery set includes every and only applicable prior current-contract `STANDARD` outcome needed by the requested queue transition; no eligible prior delivery can be silently omitted.
- [x] AC-03: `LEGACY_PRE_CONTRACT` is assigned only when actual local Git ancestry proves the outcome and merge are at or before the exact hardened-contract anchor; a hardened-contract outcome remains hardened regardless of its Task number, apparent age, or missing external evidence.
- [x] AC-04: Each hydrated `HARDENED_EXACT_HEAD` outcome binds the exact repository, workflow ID/name/path, base ref/SHA, PR number and actual head, accepted PR run and attempt, distinct required checkout jobs and Required gate, synthetic merge SHA with exactly two ordered base/head parents, expected-head merge, and a distinct post-main run/attempt with exact checkout jobs and gate.
- [x] AC-05: Failed or superseded runs/attempts remain separate chronology and cannot contribute jobs to an accepted graph; jobs from another attempt, run, Task, role, repository, workflow, event, path, or SHA cannot be mixed or reused.
- [x] AC-06: Stale, partial, reused, wrong-repository, wrong-workflow, wrong-event, wrong-path, wrong-attempt, wrong-job, wrong-SHA, malformed, missing Required-gate, missing checkout-log, synthetic-only, extra-parent, reversed-parent, or mismatched-parent evidence is never `SATISFIED` and reports the exact affected Task and evidence role.
- [x] AC-07: GitHub unavailability, authentication or authorization failure, rate limiting, bounded-query exhaustion, incomplete pagination, missing logs, and partial or malformed API responses fail closed before selection; no such condition is converted to `SATISFIED`, and any network retry is explicit, small, bounded, and completed before mutation.
- [x] AC-08: Hydration and the existing production evaluator keep repository behavioral acceptance distinct from delivery state: CI success alone cannot prove Task acceptance, and `BLOCKED/BLOCKED` or otherwise incomplete repository evidence cannot be promoted to a completed delivery.
- [x] AC-09: Hydration finishes before queue selection and before branch, lifecycle, Task/Test, transaction, staging, or implementation mutation; a hydration failure leaves those states byte-identical and the dispatcher is not invoked, while a successful invocation calls the dispatcher exactly once.
- [x] AC-10: The normal `kyw-impl` Skill and maintainer instruction surfaces expose the one-line invocation, not manual delivery payload construction; if manual ledger/expectation inputs remain, they are documented only as low-level compatibility or deterministic test seams and do not create a repository snapshot dependency.
- [x] AC-11: Current and legacy readers, the single-active-Task rule, hard dependencies, deterministic exact/next/continuous selection, existing delivery evaluator semantics, five explicit-only Skills, ordinary `STANDARD` authority, and non-`STANDARD` authority boundaries remain intact.
- [x] AC-12: One invocation uses a bounded query plan and invocation-local cache or equivalent minimal structure so the same repository, PR, run, attempt, job list, job log, or commit identity is not fetched unnecessarily; it performs no unbounded history scan, background work, persistent caching, or credential/secret recording.
- [x] AC-13: No-prior-delivery, legacy-only, hardened-only, and mixed histories work, including the repository's continuous Tasks 0054–0058 hardened chain and its failed-run/accepted-run and failed-attempt/accepted-attempt chronology, without changing historical artifacts.
- [x] AC-14: Source checkout, direct managed installation, packed/plugin installation, and a fresh installed session all use the same hydration-enabled adapter/runtime and preserve zero production dependencies, package/plugin version `0.1.0`, package boundaries, and lifecycle-script absence.
- [x] AC-15: Durable behavior is projected minimally to the correct permanent owners, permanent-document growth policy and exact before/after evidence are satisfied, and the final exact path/pair/graph/diff/package/version/publication audit finds no out-of-scope mutation.

## Plan

- [x] Define the authoritative prior-delivery discovery boundary, exact hardened anchor proof, queue-derived required set, normalized evidence roles, accepted-attempt rule, error taxonomy, bounded query plan, and invocation-local cache semantics.
- [x] Add deterministic local Git/repository discovery and fresh GitHub collection/normalization behind the shared packaged runtime, reusing the current evaluator and dispatcher rather than copying queue or delivery logic.
- [x] Integrate hydration into the normal `kyw-impl` path before the one dispatcher call; retain manual payload arguments only as hidden low-level compatibility/test seams if required.
- [x] Add positive and fail-closed fixtures for no-prior, legacy, hardened, mixed, Tasks 0054–0058, failed/superseded runs and attempts, identity/role/parent mutations, GitHub failures, bounded caching, and zero-mutation ordering.
- [x] Synchronize the canonical `kyw-impl` instructions and minimal SPEC/ARCHITECTURE/README truth, leaving AGENTS unchanged unless a genuinely new repository-wide invariant is demonstrated.
- [x] Run focused hydration/dispatch/instruction/current-legacy tests, direct and packed/plugin installation regressions, the exact changed-path verification planner and its selected non-publishing gates, pair validation, and final scope/evidence audit.

## Decisions

- Keep one Task because local ancestry discovery, GitHub collection, evidence normalization, evaluator input construction, and pre-dispatch integration are one user-visible atomic outcome; shipping any subset would either preserve the manual burden or create an unsafe queue bypass.
- Reuse the existing delivery evaluator as the production verdict owner. Hydration discovers and normalizes evidence; it does not infer behavioral acceptance, rewrite terminal Task history, or create a second delivery engine.
- Use actual Git ancestry and an exact contract anchor for legacy eligibility. Task IDs are labels, not chronology proof.
- Use the current GitHub PR/Actions ledger only. Manual objects may remain a compatibility seam, but the normal Skill UX never asks the user to construct them.
- Keep collection bounded to the queue transition's required prior `STANDARD` outcomes and evidence roles, with invocation-local reuse of exact reads and fail-closed external errors.
- Depend on Task 0058 because this outcome must hydrate the current hardened evaluator and Behavioral/Quality/Packed/Merge/Required topology rather than an obsolete job contract.

## Risks

- Git history can contain rebases, non-merge outcomes, similarly titled commits, or later Task numbers; loose Task-to-outcome mapping could misclassify hardened evidence as legacy or bind the wrong PR.
- GitHub run summaries do not prove actual checkout, and a successful run can contain skipped, failed, stale, or wrong-attempt jobs; collection must bind numeric jobs and asserted checkout logs without combining attempts.
- A final successful rerun can hide a failed earlier attempt; chronology and accepted evidence must be represented separately so jobs from attempt 1 cannot satisfy attempt 2.
- Broad PR/run history scans can be slow, rate-limit-prone, or non-deterministic; queue-derived exact identities, pagination bounds, and invocation-local caching are required.
- GitHub authentication and log APIs differ across installed surfaces; an unavailable required capability must block with a recovery message rather than fall back to guessed or stale evidence.
- Exposing tokens, auth sources, raw headers, or full credential-bearing responses in Task evidence or logs would violate the package security boundary.
- Moving network collection into a copied adapter or Skill-specific implementation could diverge between source, direct, and plugin installations.
- The change is runtime/distribution-sensitive and likely selects Stable or Release verification, but registry interaction and publication remain forbidden.

## Discoveries and Changes

- Fresh authoring preflight on 2026-07-28 found branch `main`; `HEAD`, upstream, local `main`, cached `origin/main`, direct remote `main`, and GitHub `main` all equal `be98d3b20dd28f1067cda117458588cfdb7fdd5a`, with zero staged, unstaged, or untracked paths.
- The actual queue has 58 complete pairs by path: 52 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, and one historical `CANCELLED/BLOCKED`; there is no `DRAFT`, `READY`, `IN_PROGRESS`, or `RUNNING` pair, IDs 0001–0058 are contiguous, and the numeric frontier is 0059.
- Canonical validation passed for Tasks 0054–0058. Tasks 0056, 0057, and 0058 are actual `DONE/PASSED`; Task 0058 is the latest completed hardened topology and depends on Task 0057.
- Task transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`; the Task root has no creation lock, release marker, staging directory, manifest, partial pair, payload, scratch, or archive residue, and no open pull request targets `main`.
- Git first-parent history proves the continuous hardened merge chain for PRs #41–#45. PR #45 has actual head `0e9da06cd4e86ec3fec6d598345636261c7d48c5`, base `b4bc81f84960dde7ad8ab5030ec417b54731825f`, and merge `be98d3b20dd28f1067cda117458588cfdb7fdd5a`.
- Fresh GitHub reads found PR #45 run `30349108569` attempt 1 and post-main run `30349429201` attempt 1 successful under workflow ID `314856028`, name `CI`, path `.github/workflows/ci.yml`; distinct numeric jobs and `KYWCIEVIDENCE` lines bind every actual-head/post-main checkout, Required gates, and synthetic merge `8ae268c31f39fdf3699e634290f60eeee394f9ff` with ordered base/head parents.
- Fresh bounded chronology also found PR #41's failed earlier-head run `30277529398` followed by accepted final-head run `30313245224`, and Task 0055's post-main run `30322392806` attempt 1 failure followed by attempt 2 success with different job IDs. These are concrete fixtures for separating chronology from the accepted graph.
- The current adapter accepts caller-supplied `deliveryLedger` and `deliveryExpectations`; `kyw-impl` currently instructs the agent to construct those payloads, while the production runtime contains evaluator and queue logic but no GitHub/local hydration collector.
- Package and plugin versions are both `0.1.0`; dependency fields and npm lifecycle installation/publication scripts are absent. Local, direct-remote, and GitHub tag counts are zero and GitHub Release count is zero; npm registry state was not probed because this invocation explicitly forbids registry access.
- Current permanent-document baselines are README 13,894 bytes/217 lines, AGENTS 3,531/48, SPEC 34,803/432, ARCHITECTURE 30,651/669, combined 82,879 bytes/1,366 lines.
- No application code, runtime, workflow, permanent document, historical Task/Test pair, Git branch, GitHub state, package metadata, or publication state was changed during authoring.
- Fresh implementation preflight on 2026-07-28 reconfirmed exact `main` identity `be98d3b20dd28f1067cda117458588cfdb7fdd5a`, only the authored untracked Task 0059 pair, exact authored hashes, one READY pair, no active pair, no transaction/residue, no open PR, and unchanged package/publication boundaries.
- Actual queue and local first-parent ancestry identified 28 required prior `STANDARD` outcomes: 23 outcomes at or before exact anchor `4463051d2bd073048321b09f0b6524ea31fb8f80` use `LEGACY_PRE_CONTRACT`, while Tasks 0054–0058 remain full `HARDENED_EXACT_HEAD`.
- Fresh bounded GitHub collection separated Task 0054's failed earlier head and Task 0055 post-main attempt 1 from accepted evidence, bound 97 distinct accepted job IDs and five ordered two-parent synthetic commits, and reproduced Task 0058's requested PR/run/merge anchors.
- The absolute packaged adapter was called directly exactly once for dispatch and returned `SELECTED / IMPLEMENT / 0059 / STANDARD_LIFECYCLE` with ordinary delivery authorized; implementation branch `task/0059-automatically-hydrate-prior-standard-delivery` starts at the verified base.
- AC-01 through AC-15 remain completely mapped by T-01 through T-17 after the pre-implementation mapping review; failing hydration tests are the next implementation evidence.
- The shared hydration module now derives the exact prior set, proves local delivery transitions and the ancestry-based contract anchor, caches bounded Git/GitHub reads for one invocation, normalizes legacy or hardened graphs, and runs the existing evaluator before the adapter's sole dispatcher call.
- Normal source, direct-install, and packed adapter paths accept only `$kyw-impl NNNN`; manual ledger/expectation options remain adapter-internal compatibility/test seams and are absent from the normal Skill command.
- Deterministic failure matrices and a separate opt-in live test cover exact roles, attempts, jobs, logs, parents, pagination, external failure classes, zero-dispatch failure, and the repository's 23 legacy plus five hardened prior outcomes.

## Documentation Impact

- SPEC: Update the observable `$kyw-impl` and `STANDARD` behavior so one-line dispatch automatically hydrates prior required delivery evidence and external failures block before selection.
- ARCHITECTURE: Update the existing-Task and external-ledger flow with bounded local/GitHub collection, normalization, invocation-local caching, and the pre-dispatch mutation boundary; keep the evaluator and one shared engine authoritative.
- README: Add only the user-facing one-line hydration behavior and any required GitHub-access prerequisite/recovery guidance; do not expose manual ledger payloads.
- AGENTS: Expected unchanged because existing routing, evidence honesty, GitHub gate, preservation, and completion invariants already cover the outcome; update only if implementation proves a new repository-wide rule is necessary.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed the fresh repository, queue, dependency, transaction, package, publication, Git ancestry, GitHub delivery, and authored-hash preflight without repository mutation.
- Hydrated and fail-closed validated the current invocation's 23 legacy plus five hardened prior delivery graphs in an owned external scratch cache.
- Executed the sole packaged dispatcher call and entered the selected Task on a dedicated branch.
- Implemented the automatic hydration runtime, adapter ordering, installed-runtime inventory, normal one-line instructions, minimal permanent-owner projections, deterministic mutation tests, and opt-in live recovery test.
- Completed the planner-selected release-safe verification, direct behavioral fixture validation, canonical pair/graph checks, exact path/history/package/publication/residue audits, and final fresh live hydration.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — Task 0058 is complete and its fresh exact-SHA delivery evidence is available; no authoring blocker is known.
