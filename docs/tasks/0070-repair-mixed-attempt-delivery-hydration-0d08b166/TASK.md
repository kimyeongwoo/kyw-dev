# TASK 0070 — Repair Mixed-Attempt Delivery Hydration and One-Step Rebaseline

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Repair production `STANDARD` delivery hydration so GitHub Actions subset reruns are normalized by each required logical job's authoritative actual execution attempt, then use a separately authorized one-time pre-dispatch bootstrap for exact `$kyw-impl 0070` to re-evaluate immutable Task `0069` and advance the existing valid continuity checkpoint exactly one step from Task `0068` through Task `0069` without rewriting evidence or causing CI, publication, or registry mutation.

## Dependencies

- Task 0068.

## In Scope

- Separate the selected workflow run's latest run-level attempt from the actual execution attempt of each required logical job.
- Extend the bounded GitHub evidence collector to reconcile `jobs?filter=all`, the latest logical-job projection, and attempt-specific job collections when needed, while preserving pagination, response-shape, identity, and query bounds.
- Build an unambiguous execution history for every required actual-head, merge-compatibility, aggregate gate, and post-main logical job. A later actual execution of the same logical job is authoritative; a job not actually rerun may retain its earlier valid execution evidence.
- Treat a GitHub projection or alias record as the same execution only when one unique earlier or current execution is proven by exact run/job envelope, chronology, conclusion, step timing, and log/evidence equivalence. Reject ambiguous same-name or many-to-one matches.
- Derive a checkout-bearing job's actual execution attempt from reconciled GitHub execution history rather than trusting its log alone, then require the selected API identity and its single emitted `KYWCIEVIDENCE.run_attempt` to equal that derived attempt exactly. Apply the same newest-actual-execution rule to the marker-free Required gate using its API/dependency envelope.
- Preserve exact repository, workflow ID/name/path, event, PR, role, run ID, expected SHA, actual checkout SHA, conclusion, distinct job identity, and synthetic merge parent validation for every selected job.
- Refuse fallback to an earlier success when a later actual execution of the same logical job failed, was cancelled, remained incomplete, lost its log, or emitted invalid evidence.
- Add deterministic fixtures for one-attempt, full-rerun, and subset-rerun graphs, including the exact PR `#57` mixed-attempt shape, plus negative coverage for stale jobs, later failures, fabricated attempts, reused logs, cross-run/PR/SHA evidence, role confusion, missing logs, collection mismatch, projection ambiguity, and duplicate names.
- Reuse the existing `EXPLICIT_REBASELINE`, prepared-checkpoint, opaque transition-token, and `apply-continuity` boundaries to support exactly one evaluator-satisfied uncovered terminal `STANDARD` frontier after an already valid checkpoint; do not introduce a general recovery subsystem or alternate ledger.
- Admit the Task `0068` to Task `0069` one-step preparation only when the existing checkpoint, prior digest, ordered coverage, terminal pair bytes, aligned identities, current `main`, local ancestry, and fresh production evaluation all match the exact recorded frontier.
- Keep checkpoint preparation read-only. Return an opaque transition token only after the sole dispatcher selects Task `0070` for `IMPLEMENT`, then apply it exactly once after the Task `0070` branch and pair are active; reject self-coverage, an over-gap transition, history rewriting, wrong-task use, stale/divergent tokens, or any pre-dispatch checkpoint write.
- Define one limited bootstrap exception: only exact `$kyw-impl 0070` plus separate explicit current-user authority may freeze an exact pre-mutation allowlist, modify evaluator/hydration owner source, directly related regression tests, and the minimum changed owner documentation before dispatch, run focused proof, hydrate the real Task `0069` graph credential-free, and then make the sole dispatcher call.
- Preserve structured Git porcelain output byte-for-byte through the fixed-width status boundary so the first record's meaningful XY leading space and exact path cannot be changed by scalar trimming.
- Preserve terminal-pair immutability while treating only a regular-file LF/CRLF worktree representation as equivalent after exact status, path, type, canonical-blob, and byte checks; every other content or filesystem difference remains drift.
- Synchronize the durable delivery semantics in SPEC and ARCHITECTURE and the minimum owning `kyw-impl` procedure/projection; keep README and AGENTS byte-stable unless execution discovers a genuinely changed owner meaning.
- Preserve Task `0069` `TASK.md` and `TEST.md` bytes, its successful publication evidence, failure chronology, and all external GitHub/npm state.

