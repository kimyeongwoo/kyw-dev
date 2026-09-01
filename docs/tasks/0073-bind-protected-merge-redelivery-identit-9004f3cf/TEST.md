# TEST 0073 — Bind Protected-Merge Redelivery Identity to the Leading Source Task

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no model override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Only a leading source-branch Task identity establishes redelivery identity. | Table-test standard merge subjects across owner boundaries, leading and suffix positions, both separators, and exact ID termination. | Unit / identity | PASS | One-shot focused proof passed the leading-identity table and rejected later owner, nested, slug, and description tokens. |
| T-02 | AC-02 — The exact PR `#60` shape belongs to Task 0072, not Task 0070. | Build the exact subject and a PR-60-isomorphic two-parent temporary-Git history; inspect derived additional deliveries for both Tasks. | Integration / regression | PASS | Exact subject parsing returned Task `0072`; the isomorphic temporary Git history and current-main scan found no Task `0070` additional delivery. |
| T-03 | AC-03 — A genuine same-Task later delivery remains blocked. | Preserve and strengthen the existing same-Task follow-up fixture and assert the immutable error code, canonical pair path, later merge identity, and correction guidance before dispatch. | Integration / security | PASS | Focused genuine Task `0070` follow-up rejected the exact merge SHA with `FUTURE_TERMINAL_PAIR_IMMUTABLE`, canonical path, correction route, and hard-dependency guidance. |
| T-04 | AC-04 — Compatibility and malformed boundaries remain fail closed. | Cover `task/`, `task-`, optional `agent/`, near IDs, other leading IDs with same-ID suffixes, owner and nested tokens, malformed subjects, ambiguous forms, and history bounds. | Unit / compatibility | PASS | Both separators and `agent/` forms passed; near IDs, nested tokens, whitespace, malformed subjects, and one/three-parent records returned no identity. A separate 4097-record proof rejected history beyond the unchanged 4096 bound. |
| T-05 | AC-05 — Current main and portable fixtures preserve every adjacent delivery invariant. | Run a read-only local first-parent identity scan and full temporary-repository hydration while retaining canonical pair binding, drift checks, evidence roles, and prior-contract cases. | Integration / local read-only | PASS | The real and isomorphic scans passed; full focused/Stable retained canonical bytes/worktree drift, ambiguity, contract-2 history, hardened role normalization, and continuity regressions. |
| T-06 | AC-06 — Exceptional pre-dispatch work is bounded and leaves no shipped bypass. | Freeze path/hash state, instrument writes and dispatcher count, reject any extra path or failed proof, and scan source/package projections for Task-specific bootstrap state. | Authority / distribution | PASS | Frozen refs/status/hashes held across both one-shot proofs; exactly two files changed before the sole dispatcher, with no checkpoint/external mutation or shipped Task-specific hook. |
| T-07 | AC-07 — Durable owners state the corrected boundary without unrelated meaning changes. | Inspect SPEC and ARCHITECTURE owner diffs, run foundation/instruction checks, and require README, AGENTS, `kyw-impl`, release, and installation owners to remain unchanged. | Documentation / scope | PASS | Exact owner diff and foundation/instruction tests passed; README, AGENTS, `kyw-impl`, release, installation, and publication paths have zero diff. |
| T-08 | AC-08 — Complete verification and invariance are auditable. | Run focused tests, verification planning, Stable and package checks, pair/transaction validation, exact dependency/checkpoint hashes, final diff/matrix review, and later ordinary delivery. | Regression / delivery | PASS | The approved guard passed its full local-main execution and absent-ref skip branches; Stable then passed `411/414` with three explicit skips plus lint, format, pack, pair, transaction, hash, whitespace, and exact-scope checks. The failed first PR run remains retained external evidence for the new head to supersede without rerun. |

## Regression Coverage

- The first canonical contract-3 delivery remains immutable and a real later same-Task protected merge still fails before dispatcher mutation.
- Task 0070 and Task 0072 canonical pair paths and bytes, terminal worktree drift rules, and contract-1/2 grandfathering remain unchanged.
- Actual PR head, synthetic merge compatibility, protected merge, aggregate gate, and post-main GitHub evidence identities remain distinct and exact.
- Rolling checkpoint trust, one-frontier preparation, selected-Task transition application, queue precedence, and general explicit migration remain unchanged.
- Source, npm package, plugin-cache, and direct-install projections contain no Task-specific repair hook or repository-specific state.
- No workflow rerun, bypass, force update, history rewrite, publication, registry mutation, version change, tag, Release, or public submission occurs.

