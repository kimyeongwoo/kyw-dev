# TEST 0054 — Harden PR CI Actual-Head Evidence

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially exact-SHA `STANDARD` delivery, credential-free public CI, evidence honesty, and current/legacy compatibility.
- Architecture constraints: `../../ARCHITECTURE.md`, especially the single delivery engine, GitHub ledger boundary, CI topology, supported runtime lanes, and repository-versus-external evidence separation.
- Repository rules: `../../../AGENTS.md`.
- Canonical execution procedure: `../../../skills/kyw-impl/references/execution.md`.
- Current implementation under test: `../../../.github/workflows/ci.yml`, `../../../src/core/task-artifact-delivery.mjs`, `../../../src/core/task-artifact-queue.mjs`, and the packaged adapter.
- Historical regression basis: PR #40, PR run `30263213789`, synthetic merge `e27468e27fab93a06c0a250278982751035dc4eb`, and post-merge run `30263379563`; these authoring observations establish a defect fixture, not implementation PASS evidence.
- Installed-tool provenance: `codex-cli 0.145.0` (`OBSERVED` from the installed command); it does not substitute for the active surface version below.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version; the installed CLI observation is separate)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — actual PR-head checkout and deterministic equality proof | Parse the production workflow and mutation variants; require explicit PR-head `ref` plus an immediate identity step in every Stable/packed job, then reject default/synthetic ref, missing assertion, wrong expected SHA, or assertion-after-tests variants. | Static/workflow | PASS | `test/continuous-integration.test.mjs` passed; exact checkout topology and five unsafe mutation variants were exercised. |
| T-02 | AC-02 — distinct base-combined merge compatibility | Require one PR-only merge-compatibility job with synthetic SHA/base/head parent assertions and combined-state checks; prove its job/role identity cannot satisfy the actual-head evaluator fields or aggregate gate incorrectly on push/manual events. | Static/integration | PASS | Workflow topology plus evaluator role, parent, synthetic/head distinction, reused-job, and aggregate-event mutations passed. |
| T-03 | AC-03 — exact post-merge `main` checkout | Exercise push/main workflow parsing and evaluator fixtures where PR merge SHA, run head SHA, actual checkout SHA, branch, repository, event, and run/job identities all match; mutate each field and require failure. | Static/unit | PASS | Hardened happy path and post-merge event/branch/run/head/checkout/job/gate failure cases passed. |
| T-04 | AC-04 — complete role-separated delivery identity graph | Add a full hardened-ledger happy path and pending/open/merged states; assert repository, base, PR number, outcome, workflow, run ID/attempt, distinct job roles, synthetic parents, review, final merge, and post-merge identities are all bound before `SATISFIED`. | Unit/integration | PASS | Full v2 `FINAL`, expectation-only, open `PENDING`, and merged/pre-main `PENDING` cases passed with exact classification projections. |
| T-05 | AC-05 — synthetic-only evidence and PR #40 are not exact-head PASS | Reproduce the observed PR #40 identity graph: run head `c1a896e...`, actual checkout `e27468e...`, parents `bc6cf87...`/`c1a896e...`, final merge/main `4463051...`; require merge-compatibility and post-merge success to remain visible while actual-head is `UNVERIFIED` and terminal exact-head satisfaction is denied. | Unit/audit | PASS | Exact PR #40-shaped fixture returned legacy continuity with actual-head `UNVERIFIED`, synthetic `VERIFIED_SYNTHETIC`, and post-merge `VERIFIED_EXACT_CHECKOUT`; hardened promotion and missing eligibility were rejected. |
| T-06 | AC-06 — fail-closed missing, stale, malformed, mismatch, version, and role-reuse behavior | Table-drive omission, type/format, uppercase/short SHA, unknown version, stale PR head, wrong checkout, wrong parents, reused job, conflicting run attempt/event/workflow, merge mismatch, and partial-success cases across final and pending classification. | Unit/failure | PASS | Table-driven expectation/evidence mutations, synthetic-only final, unversioned coarse evidence, CI/review failure, and identity drift all returned non-satisfied classifications. |
| T-07 | AC-07 — queue, reader, authority, five-Skill, CI security, and publication compatibility | Run dispatcher/queue/current-legacy pair regressions plus instruction, workflow, package, action-pin, permission, credential, version, and forbidden-command assertions; prove legacy continuity is visibly non-exact and unavailable to new outcomes. | Integration/packaging | PASS | Focused queue/workflow/instruction runs passed 44/44; planner-selected `release:ci` passed 314/314 tests plus lint, format, pack, and packed-candidate checks without crossing a forbidden release boundary. |
| T-08 | AC-08 — self-applicable actual delivery contract | On this Task's real PR, inspect the literal workflow/run/attempt/job logs for actual-head and merge-compatibility roles; after expected-head merge, inspect the literal main push run and checkout. Feed only the fresh expanded identities to the hardened evaluator and require terminal delivery, keeping mutable results outside this file. | E2E/external audit | N/A | Repository-test PASS is intentionally inapplicable to mutable self-referential PR/run facts: the terminal pair hands this exact method to the separate GitHub ledger gate, which must succeed before this invocation reports delivery complete. |
| T-09 | AC-01–AC-08 — final diff and required regression coverage | Run the exact changed-path planner, its ordered focused/Stable/Release plan, canonical pair validation, `git diff --check`, and a final enumeration mapping every workflow/evaluator/guidance/document branch to the matrix. | Stable/release/audit | PASS | Final exact planner returned `RELEASE`; the last `release:ci` passed 314/314 plus lint/format/pack/candidate, and pair/diff/path review covered all 15 paths and every AC mapping. |