## Out of Scope

- Editing, reopening, reterminalizing, renaming, deleting, or replacing the Task `0069` pair or any earlier terminal Task.
- Rerunning PR `#57`, another CI job/workflow, publication run `30592539397`, or any other GitHub Actions object.
- Dispatching `publish.yml`, running `npm publish`, logging in to npm, using an npm token/OTP/security key, or inspecting npm account/settings surfaces.
- Changing the package/plugin version, creating another candidate, changing a dist-tag, or mutating the public registry.
- Creating a Git tag, GitHub Release, public plugin submission, branch-protection bypass, force update, or administrative override.
- Supplying manual delivery ledger or expectation payloads, using a `PENDING` or test-only compatibility seam as production proof, synthesizing attempts, or rewriting logs.
- Changing the general dispatcher-before-hydration order, adding a broad repair framework, whole-history replay, second checkpoint, alternate delivery ledger, or extensive production-evaluator redesign.
- Reworking the delivery schema when the existing evaluator can consume safely normalized authoritative job identities.
- Modifying unrelated Windows console tests, release behavior, installer behavior, or other cleanup.
- Committing, pushing, opening a PR, running hosted CI, or causing any external mutation during the pre-dispatch bootstrap.

## Acceptance Criteria

- [x] AC-01: Hydration keeps the run-level latest attempt distinct from every logical job's actual execution attempt and reconciles bounded all/latest and attempt-specific GitHub job collections without treating the embedded log attempt as the sole source of truth.
- [x] AC-02: For each required logical job, the unique latest actual execution is authoritative; an untouched earlier execution may remain valid through a proven projection, while any later actual execution supersedes it.
- [x] AC-03: Every selected job satisfies its exact API envelope and role/SHA constraints, and every checkout-bearing job's single `KYWCIEVIDENCE.run_attempt` equals its independently derived execution attempt; marker-free gate selection remains exact and fail closed.
- [x] AC-04: Later failed, cancelled, incomplete, missing-log, or malformed-evidence executions never fall back to an earlier success, and stale, cross-run, cross-PR, cross-SHA, reused-log, fabricated-attempt, same-name ambiguity, role-confused, and collection-mismatched graphs remain rejected.
- [x] AC-05: Deterministic one-attempt and full-rerun fixtures still pass, the exact PR `#57` subset-rerun fixture reaches literal `HARDENED_EXACT_HEAD`, and the existing stale/cross-attempt attack corpus plus the new projection/late-rerun attacks continue to fail closed.
- [x] AC-06: With separate `EXPLICIT_REBASELINE` authority, an already valid checkpoint may prepare exactly one uncovered terminal `STANDARD` outcome only when it covers Task `0068` exactly, Task `0069` is the sole frontier, current `main` is `184c0802a3327a1c287634e701206b31dec44b2f`, the prior checkpoint digest and Task `0069` pair hashes are exact, and fresh production evaluation satisfies `HARDENED_EXACT_HEAD`.
- [x] AC-07: Existing-checkpoint rebaseline preparation performs no write and produces an opaque transition token only when the sole dispatcher selects Task `0070` for `IMPLEMENT`; missing authority, wrong invocation, failed focused proof, failed hydration, or a non-selected dispatcher result yields no token and no mutation.
- [x] AC-08: After Task `0070` becomes the sole active pair on its branch, one token application advances coverage only from Task `0068` through Task `0069`; self-coverage, zero/multiple frontier ambiguity, over-gap advancement, prior-history rewrite, wrong branch/Task, stale token, or divergent replay is rejected while existing exact idempotence remains a regression invariant.
- [x] AC-09: The one-time pre-dispatch bootstrap freezes and enforces an exact allowlist before mutation, permits only evaluator/hydration owner source, directly related tests, and minimum owner documentation, forbids commit/push/PR/CI/external mutation, and stops after any failed condition without a second dispatcher or workaround.
- [x] AC-10: Credential-free production hydration re-evaluates the immutable Task `0069` graph from PR `#57`, PR run `30593586295`, exact base/head/merge identities, mixed job attempts, and post-main run `30599908879`; publication run `30592539397`, public `latest=0.1.3`, and Task `0069` bytes remain unchanged.
- [x] AC-11: SPEC, ARCHITECTURE, and the minimum `kyw-impl` owner procedure accurately describe authoritative per-job attempts and the narrow one-step explicit rebaseline; README, AGENTS, unrelated behavior, and package/publication semantics remain unchanged.
- [x] AC-12: Focused attack/continuity tests, the changed-path verification plan, all four Stable commands, final diff/matrix review, pair validation, transaction inspection, Task `0069` immutability checks, and no-adjacent-mutation checks pass before Task `0070` reaches repository success and its own ordinary `STANDARD` delivery.
- [x] AC-13: Git scalar and structured porcelain outputs remain separate; fixed-width status parsing preserves the first XY record and exact path, and checkpoint-covered terminal pairs accept only LF/CRLF representation equivalence while rejecting malformed status, final-newline, whitespace, character, line, path, link, and type drift.