## Commands

- `git log --first-parent --format="%H%x09%P%x09%s" --max-count 16 main`.
- `node --test --test-name-pattern "future terminal history|protected merge|source branch" test/task-delivery-hydration.test.mjs`.
- `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/task-dispatch.test.mjs test/task-artifacts.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs`.
- `npm run verify:plan -- docs/SPEC.md docs/ARCHITECTURE.md src/core/task-artifact-hydration.mjs test/task-delivery-hydration.test.mjs`.
- `npm test`.
- `npm run lint`.
- `npm run format:check`.
- `npm run pack:check`.
- Bounded source, candidate, cached-runtime, and direct-install scans for Task-specific bootstrap or repository identity.
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <allocated-task-directory>`.
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- `Get-FileHash -Algorithm SHA256` for Task 0070, Task 0072, and the continuity checkpoint before and after the authorized implementation boundary.
- `git diff --check` and final exact changed-path review.
- `gh pr checks 61 --json name,state,startedAt,completedAt,link,bucket,workflow`.
- `gh run view 33465116225 --job 99723260991 --log` and equivalent completed-run metadata for all matrix jobs.
- `node --test --test-name-pattern "^current tracked-main redelivery identity scan is read-only$" test/task-delivery-hydration.test.mjs` in the complete aligned-main checkout and with an isolated nonexistent `GIT_DIR`.
- Post-recovery `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Post-recovery terminal `node --test test/foundation.test.mjs`, `node --test --test-name-pattern "current queued artifacts validate" test/kyw-task.test.mjs`, pair/transaction validation, fixed hashes, and exact changed-path review.

## Results