## Regression Coverage

- Pull-request, `main` push, and manual triggers; PR-only cancellation, commit-specific non-cancelling `main` groups, manual isolation, aggregate result, timeouts, read-only permissions, disabled checkout credentials, and no secret or publication command.
- Node 22/24 Linux, macOS, and Windows Stable lanes; bounded Ubuntu Node 26 lane; packed Node 24 candidate; immutable full-SHA Action pins and readable release comments.
- Exact/next/continuous dispatcher behavior, one active pair, hard dependencies, repository-complete delivery resume, current and legacy artifact readers, and terminal no-work semantics.
- Separate repository acceptance versus mutable GitHub delivery evidence; no unsupported PASS claim and no future result embedded in Task/Test.
- Five explicit production Skills, author-only `kyw-task`, execute-only `kyw-impl`, one packaged adapter/core graph, package version `0.1.0`, zero production dependencies, and existing publication boundaries.
- Historical PR #40 merge-ref and post-merge success evidence retained without rewriting Task 0053 or GitHub history.

## Commands

- Executed during authoring: `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks` — exit `0`, `NONE/NO_TRANSACTION_EVIDENCE`; this is preflight, not implementation verification.
- Executed during authoring: `gh pr view 40 --repo kimyeongwoo/kyw-dev --json number,title,state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid,mergeCommit,mergedAt,mergeStateStatus,statusCheckRollup,url` — exit `0`, exact PR/base/final-merge/run association observed.
- Executed during authoring: `gh run view 30263213789 --repo kimyeongwoo/kyw-dev --job 89967727509 --log` — exit `0`, actual checkout `e27468e27fab93a06c0a250278982751035dc4eb` from `refs/pull/40/merge` observed.
- Executed during authoring: `gh api repos/kimyeongwoo/kyw-dev/git/commits/e27468e27fab93a06c0a250278982751035dc4eb` — exit `0`, parent order base `bc6cf87b2e391f14f39c95726d8d0e89dd58cbe9`, head `c1a896e447020cd99d80079e770d95e9cd387474` observed.
- Executed during authoring: `gh run view 30263379563 --repo kimyeongwoo/kyw-dev --job 89968284743 --log` — exit `0`, post-merge checkout `4463051d2bd073048321b09f0b6524ea31fb8f80` observed.
- Executed during implementation preflight: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0054-harden-pr-ci-actual-head-evidence` — exit `0`, pair valid.
- Executed during implementation preflight: `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks` — exit `0`, `NONE/NO_TRANSACTION_EVIDENCE`.
- Executed during implementation preflight: `git ls-remote origin refs/heads/main`; `gh api repos/kimyeongwoo/kyw-dev/git/ref/heads/main --jq .object.sha`; local/cached `git rev-parse` inspection — each exit `0`, all identities equal `4463051d2bd073048321b09f0b6524ea31fb8f80`.
- Executed during implementation preflight: `gh pr list --repo kimyeongwoo/kyw-dev --state open --base main --json number,title,headRefName,headRefOid,baseRefName,isDraft,state,url` — exit `0`, returned `[]`.
- Executed during implementation preflight: packaged `dispatch` with the exact current invocation, empty verified execution-preflight findings, and no historical delivery ledger — exit `0`, expected fail-closed result `BLOCKED/QUEUE_TRANSITION_BLOCKED`; this is the first retained implementation-attempt failure, not a CI rerun.
- Executed during implementation preflight: fresh `gh pr list --state merged`, `gh api 'repos/kimyeongwoo/kyw-dev/actions/runs?per_page=100'`, per-Task `git rev-parse <merge-sha>^2`, and `git merge-base --is-ancestor <merge-sha> main`, followed by packaged `dispatch` with in-memory trusted expectations and GitHub ledger — all exit `0`; 23 completed Tasks had exact local merge-parent/PR-head plus successful PR and merge-SHA `main` continuity, and Task 0054 returned `SELECTED/IMPLEMENT`.
- Executed during implementation preflight: `git switch -c task/0054-harden-pr-ci-actual-head-evidence` — exit `0`, branch created at `4463051d2bd073048321b09f0b6524ea31fb8f80`.
- Executed during implementation: `node --test test/task-dispatch.test.mjs test/continuous-integration.test.mjs` — exit `1`, 24/26 passed; v2 classification added fields not present in old deep equality and coarse `pullRequest.checks` mutation became an unknown-field invalid result.
- Corrective rerun of the same command — exit `1`, 25/27 passed; remaining expected-message patterns still named the coarse wording.
- Corrective rerun of the same command — exit `1`, 26/27 passed; one quoted exact-task message pattern remained stale.
- Corrective rerun of the same command — exit `1`, 26/27 passed; one stale-head message pattern remained coarse.
- Corrective rerun of the same command — exit `0`, 27/27 passed after every assertion targeted role-separated fields.
- Executed after adding queue projection/legacy advancement: `node --test test/task-dispatch.test.mjs test/continuous-integration.test.mjs` — exit `0`, 28/28 passed.
- Executed planned focused command: `node --test test/continuous-integration.test.mjs test/task-dispatch.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs` — exit `1`, 42/44 passed; execution regex did not accept the `actualHead` field and representative instructions exceeded their byte budget by 1,461 bytes.
- Corrective rerun of the same focused command — exit `1`, 41/44 passed; two phrase assertions still named the pre-compression wording and the bundle remained 283 bytes over budget.
- Corrective rerun of the same focused command — exit `0`, 44/44 passed after tightening the execution projection to below the existing byte threshold and aligning semantic assertions.
- Executed during implementation reinspection: `gh pr view 40 --repo kimyeongwoo/kyw-dev --json number,state,isDraft,headRefOid,baseRefOid,mergeCommit,mergedAt,statusCheckRollup,url`; `gh run view 30263213789 --repo kimyeongwoo/kyw-dev --job 89967727509 --log`; `gh api repos/kimyeongwoo/kyw-dev/git/commits/e27468e27fab93a06c0a250278982751035dc4eb`; and `gh run view 30263379563 --repo kimyeongwoo/kyw-dev --job 89968284743 --log` — each exit `0`, retaining actual-head `UNVERIFIED`, synthetic compatibility `VERIFIED_SYNTHETIC`, and post-merge `VERIFIED_EXACT_CHECKOUT` without a rerun.
- Executed exact changed-path planner with all 15 final paths — exit `0`, `Verification tier: RELEASE`, ordered command `npm run release:ci`, hosted requirement `7 lanes × 4 commands + 1 candidate job = 29 leaf commands`.
- Executed first planner-selected `npm run release:ci` — exit `1`, stopped in `npm test` at 312/314: `completed-outcome-retention.test.mjs` and `verification-plan.test.mjs` still required one hosted Stable command boundary instead of the new exact-head plus merge-compatibility boundaries; lint, format, pack, and candidate did not execute after the test failure.
- Executed corrective focused command `node --test test/completed-outcome-retention.test.mjs test/verification-plan.test.mjs` — exit `0`, 11/11 passed after making both retained invariants role-aware.
- Executed exact changed-path planner again — exit `0`, unchanged `RELEASE` classification and ordered `npm run release:ci`.
- Executed corrective `npm run release:ci` — exit `0`, 314/314 tests, lint 73 modules, format 303 files, pack 41 files/98,811 bytes, candidate 41 files/98,811 bytes with SHA-256 `274367d65781aa1ebf8cfe704598c017ab2054a866105a6c36329503c6bad96d`.
- Executed final-diff focused audit after adding trusted-local `baseSha` binding — exit `0`, 40/40 across dispatcher and instruction owners; exact planner remained `RELEASE`.
- Executed corrective `npm run release:ci` after the base binding — exit `0`, 314/314 tests, lint/format/pack passed, candidate 41 files/98,844 bytes with SHA-256 `d249e249d511f0d31b8f4ab72de197d861a67456eca6872f3d3bf95811f8b2ca`.
- Executed final-diff focused audit after projecting partial resumable delivery roles: `node --test test/task-dispatch.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs test/continuous-integration.test.mjs` — exit `0`, 44/44 passed.
- Executed final exact changed-path planner after all implementation and evidence edits — exit `0`, unchanged `RELEASE` classification and ordered `npm run release:ci`.
- Executed final planner-selected `npm run release:ci` — exit `0`, 314/314 tests, lint 73 modules, format 303 files, pack 41 files/98,907 bytes, candidate 41 files/98,907 bytes with SHA-256 `f46bbc1e9ac19a6a97ff2f09135db47ca5d8bb5e84ed49007e5ea9b644d464db`.
- Executed canonical pair validation and `git diff --check` before terminalization — each exit `0`; repeated final forms are required after the last ledger edit.
- Executed local/cached/direct/GitHub base audit — each exit `0`, local HEAD/local `main`/cached `origin/main`/direct remote `main`/GitHub `main` remained `4463051d2bd073048321b09f0b6524ea31fb8f80`.
- External delivery inspection remains deliberately unexpanded here: fresh API discovery will replace real PR/run/job identities in the in-memory GitHub ledger, and exact `gh run view <observed-run-id> --job <observed-job-id> --log` commands cannot count as evidence until those identities exist.

## Results

- Authoring observation only — exact local/GitHub evidence reproduces the false-positive design: the current evaluator accepts PR #40-shaped delivery as satisfied although its PR jobs checked out a synthetic merge commit.
- Authoring observation only — PR #40's synthetic merge compatibility and exact post-merge `main` success are both real and retained; no actual PR-head checkout was observed.
- Implementation preflight PASS — the pair, queue transaction state, exact base identities, branch base, and pre-contract delivery continuity were verified; the initial missing-ledger dispatcher failure and successful evidence-backed selection are both retained.
- Focused implementation PASS — workflow/evaluator/queue/instruction tests passed 44/44 after the retained corrective sequence; T-01 through T-06 have direct acceptance-specific evidence.
- Historical evidence PASS — PR #40 was reinspected read-only and remains synthetic compatibility plus exact post-merge evidence with actual head explicitly `UNVERIFIED`.
- Stable/Release PASS to the latest base-binding change — the exact planner selected `RELEASE`; the retained first failure was corrected; two subsequent full runs passed 314/314 plus lint, format, pack, and candidate checks.
- Final repository verification PASS — the last planner-selected run included the resumable projection and terminal-handoff content and passed 314/314 plus every Release leaf; final pair and diff integrity are revalidated after this ledger edit.

## Unverified

- The hardened contract cannot be proven on this Task's own PR or post-merge `main` run until ordinary `STANDARD` delivery creates those external identities.
- No registry dry-run, actual release evidence, model-backed evaluator, publication, version mutation, tag, GitHub Release, or public submission was executed; those exclusions are intentional, not acceptance gaps.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