## Plan

- [x] Revalidate aligned main, queue/transaction state, the Task `0068` checkpoint and digest, Task `0069` pair hashes, the exact PR `#57`/post-main graph, and absence of newly authorized external mutation.
- [x] On exact `$kyw-impl 0070` with separate explicit bootstrap authority, freeze the exact allowed path/hash set before any mutation and stop if the worktree or external frontier differs.
- [x] Apply the smallest owner-document and hydration/selection correction, add mixed-attempt and adversarial fixtures, and add narrow existing-checkpoint one-step rebaseline guards without changing the general dispatch order or ledger schema.
- [x] Run the focused suite; only after it passes, invoke the production hydrator read-only against the real Task `0069` graph and require literal `HARDENED_EXACT_HEAD` plus one prepared Task `0069` checkpoint.
- [x] Make the sole dispatcher call, require `IMPLEMENT` for Task `0070`, establish its branch and `IN_PROGRESS/RUNNING` pair, then apply the untouched opaque transition token exactly once.
- [x] Record the bootstrap chronology in this pair, complete remaining integration and Stable verification, and prove the checkpoint covers through Task `0069` while Task `0070` remains uncovered.
- [x] Close the discovered first-record and terminal CRLF false positives without weakening structured-status parsing or terminal-pair immutability, and record their focused regressions.
- [x] Recheck Task `0069` hashes and external no-mutation state, synchronize final documentation/diff coverage, validate the pair and transaction, and complete only Task `0070`'s normal repository and `STANDARD` lifecycle.

## Decisions

- Keep one correction Task because authoritative mixed-attempt normalization is the prerequisite for, and is independently proven by, the exact one-step Task `0069` rebaseline; splitting would recreate the same pre-dispatch self-hydration gap.
- Use Task `0068` as the hard dependency because it is the last evaluator-complete checkpoint frontier. Task `0069` is immutable causal evidence and the sole recovery target, not a hard dependency: its repository outcome and publication are complete, but the buggy production hydration never established its first canonical evaluator-satisfied delivery, so requiring that delivery first would recreate the defect being repaired.
- Determine actual execution attempts from reconciled GitHub API collections and execution chronology, then validate logs against that result. Never infer an attempt merely from the run's latest attempt or accept an embedded attempt without independent API support.
- Treat projection deduplication as proof, not convenience: exact envelope, chronology, step timing, and log/evidence equivalence must resolve to one unique execution; otherwise fail closed.
- Keep the existing production evaluator and FINAL ledger meaning where possible. Correct the collection/normalization boundary and add only the minimum compatible representation needed for auditability.
- Reuse the existing explicit authority flag, prepared checkpoint, transition token, and atomic apply boundary. The new path accepts only one valid existing checkpoint plus one terminal uncovered frontier and is not a whole-history bootstrap or general repair subsystem.
- The pre-dispatch bootstrap is a one-time recovery exception owned by this Task, not ambient authority or a new default workflow. Task authoring grants no implementation, checkpoint, GitHub, CI, npm, or registry mutation authority.
- Task `0069` chronology and pair bytes remain immutable even after its existing graph becomes evaluator-complete and continuity advances.
- Git commands returning one scalar may remove only their final command delimiter; porcelain commands retain all structure. Terminal worktree comparison converts CRLF byte pairs to LF only and performs no trim, whitespace, final-newline, or Unicode normalization.