- PASS — pre-mutation `main`, upstream, cached, and direct-remote main aligned at `17ce6ff2b4cd67accad7e842ca64aad5a741a1ff`; PR `#60` had the exact two parents and source branch recorded in the Task.
- PASS — the frozen manifest held Task 0070/0072 pair hashes, count-40 checkpoint SHA-256 `645bf887d830f3f049717c4e20357bae175437766ba0e2ca28adbc1eaf85449d`, all pre-created pair bytes, and an empty index/transaction.
- PASS — `node --test --test-name-pattern "future terminal history|protected merge|source branch" test/task-delivery-hydration.test.mjs`; exit `0`, `5/5`, no retry.
- PASS — `node --test --test-name-pattern "^current tracked-main redelivery identity scan is read-only$" test/task-delivery-hydration.test.mjs`; exit `0`, `1/1`, refs/status/checkpoint unchanged.
- PASS — the sole generic dispatcher call freshly evaluated Task 0072 as `HARDENED_EXACT_HEAD` and returned `SELECTED / IMPLEMENT / 0073` with one opaque predecessor transition; no second call was made.
- PASS — after active-pair validation, one token application advanced the checkpoint to SHA-256 `aa934de227c1a45dacf9a89e9d5bf477cbb0b6ef2bb1087232cbbdaaeeb9cafe`, digest `e183b4958a5db76a7d05776d6b20821732d87e17a69516a23df5c1ce3ae8752f`, count `41`, last Task `0072`, with exact previous digest `d405e676…` and no Task `0073` self-coverage.
- PASS — changed-path planning classified the four product/runtime paths as `STABLE` and prescribed `npm run check` plus hosted exact-SHA CI.
- PASS — full focused command exited `0`: `122` tests, `119` passes, three explicit skips, zero failures.
- PASS — `npm test` exited `0`: `414` tests, `411` passes, three explicit skips, zero failures; `npm run lint` passed `84` modules and foundation metadata; `npm run format:check` passed `360` files; `npm run pack:check` passed `43` files / `133177` bytes.
- PASS — a deterministic no-file command returned `DELIVERY_HYDRATION_BOUND_EXCEEDED` for `4097` first-parent records at the unchanged `4096` limit.
- PASS — bounded package-owner scan found no Task 0073, bootstrap, frozen main, or PR-60 state; full distribution tests exercised actual tarball, direct-install, and marketplace/cache projections.
- PASS — final invariant review preserved Task 0070 hashes `2d678278…` / `79e47459…`, Task 0072 hashes `1879b26c…` / `1bcea3d7…`, pre-created Task 0074–0076 bytes, and count-41 checkpoint through Task 0072 only. Pair validation, transaction `NONE`, `git diff --check`, exact changed paths, and matrix coverage passed.
- FAIL — first exact-head PR run `33465116225` at commit `f8c46f3707e2a5b896a303055f4d0d0222315389` completed without rerun: Quality and packed-release passed, while all eight Behavioral matrix jobs, merge compatibility, and the aggregate required gate failed.
- FAIL — every underlying failure was the same test at `test/task-delivery-hydration.test.mjs:979`: exact-SHA Actions checkouts are detached and lack `refs/heads/main`, so the test's first asserted `rev-parse` exited `128` before hydration or any remote call. The local one-shot proof remains valid because its aligned-main refs existed and were proven unchanged.
- BLOCKED — the smallest recovery is an explicit absent-ref preflight with a reasoned exact-SHA-checkout skip, matching the adjacent historical-main test while retaining the full proof whenever aligned local-main refs exist. No edit was made because that test file is outside the current post-selection allowlist; the failed run was not rerun or bypassed.
- AUTHORIZED — the current user explicitly expanded the post-selection allowlist only for that test guard, Task pair evidence, a new commit/non-force push, and observation of a new exact-head run; the failed run itself remains non-rerunnable evidence.
- PASS — complete aligned-main execution passed `1/1`, preserved refs/status/checkpoint, and made no skip; the isolated absent-ref harness passed with one reasoned `aligned tracked-main refs are unavailable in this exact-SHA checkout` skip and zero failures.
- LIMITATION — one standalone full hydration-file command completed after its 30-second output session identifier was not retained, so no final exit is claimed from that invocation; the subsequently complete `npm test` execution covered the same file and supplied the auditable result.
- PASS — post-recovery `npm test` exited `0`: `414` tests, `411` passes, three explicit skips, zero failures; lint passed `84` modules and foundation metadata, format passed `360` files, and pack passed `43` files / `133177` bytes.
- PASS — the authorized post-selection delta is limited to `test/task-delivery-hydration.test.mjs` and this Task pair; source, SPEC/ARCHITECTURE, workflow, continuity, dependency/future pairs, package/release, and publication surfaces remain unchanged from commit `f8c46f3`.
- LIMITATION — the first post-recovery hash script used an inferred, nonexistent Task 0072 directory suffix and stopped before completing its comparisons; the actual queue directory was then read without mutation and the remaining hash comparison was continued from the fixed path rather than treating the incomplete invocation as a pass.
- PASS — all `12` fixed source/checkpoint/Task 0070/Task 0072/future-pair hashes matched, including unchanged hydration source `1b2e7d01…` and checkpoint `aa934de2…`; the approved test now hashes to `3d4410f1c35399ccdbd558648c92494cead1e24b9c38f1dfbc4b19266096b7e3`.
- PASS — terminal pair validation, transaction `NONE`, `git diff --check`, exact three-path recovery scope, foundation `21/21`, and current queued artifacts `1/1` passed after the recovery.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 16881 | 227 | 227 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — setup, invocation, commands, contributor workflow, and release status do not change. | README remains byte-stable; protected-merge attribution is internal delivery semantics owned by SPEC and ARCHITECTURE. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, authority, immutable-pair, and completion rules already express the durable boundary. | AGENTS remains byte-stable; no repository-wide execution rule changes. |
| `docs/SPEC.md` | 43443 | 43740 | 452 | 452 | +297 | 0.68% | observable product behavior and acceptance | The one-canonical-delivery contract must state which protected merge belongs to a Task and exclude later slug tokens. | The existing contract-3 paragraph absorbs the leading source-branch identity boundary without a new section. |
| `docs/ARCHITECTURE.md` | 40315 | 40748 | 816 | 823 | +433 | 1.07% | stable components, boundaries, dependencies, flows, and distribution | The first-parent redelivery flow must parse owner/source and compare only the source branch's leading supported Task identity. | Existing STANDARD delivery flow text absorbs the corrected attribution boundary; fixture detail remains Task-owned. |
| `Combined` | 104584 | 105314 | 1543 | 1550 | +730 | 0.70% | all four permanent-document owners | SPEC and ARCHITECTURE must agree on the source-identity boundary while setup and repository-wide rules stay stable. | Two existing owner sections absorb the durable correction; README and AGENTS remain byte-stable. |

## Unverified

- Actual file-symlink creation was unavailable on this Windows host; its unchanged existing regression passed in POSIX exact-head CI before the later repository-context failure ended each Behavioral job.
- First exact-head PR CI remains verified failed at immutable run `33465116225`; a new exact-head run, protected merge, post-main CI, and final production-evaluator satisfaction remain the external delivery ledger and are not pre-claimed here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
