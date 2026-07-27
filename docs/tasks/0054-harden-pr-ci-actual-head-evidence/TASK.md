# TASK 0054 — Harden PR CI Actual-Head Evidence

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Make ordinary GitHub `STANDARD` delivery prove the actual pull-request head checkout, base-combined merge compatibility, and post-merge `main` checkout as three explicitly bound evidence roles so a successful synthetic merge-ref run cannot be mistaken for exact-head CI.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Change `.github/workflows/ci.yml` so every PR Stable and packed job explicitly checks out `github.event.pull_request.head.sha`, computes the actual `git rev-parse HEAD`, emits deterministic expected/actual identity evidence, and fails before verification when they differ; non-PR jobs use the event SHA.
- Preserve base-combined merge compatibility in a separately named PR-only job/evidence role that explicitly checks the synthetic merge SHA, its base/head parent identities, and the combined repository checks without satisfying the actual-head role.
- Make every post-merge `main` job explicitly prove that its actual checkout, Actions run head, and final PR merge SHA are identical.
- Replace the coarse PR `checks`/`runId` delivery claim with a versioned, role-separated ledger contract that binds repository, base, PR number, expected PR head, actual checkout SHA, workflow/run attempt/job identity, synthetic merge identity and parents, final merge SHA, and post-merge run identity.
- Keep pending evidence resumable while making every claimed successful role require its complete identity fields; reject stale, missing, malformed, mismatched, role-confused, or synthetic-only final evidence.
- Provide an explicit pre-contract compatibility classification for already completed historical deliveries without relabeling them as actual-head success, and require the hardened contract for this Task and all newly delivered outcomes.
- Update the canonical `kyw-impl` execution guidance and only the durable product, architecture, and usage truth whose exact-SHA meaning changes; keep `kyw-task` authoring-only.
- Extend workflow, delivery evaluator, dispatcher, instruction-surface, current/legacy reader, failure-path, and package regressions, including an evidence fixture shaped from the observed PR #40 run.
- Exercise the hardened contract on this Task's own PR and subsequent `main` run through the external GitHub ledger, without pre-claiming mutable delivery results in this repository pair.

## Out of Scope

- Editing Task 0053 or any other historical Task/Test artifact, rewriting PR #40 history, rerunning its workflow, or manufacturing an actual-head PASS that did not occur.
- Removing, hiding, or treating PR #40's successful synthetic merge-ref checks or successful post-merge `main` checks as failures.
- Changing the Task artifact schema, current contract-v2 marker identity, status pairs, dependency grammar, one-active-Task rule, or current/legacy artifact readability.
- Splitting or duplicating the deterministic Task/delivery engine, moving delivery ownership into `kyw-task`, adding a sixth production Skill, or introducing a provider framework, database, daemon, watcher, background worker, or production dependency.
- Changing supported Node/OS lanes except for the minimum separate merge-compatibility lane required by this evidence contract.
- Branch-protection administration, workflow reruns, bypass, force operations, destructive recovery, branch deletion, npm authentication or registry probes, `npm run release:check`, release-evidence actual mode, model-backed evaluation, publication, registry mutation, package version change, tag, GitHub Release, or public submission.
- Unrelated cleanup or broad workflow/test refactoring.

## Acceptance Criteria

- [x] AC-01: On a `pull_request` event, each Stable and packed verification job explicitly checks out the event's actual PR head SHA and deterministically proves before repository checks that `git rev-parse HEAD` equals that expected SHA; the emitted identity record includes the evidence role, repository, event, PR number, run ID/attempt, expected SHA, and actual SHA.
- [x] AC-02: Merge compatibility is a distinct PR-only evidence role/job that checks the event synthetic merge SHA separately, proves its base and PR-head parents against the same PR snapshot, runs the required combined-state verification, and cannot be consumed as AC-01 actual-head evidence.
- [x] AC-03: On the post-merge `push` to `main`, code-executing jobs explicitly check out and prove the event SHA, and final delivery succeeds only when PR merge SHA, Actions run head SHA, actual checkout SHA, repository, and `main` branch identity all equal the expected merge SHA.
- [x] AC-04: The delivery evaluator consistently binds trusted local repository/base/outcome expectations to one PR number and a versioned GitHub snapshot whose actual-head, merge-compatibility, review/merge, and post-merge evidence carry complete workflow/run-attempt/job identities; conflicting role, repository, base, PR, head, job, run, or merge identities cannot produce terminal satisfaction.
- [x] AC-05: A PR-associated successful run or successful `refs/pull/<number>/merge` checkout alone never returns actual-head PASS. The observed PR #40 evidence remains truthfully classified as successful legacy merge compatibility plus successful exact post-merge `main`, with actual PR-head checkout unverified, and is never retroactively promoted to exact-head success.
- [x] AC-06: Missing, partial, stale, malformed, mismatched, unknown-version, reused-role, or synthetic-only claimed-success evidence fails closed as `RESUMABLE` when no final claim exists or `BLOCKED` when supplied evidence is invalid; only a complete role-separated exact identity graph returns terminal `SATISFIED`.
- [x] AC-07: One-active-Task selection, dependency and status grammar, evidence honesty, current and legacy Task readers, already completed pre-contract delivery continuity, ordinary `STANDARD` authority, five-Skill responsibility boundaries, immutable Action pins, credential-free CI, user-work safety, and publication boundaries remain intact without historical artifact rewrites.
- [x] AC-08: This Task's own non-draft PR must produce inspectable actual-head and separate merge-compatibility evidence under the hardened workflow, and its post-merge `main` run must prove the exact merge SHA before terminal delivery reporting; mutable PR/run facts stay in the external ledger and are not pre-claimed as repository test PASS.