## Risks

- GitHub's latest/attempt projections can assign different numeric IDs to the same carried execution; weak deduplication could admit stale evidence, while overly strict equality could reject legitimate subset reruns.
- A later failed rerun can be hidden by an earlier success unless logical history is resolved before success filtering.
- Logs can expire or become unavailable; missing authoritative evidence must block instead of triggering a rerun, fabricated record, or manual payload.
- The explicit existing-checkpoint path could become a history-skipping escape hatch unless exact authority, one-frontier, main ancestry, pair bytes, previous digest, selected Task, and token-application guards all remain conjunctive.
- Pre-dispatch uncommitted source changes are an exceptional state. An incomplete allowlist, worktree drift, failed focused test, or interrupted hydration must stop before dispatcher and leave no checkpoint or external mutation.
- Permanent-document changes touch an already warning-sized SPEC; execution must keep changes minimal and retain exact before/after growth evidence without changing budgets.
- A fixed-width porcelain record can be corrupted by generic leading trim, while treating every modified terminal path as drift can misclassify Git's CRLF worktree representation; both boundaries require exact positive and negative tests.

## Discoveries and Changes

- Current local, cached, direct-remote, and GitHub `main` are aligned at `184c0802a3327a1c287634e701206b31dec44b2f`; the worktree and Task transaction state were clean at authoring.
- The valid continuity checkpoint has digest `ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e`, covers 37 `STANDARD` outcomes through Task `0068`, and was sourced from main `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0`.
- Task `0069` remains `DONE/PASSED` with `TASK.md` SHA-256 `53d973f700ce91b3ee4f3c92692c7ba691e622732f36c9cb95f7691ee522e813` and `TEST.md` SHA-256 `6da2f8f8f4af2734753d4f7adcb9ac357c0b528e3589053bda941612cb283a67`.
- PR `#57` is merged from exact base `caf6c82f8fc79c2b76ae2bc6c2122ca0359878d0` and head `52bf834fd2ef19b4e56d5e9571cb50279dd34391` to merge `184c0802a3327a1c287634e701206b31dec44b2f`.
- PR CI run `30593586295` is successful at run-level attempt `2`. Its attempt-2/latest projection contains 11 successful logical jobs, while `filter=all` contains 22 records across attempts `1` and `2`.
- `Behavioral / Windows / Node 22.x` job `91049018006` and dependent Required job `91049232063` actually ran during attempt `2`; the other successful checkout-bearing jobs, including merge compatibility, retain emitted attempt `1` evidence through GitHub projections.
- Post-main CI run `30599908879` succeeds at exact merge SHA on attempt `1`. Publication run `30592539397` remains its original successful attempt `1`, and the public registry keeps `latest=0.1.3`.
- Current hydration overwrites every job with the run-level latest attempt before validating the log, so carried attempt-1 evidence is rejected even though the latest logical graph is successful.
- Authoring created no implementation, checkpoint, GitHub, CI, npm, or registry mutation and grants no future bootstrap authority by itself.
- Execution found that shared `gitText()` applied whole-output `.trim()` to porcelain status, changing the first exact record ` M docs/ARCHITECTURE.md` into `M docs/ARCHITECTURE.md` and the fixed-width path into `ocs/ARCHITECTURE.md`. Scalar output now strips only the final command delimiter while porcelain output remains byte-preserved and malformed records fail closed.
- The first exact-path diagnostic regression initially used a substring absence predicate, which was false for the valid `docs/...` path because it contains `ocs/...`; the assertion now checks the complete bounded diagnostic exactly.
- The corrected porcelain boundary exposed a second production defect: checkpoint-covered terminal paths marked modified for CRLF-only worktree presentation were rejected before canonical comparison. The drift check now rejects unsafe status/type/path states first, then compares the canonical Git blob with regular-file worktree bytes using CRLF-pair-to-LF normalization only.
- The first corrected worktree self-check command omitted production's `--untracked-files=all`, so Git collapsed the Task directory into one record and validation failed without mutation. Re-running the read-only check with the exact production arguments proved the first raw record and the exact 9 tracked plus 2 untracked path set, with no `ocs/ARCHITECTURE.md` element.
- One live adapter invocation performed exactly one credential-free hydration followed by exactly one dispatcher call. Task `0069` evaluated as literal `HARDENED_EXACT_HEAD`; nine untouched PR logical jobs used actual execution attempt `1`, Windows/Node 22 and Required used actual execution attempt `2`, and all post-main logical jobs used attempt `1`.
- The dispatcher returned `SELECTED / IMPLEMENT / 0070`; after pair activation and validation, the opaque token was applied exactly once. Continuity advanced from digest `ffc574a5f32cd52f2ad8003ffee1dc00ea2d9b52638e880aaaea1a722526959e`, count `37`, last Task `0068` to digest `4db847cb90b443f1e0e419bc39582ec7c4f29cd26b3114ae5dfae2ee01e43fec`, count `38`, last Task `0069`, with Task `0070` excluded.
- The first Stable run exposed missing active permanent-document delta evidence and failed four foundation/distribution tests without reaching lint. Adding the exact current Task evidence restored foundation validation; the subsequent full suite passed 404/407 with three explicit skips, and standalone lint, format, and pack checks passed.

