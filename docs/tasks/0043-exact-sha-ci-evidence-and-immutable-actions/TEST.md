# TEST 0043 — Exact-SHA CI Evidence and Immutable Actions

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially credential-free public CI, supported runtimes, exact-SHA delivery, and no-publication boundaries.
- Architecture constraints: `../../ARCHITECTURE.md`, especially workflow triggers, concurrency, permissions, Stable/packed jobs, and aggregate evidence.
- Repository rules: `../../../AGENTS.md`.
- Verification policy: official upstream pin provenance, focused static workflow tests, full Stable, and exact-head/post-merge hosted observation without reruns.
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
| T-01 | AC-01 — PR-specific cancellation | Assert PR concurrency keys include stable PR identity and `cancel-in-progress` applies to superseded runs for that PR. | Static/workflow | PASS | Focused workflow test matched `pr-{number}` and PR-only cancellation; unsafe PR identity mutation failed the helper. |
| T-02 | AC-02 — Immutable `main` run evidence | Assert `main` push grouping contains the exact commit SHA and later pushes cannot cancel earlier SHA runs. | Static/workflow | PASS | Focused workflow test matched `push-{github.sha}` with cancellation false for push; a `github.ref` mutation was rejected. |
| T-03 | AC-03 — Manual-run isolation | Evaluate manual-dispatch grouping and prove it cannot collide with unrelated exact-SHA `main` groups. | Static/workflow | PASS | Focused workflow test matched the distinct `manual-{github.run_id}` fallback; a ref-colliding mutation was rejected. |
| T-04 | AC-04 — Full-SHA official Action pins | Reject non-40-character or movable refs and verify each pinned commit against the official Action upstream with a readable version comment. | Static/provenance | PASS | Official refs/tags and commit APIs verified checkout v6.1.0 `d23441a48e516b6c34aea4fa41551a30e30af803` and setup-node v6.5.0 `249970729cb0ef3589644e2896645e5dc5ba9c38`; all four uses and comments passed static checks. |
| T-05 | AC-05 — Matrix, permissions, and no-publication compatibility | Snapshot/assert supported lanes, packed job, aggregate job, permissions, credential persistence, secrets absence, and forbidden commands. | Regression/static | PASS | Focused 4/4 and final 279/279 retained every lane/job/command/permission/credential assertion; lint, format, package selection, and candidate inspection passed. |
| T-06 | AC-06 — Regression sensitivity | Mutate fixtures or parsed content to reintroduce a major tag and unsafe cancellation expressions and require deterministic failures. | Unit/failure | PASS | `CI regression guards reject movable Action refs and unsafe event concurrency` rejected four concurrency and three pin/provenance mutations. |
| T-07 | AC-07 — Repository/delivery evidence boundary | Inspect the pair and permanent contract to prove hosted PR and post-merge results are not pre-claimed as repository PASS evidence and remain required in the subsequent external ledger. | Static/integrity | PASS | Final pair validation passed with repository-only evidence and reasoned terminal handoff; `STANDARD` remains the static external ledger requirement. |
| T-08 | AC-01–AC-07 — Final local coverage | Run focused tests, planner-selected Stable checks, canonical Task validation, and final diff/workflow review. | Stable/integrity | PASS | Focused 4/4; planner selected `RELEASE`; `npm run release:ci` passed 279/279 plus lint, format, 29-file package selection, and candidate SHA-256 `40d3bb08c1bdc992583a33b2c547ba59ed665b3da40fc033ea6894eff630e6d7`; all 47 pairs, residue, diff, and scope review passed. |

## Regression Coverage

- Pull-request, `main` push, and manual triggers; read-only repository permission; disabled credential persistence; no secret reference.
- Node 22/24 Linux, macOS, and Windows lanes; bounded Node 26 Ubuntu lane; packed Node 24 job; aggregate required result.
- Stable commands, real candidate command ownership, cancellation/timeouts, and absence of publish, tag, release, merge, or branch-protection mutation.
- Exact-SHA `STANDARD` delivery observation without treating hosted CI as behavioral acceptance.