## Plan

- [x] Define the smallest versioned delivery expectation/ledger shape, explicit evidence-role invariants, pending/final classifications, and bounded pre-contract compatibility rule.
- [x] Change the PR workflow to make actual-head Stable/packed checkout identity explicit and add a separate PR merge-compatibility job while preserving main/manual isolation, immutable Action pins, credentials, timeouts, and supported lanes.
- [x] Harden the shared delivery evaluator and queue-facing classification so final satisfaction requires the complete actual-head, merge-compatibility, review/merge, and post-merge identity graph.
- [x] Update `kyw-impl` collection/reporting guidance and synchronize affected SPEC, ARCHITECTURE, and README truth without moving execution responsibility or adding another engine.
- [x] Add positive, pending, historical, malformed, stale, mismatch, role-confusion, run/job-reuse, workflow, queue, current/legacy, and instruction regressions.
- [x] Re-run the exact PR #40 read-only evidence inspection and prove it is retained without an exact-head PASS.
- [x] Run the changed-path planner, its focused and required Stable/Release commands, canonical pair validation, and final diff-to-matrix review without crossing excluded release boundaries.
- [x] Prepare the repository-complete ordinary-delivery handoff for this Task's actual PR-head and merge-compatibility run, expected-head merge, and exact post-merge `main` run; mutable completion remains the separate external ledger gate.

## Decisions

- Keep one atomic Task because workflow checkout behavior, ledger vocabulary, evaluator acceptance, execution guidance, and regressions would be unsafe or unusable if shipped independently.
- The PR Stable matrix and packed-release job validate the actual PR head. A separate Ubuntu/Node 24 merge-compatibility job validates the base-combined synthetic merge with the complete Stable command set; it is supplementary and cannot substitute for actual-head evidence.
- Every code-executing checkout receives an immediate cross-platform identity assertion and a stable machine-readable evidence line. GitHub API run/job metadata supplies numeric run and job identities; workflow logs supply the asserted actual checkout and role-specific parent identities.
- One PR workflow run may carry both actual-head and merge-compatibility roles only through distinct jobs and role records. The post-merge `main` role must use a separate `push` run at the final merge SHA.
- New/current delivery evidence uses an explicit hardened contract version. Pre-contract evidence may preserve queue continuity only through an explicitly named legacy classification derived from trusted local history; that classification exposes actual-head as `UNVERIFIED`, cannot be selected for a newly delivered outcome, and cannot be reported as exact-head PASS.
- Preserve the existing shared `src/core/task-artifact-*` graph and packaged adapter. `kyw-impl` remains the sole production Skill owner of delivery collection and interpretation; `kyw-task` remains authoring-only.
- Do not edit historical artifacts or GitHub state. Regression fixtures may use the exact observed PR #40 identities to prevent later semantic rewriting.

## Risks

- GitHub Actions associates a pull-request run with the PR head while default checkout materializes a synthetic merge ref; trusting only run `head_sha`, PR association, or check conclusion recreates the defect.
- A shared run ID without distinct job/role identity can let merge-compatibility evidence masquerade as actual-head evidence.
- A permissive legacy fallback could become a bypass for new Tasks; eligibility must come from trusted pre-contract history and remain visibly non-exact.
- A too-strict migration could freeze future queue selection on already completed pre-contract deliveries; compatibility must preserve terminal delivery continuity without changing evidence labels.
- PR, push, and manual events expose different SHA/ref fields, and skipped PR-only jobs can accidentally make the aggregate gate pass or fail incorrectly on another event.
- Cross-platform checkout assertions must behave identically on Linux, macOS, and Windows and must run before repository verification.
- The self-applicable AC-08 delivery proof is external and mutable; repository tests must prove the contract without embedding future run facts, while ordinary delivery must still inspect the actual run before terminal reporting.
- Workflow, packaged runtime, Skill, and permanent-document changes are release-sensitive and will require planner-selected candidate verification without registry interaction.