## Documentation Impact

- SPEC: Clarify that run-level latest attempt and each logical job's actual execution attempt are distinct, define authoritative subset-rerun selection and fail-closed late-execution behavior, bound explicit existing-checkpoint rebaseline to one evaluator-satisfied frontier, and constrain worktree equivalence to CRLF byte-pair normalization only.
- ARCHITECTURE: Describe the all/latest/attempt-specific reconciliation flow, proven projection deduplication, per-job attempt validation, read-only prepare/selected-token/apply boundary, and ordered porcelain/type/blob checks for terminal worktree equivalence.
- README: Expected unchanged — invocation, user-facing commands, package/publication status, and ordinary delivery behavior do not change.
- AGENTS: Expected unchanged — explicit authority, serial execution, immutable prior pairs, evidence honesty, and completion rules remain intact; the exceptional procedure belongs to this Task and the `kyw-impl` owner.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Preserved scalar/porcelain Git output boundaries, fixed exact first-record parsing and diagnostics, and added fail-closed parser regressions.
- Implemented authoritative mixed-attempt logical-job reconciliation, adversarial coverage, and exact Task `0069` production hydration.
- Implemented and exercised the narrow existing-checkpoint one-step explicit rebaseline, sole selected dispatcher, active pair, and one token application through Task `0069` only.
- Corrected terminal-pair CRLF-only worktree false positives while retaining exact immutability for every semantic, path, status, link, and type drift case.
- Synchronized SPEC, ARCHITECTURE, and the minimum `kyw-impl` owner surfaces; README and AGENTS remain byte-stable.
- Passed the focused/targeted suites, exact worktree self-check, queue/pair/transaction integrity reads, external no-mutation snapshot, full tests, lint, format, and pack checks recorded in `TEST.md`.
- Completed the final 116-test focused rerun and planner-selected `npm run check`: 407 tests with 404 passes and three explicit skips, lint over 83 modules, format over 347 text files, and pack selection of 43 files / 136,856 bytes.

## Remaining

- None — repository acceptance, verification, documentation, continuity, and evidence are complete; ordinary `STANDARD` GitHub delivery remains the separate external gate.

## Resume Point

- None — repository outcome is complete. If delivery is interrupted, resume only from the recorded external GitHub state; never repeat hydration, dispatcher selection, or token application.

## Blockers

- Not applicable — the explicit bootstrap completed successfully and no repository blocker remains.