## Commands

- Initial combined upstream-query loop — exited 1 after retrieving the checkout release/ref because PowerShell rejected the constructed `git ls-remote` argument shape; no repository mutation occurred.
- Corrected official-upstream bundle using `gh api repos/<action>/tags?per_page=100`, `git ls-remote https://github.com/<action>.git refs/tags/v6 refs/tags/v6^{}`, `gh api repos/<action>/git/ref/tags/v6`, and `gh api repos/<action>/commits/<sha>` — passed for `actions/checkout` and `actions/setup-node`, including valid signature evidence.
- `node --test test/continuous-integration.test.mjs` — passed 4/4.
- `npm run verify:plan -- .github/workflows/ci.yml test/continuous-integration.test.mjs README.md docs/ARCHITECTURE.md docs/tasks/0043-exact-sha-ci-evidence-and-immutable-actions/TASK.md docs/tasks/0043-exact-sha-ci-evidence-and-immutable-actions/TEST.md` — selected `RELEASE` because the workflow is release-sensitive.
- `npm run release:ci` — passed 279/279, lint over 59 JavaScript modules and foundation metadata, format over 272 text files, package selection over 29 files / 98,351 bytes, and real candidate SHA-256 `40d3bb08c1bdc992583a33b2c547ba59ed665b3da40fc033ea6894eff630e6d7`.
- Canonical all-Task validation loop — passed all 47 Task/Test pairs before terminalization and again after `DONE/PASSED`.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0043-exact-sha-ci-evidence-and-immutable-actions` — passed after terminalization.
- Final `npm run format:check` — passed over 272 UTF-8/LF text files after terminal evidence updates.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root ./docs/tasks` — returned `NONE` / `NO_TRANSACTION_EVIDENCE`.
- `git diff --check` — passed before and after terminalization.
- Complete tracked diff, current pair, changed-path, workflow invariant, AC-to-test, and out-of-scope review — passed; the pre-created 0044–0047 pairs remained outside this Task's changes.

## Results

- Fresh preflight confirmed clean staged/unstaged state, only the pre-created 0043–0047 pairs as untracked paths, exact local/direct-remote `main` SHA `4c6c121808cfa3b86f4369d0edf6d2ed0c493d28`, no active Git or Task transaction, and no unexplained current-queue residue.
- The corrected Task 0042 delivery snapshot contains exact `taskId` `"0042"`, successful PR run `30142590555` at head `a4812d1e07b7d0412da58a106fef9a506d8d4d2d`, and successful post-merge run `30142658184` at `main` SHA `4c6c121808cfa3b86f4369d0edf6d2ed0c493d28`.
- Official upstream Git refs and commit APIs verified `actions/checkout` commit `d23441a48e516b6c34aea4fa41551a30e30af803` as current v6.1.0 and `actions/setup-node` commit `249970729cb0ef3589644e2896645e5dc5ba9c38` as current v6.5.0; both commits report valid GitHub signature verification.
- AC-07/T-07 was reconciled before implementation so mutable hosted results remain an external delivery gate rather than a self-referential repository PASS prerequisite.
- Event-specific concurrency, full-SHA pins, readable comments, matrix/jobs, permissions, credentials, and forbidden mutation behavior all passed focused positive assertions and mutation-based negative cases.
- The planner-required Release boundary passed the complete Stable suite and one real immutable package candidate. No registry probe, publish dry run, publication, tag, release, merge, rerun, or branch-protection mutation occurred.
- Final diff review mapped PR, push, manual, pin/provenance, compatibility, and external-evidence boundary behavior to T-01 through T-08 with no uncovered branch or out-of-scope path.

## Unverified

- None — repository acceptance is verified. Exact-head pull-request CI and post-merge `main` CI remain mutable external `STANDARD` delivery-ledger evidence and are not claimed as behavioral PASS rows here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