## Discoveries and Changes

- Authoring preflight on 2026-07-27 found clean `main`; local HEAD, local `main`, cached `origin/main`, direct remote `main`, and GitHub `refs/heads/main` all equal `4463051d2bd073048321b09f0b6524ea31fb8f80`.
- The repository has 53 Task/Test pairs: 47 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, and one historical `CANCELLED/BLOCKED`; Task 0053 is the latest completed pair and no Task is DRAFT, READY, or active.
- Packaged transaction inspection returned `NONE/NO_TRANSACTION_EVIDENCE`, no open pull request targets `main`, and the production Skill inventory is exactly `kyw-grilling`, `kyw-init`, `kyw-task`, `kyw-impl`, and `kyw-audit`.
- Installed CLI observation is `codex-cli 0.145.0`; it is recorded only as installed-tool provenance and is not substituted for the active API surface version or hidden model/effort fields.
- PR #40 has actual head `c1a896e447020cd99d80079e770d95e9cd387474`, base `bc6cf87b2e391f14f39c95726d8d0e89dd58cbe9`, and final merge commit `4463051d2bd073048321b09f0b6524ea31fb8f80`.
- PR run `30263213789` reports event `pull_request`, run head `c1a896e447020cd99d80079e770d95e9cd387474`, attempt 1, and success, but Stable job `89967727509` fetched and checked out `refs/pull/40/merge` at `e27468e27fab93a06c0a250278982751035dc4eb`; that synthetic commit's parents are the exact base and PR head above.
- The current workflow uses default checkout in both code-executing jobs and has no explicit expected-versus-actual checkout assertion or separately named merge-compatibility evidence role.
- A real-shaped current ledger using PR run `30263213789` and post-merge run `30263379563` returns `{ satisfied: true, issues: [] }` from the current evaluator even though the PR job actual checkout is synthetic `e27468e...`; the evaluator currently validates only PR metadata head, coarse check status/run ID, and final main run identity.
- Post-merge `main` run `30263379563` is a successful `push` run whose API head and observed job checkout both equal final merge SHA `4463051d2bd073048321b09f0b6524ea31fb8f80`; that exact-main evidence remains valid and must be preserved.
- The request is one independently verifiable outcome: changing only workflow, evaluator, or guidance would leave either unverifiable evidence or a false-positive path, while the combined change remains session-sized and has one coherent acceptance graph.
- Implementation preflight on 2026-07-27 reconfirmed pair validity, no retained Task transaction, no open PR to `main`, and exact equality across local HEAD/local `main`/cached `origin/main`/direct remote `main`/GitHub `main` at `4463051d2bd073048321b09f0b6524ea31fb8f80`.
- The first exact dispatcher call correctly stopped with `QUEUE_TRANSITION_BLOCKED` because no external ledger had been supplied for pre-contract completed `STANDARD` Tasks. A fresh read-only continuity collector then proved, for each completed current Task 0030–0053 except blocked Task 0051, that the local merge commit is in `main`, its second parent equals the merged PR head, and successful PR-head-associated plus exact merge-SHA `main` runs exist; the same invocation then returned `SELECTED/IMPLEMENT` with `STANDARD_LIFECYCLE` authority.
- The implementation branch `task/0054-harden-pr-ci-actual-head-evidence` was created without force from exact preflight base `4463051d2bd073048321b09f0b6524ea31fb8f80`; the authored Task/Test pair was the only pre-existing worktree content.
- The hardened expectation schema is version 2 and binds trusted repository/base/outcome plus workflow and required job names. A schema-2 `FINAL` GitHub graph requires every actual-head Stable/packed job and gate, one distinct same-run synthetic merge job with exact parents, the reviewed merge, and every distinct-run post-merge job and gate; numeric job IDs cannot be reused across roles.
- A schema-2 `PENDING` graph is resumable only while every supplied record is internally valid. Unknown versions, missing final roles, stale/mismatched identities, synthetic-only final evidence, and role/job reuse are invalid; known non-success conclusions and review blockers are delivery blockers.
- Historical continuity requires a trusted `LEGACY_PRE_CONTRACT` expectation with exact local anchor/merge SHAs and a schema-1 GitHub ledger labeled `LEGACY_PRE_CONTRACT_CONTINUITY`; queue results project actual-head as `UNVERIFIED`. The exact PR #40-shaped fixture retains its observed synthetic merge checkout/parents and exact post-merge checkout without promotion.
- CI now gives Stable and packed jobs an explicit event-specific checkout ref plus immediate `KYWCIEVIDENCE` equality assertion. A PR-only Ubuntu/Node 24 merge-compatibility job checks the synthetic event SHA and both parents, runs the full Stable command set, and is required only on PRs; push/manual aggregate behavior requires that job to be skipped.
- Focused implementation tests initially exposed stale coarse-ledger assertions and then an overlong execution projection. Corrective iterations changed the assertions to role fields and compressed the execution owner without weakening its schema; the final four-surface focused run passed 44 tests.
- The implementation-time PR #40 reinspection reconfirmed the exact historical facts without a rerun: PR head `c1a896e447020cd99d80079e770d95e9cd387474`, base `bc6cf87b2e391f14f39c95726d8d0e89dd58cbe9`, synthetic checkout `e27468e27fab93a06c0a250278982751035dc4eb` in job `89967727509` of run `30263213789`, and exact post-merge checkout `4463051d2bd073048321b09f0b6524ea31fb8f80` in job `89968284743` of run `30263379563`.
- The exact 15-path planner classified the change `RELEASE`. Its first `npm run release:ci` stopped at 312/314 tests because two retained hosted-command-count assertions still expected one Stable boundary; role-aware corrections passed focused 11/11 and the corrective full run passed 314/314 plus lint, format, pack, and packed candidate.
- Final diff review found two fail-closed projection gaps before commit: the PR base SHA was internally consistent but not bound to the trusted-local expectation, and resumable queue output discarded already verified role states. Exact `baseSha` binding, a jointly stale base/parent regression, and resumable actual-head/merge/post-merge projections were added; subsequent focused runs passed 40/40 and 44/44.
- The final pre-commit drift audit reconfirmed local HEAD, local `main`, cached `origin/main`, direct remote `main`, and GitHub `main` at `4463051d2bd073048321b09f0b6524ea31fb8f80`. The repository outcome is terminal before external delivery because mutable PR/Actions facts cannot be committed without invalidating the head they describe; AC-08 is completed only by the separate ledger gate during the same invocation.
- The final planner-selected local run, after the last queue projection and documentation wording edits, passed 314/314 tests, lint, format, pack, and a 41-file/98,907-byte packed candidate with SHA-256 `f46bbc1e9ac19a6a97ff2f09135db47ca5d8bb5e84ed49007e5ea9b644d464db`.

## Documentation Impact

- SPEC: Updated user-visible `STANDARD` delivery meaning so actual PR head, merge compatibility, and post-merge exact-main evidence are distinct and fail closed.
- ARCHITECTURE: Updated workflow checkout/identity flow, role-separated ledger schema, evaluator/migration boundary, and aggregate CI topology.
- README: Updated the concise maintainer CI/delivery explanation and exact-head versus merge-compatibility terminology.
- AGENTS: Unaffected because its one-active-Task, evidence-honesty, stable-command, and completion invariants already cover the change; no repository-wide rule changed.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed authoring-only inspection of permanent sources, the execution reference, current workflow/evaluator/adapter/tests, Task inventory, transaction state, Git identities, PR #40, its PR job checkout log, its synthetic merge commit parents, and its post-merge `main` run.
- Confirmed the expected baseline without drift and selected one atomic Task with no hard dependency.
- Prepared the role-separated design, acceptance graph, compatibility boundary, reproducible test intent, and prohibited-action boundary without implementation or GitHub mutation.
- Revalidated repository, direct-remote, and GitHub baseline; proved pre-contract delivery continuity from fresh Git/GitHub metadata; obtained exact dispatcher `IMPLEMENT` selection; and created the dedicated branch at the verified base.
- Implemented schema-v2 hardened and explicit schema-v1 legacy delivery evaluation, queue classification projection, exact-head/post-merge checkout assertions, separate synthetic merge compatibility, focused positive/failure/PR #40/queue/workflow regressions, and owner-routed permanent/execution documentation.
- Reached 44/44 PASS on the complete planned focused command after retaining each preceding local failure and correction.
- Reinspected PR #40 exactly, followed the changed-path `RELEASE` plan, corrected its two discovered retained-test failures, added the final trusted-base and resumable-projection safeguards, and completed the diff-to-matrix review.
- Completed the final planner-selected 314-test Release regression and terminal Task/Test handoff without invoking any prohibited registry, publication, model, version, tag, or Release boundary.

## Remaining

- None — the repository outcome and reproducible acceptance evidence are complete; mutable GitHub PR/Actions delivery remains the canonical external queue gate, not future repository work.

## Resume Point

- None — resume is unnecessary for repository implementation; the recognized invocation proceeds directly through the external `STANDARD` delivery ledger.

## Blockers

- Not applicable — the baseline, intent, evidence defect, atomic boundary, and safe compatibility direction are settled; no user-owned decision blocks implementation.
