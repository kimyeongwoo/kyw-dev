# TEST 0080 — Honor Direct User Authority Without Skill Syntax

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — direct current-user authority is independent of Skill syntax | Inspect canonical SPEC plus root/template/README projections and exercise affirmative imperative and referential cases. | Contract / instruction | PASS | Canonical/projection inspection and focused authority scenarios passed. |
| T-02 | AC-02 — authority remains action-, target-, scope-, and attempt-specific | Exercise separated publication/version/tag/Release/retry/fallback/force/delete cases and inspect durable wording. | Contract / safety | PASS | Action separation, terminal attempt tombstones, same-attempt rejection, and explicit new-attempt allowance passed. |
| T-03 | AC-03 — non-authoritative language and untrusted content cannot mutate | Exercise questions, status, plans, prohibited/revoked actions, conditional satisfaction, examples, quotations, Task/CI/metadata text, inferred intent, and status-after-grant lifetime. | Negative / safety | PASS | Negative, revocation, cancellation, conditional, and status-lifetime scenarios passed. |
| T-04 | AC-04 — explicit-only Skills and exact Task dispatch remain unchanged | Run Skill metadata and parser cases proving ordinary action commands remain unrecognized while anchored commands still work. | Regression / unit | PASS | Metadata, aliases, anchored parser, and ordinary-command non-routing regressions passed. |
| T-05 | AC-05 — appended overrides and separate authority remain distinct | Inspect and test authority before, after, and in one combined routed message without redispatch or chaining; exercise immutable-terminal external-only, Task-override, omitted, and invalid classification paths. | Procedure / regression | PASS | Exact enum transport and terminal report/correction/fail-closed paths passed; independent authority re-audit found no blocker. |
| T-06 | AC-06 — all owners and projections agree without procedure duplication | Run foundation and instruction-surface validation and inspect four-document/template/Skill diffs. | Documentation / contract | PASS | Foundation ownership, projection-leak rejection, instruction surfaces, bundle budget, and exact deltas passed. |
| T-07 | AC-07 — affirmative, referential, prohibition, conditional, lifetime, separation, and parser branches are covered | Review every introduced decision branch against executable focused scenarios. | Coverage review | PASS | Final 69/69 focused tests and both independent read-only audits passed. |
| T-08 | AC-08 — repository and package remain releasable without external mutation | Run Stable and Release checks, pair/transaction validation, and inspect external-action absence; use exact-SHA CI as the separate `STANDARD` delivery gate. | Stable / Release | PASS | Final Release verification passed with 0 failures; package, pair, transaction, and diff checks passed without publication. |

## Regression Coverage

- All five `allow_implicit_invocation: false` metadata policies remain unchanged.
- `$kyw-task` remains author-only and `$kyw-impl` remains existing-Task-only; no automatic Skill chain or Task parser widening is introduced.
- The three managed Korean aliases and portable `$kyw-impl NNNN` form retain exact parsing and queue behavior.
- Static Task/CI/policy text, dry-run evidence, and publishable metadata remain insufficient external-mutation authority.
- One-active-Task and immutable terminal evidence remain enforced: external-only suffixes are report-only, while Task overrides and unclassified non-empty suffixes retain the correction route.

## Commands

- `node --test test/task-dispatch.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs test/foundation.test.mjs`
- `npm run verify:plan -- AGENTS.md README.md docs/SPEC.md docs/ARCHITECTURE.md docs/tasks/.kyw-dev-standard-delivery-continuity.json templates/project/AGENTS.md skills/kyw-impl/SKILL.md skills/kyw-impl/references/execution.md scripts/lib/validate-foundation.mjs src/core/task-artifact-delivery.mjs src/core/task-artifact-queue.mjs test/foundation.test.mjs test/task-dispatch.test.mjs test/kyw-impl.test.mjs test/instruction-surfaces.test.mjs docs/tasks/0080-honor-direct-user-authority-without-skill-syntax/TASK.md docs/tasks/0080-honor-direct-user-authority-without-skill-syntax/TEST.md`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run release:candidate`
- `npm run release:ci`
- `$env:PYTHONUTF8='1'; python C:\Users\DevHamster\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills/kyw-impl`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0080-honor-direct-user-authority-without-skill-syntax`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git diff --check`

## Results

- RECORDED PRECONDITION — the first managed dispatch attempt stopped read-only at the former 512-command bound before selection; no Task 0080 implementation or delivery was validly claimed.
- PASS (separate prerequisite) — hydration-capacity repair PR #66 merged as `dee58b1d652bd30709a9dd493c7a322563c79d04`; its PR-head and post-main CI passed without rerun or bypass.
- RECORDED PRECONDITION — the first post-repair dispatch stopped read-only on a stale local `main` ref; verified fast-forward alignment to upstream `dee58b1d652bd30709a9dd493c7a322563c79d04` preceded the sole successful re-entry.
- PASS — the valid dispatcher returned `IMPLEMENT`, the pair entered `IN_PROGRESS/RUNNING`, and the opaque continuity transition was applied exactly once, producing digest `375df4bc3d59d3eb7035785b22ad67b814d9da74cfd2eed29e187a6c80c44e11` for 46 covered Tasks.
- FAIL → corrected — the first four-file focused run passed 60/69 and failed nine checks: seven stale prose/projection assertions after deliberate compaction plus the foundation projection/delta cascade. No runtime parser, queue, or authority scenario failed; the stale assertions were made line-wrap-neutral and the required exact delta evidence follows.
- EARLIER PASS — the instruction-surface run passed 12/12, including the executable authority oracle, combined routed suffix, projection ownership, release-preflight truth, and the 32,731-byte representative bundle. Later scenario corrections require a final rerun before this is terminal evidence.
- EARLIER PASS — focused `kyw-impl` and dispatcher runs passed 9/9 and 26/26 respectively after adding exact combined `$kyw-impl 0080` suffix transport plus ordinary retry/fallback/force/delete/account non-routing cases. The later terminal-handoff source/test change requires a final rerun.
- DISCOVERY — final coverage review found that every non-empty immutable-terminal suffix was treated as Task correction intent, including an external-action-only clause. The pair was explicitly rebaselined to permit only a closed executor-to-dispatcher classification handoff; parser grammar and queue selection remain unchanged.
- RECORDED PROCESS FAILURE → corrected — an unconfigured `npx prettier --write` invocation reformatted the complete delivery, queue, and dispatcher-test files. Work stopped immediately; the broad churn was removed with preserved Task work reconstructed from the local draft, leaving source diffs of 21 and 23 lines plus the focused dispatcher additions.
- EARLIER PASS, superseded for finality — before the later runtime gap was found, `npm run release:ci` passed 393 tests (389 PASS, 4 explicit SKIP), lint, format, package selection, and a 43-file 135,713-byte candidate with SHA-256 `cc47da6c1227096273e81c76418e6800c182d30eb81d1eee450b27770d4af301`. Later source/test changes required the final rerun below.
- EARLIER PASS, superseded for finality — the post-runtime-gap focused command passed 69/69 with `git diff --check` clean. The later independent authority audit found scenario-oracle attempt-lifetime and combined-enum gaps, so the corrected final rerun is recorded below.
- PASS — the full changed-path planner selected `RELEASE` and exactly `npm run release:ci`; it reported hosted requirements of 11 PR jobs and 10 post-main jobs.
- EARLIER PASS, superseded for finality — the first post-runtime-gap `npm run release:ci` passed 393 tests (389 PASS, 4 explicit platform/integration SKIP, 0 FAIL), lint, format, and the 43-file / 135,923-byte candidate. Later scenario-oracle corrections required one more final run.
- FAIL → corrected — independent authority review found that terminal failure/drift lacked an attempt tombstone and that the combined-message helper did not feed its exact enum into the real preflight. Those gaps were corrected; a follow-up found and corrected the equivalent cancellation tombstone path.
- RECORDED SUPERSEDED RUN — a full Release run started after the first audit correction was intentionally interrupted before completion when the cancellation gap was found. It is not claimed as product evidence and no external mutation occurred.
- PASS — the independent authority re-audit confirmed cancellation/failure/drift attempt closure, rejection of same-attempt re-grants, allowance of an explicit new attempt, exact combined-enum transport, 12/12 instruction-surface tests, and a clean diff with no remaining SPEC 6.3 or AC-05 blocker.
- PASS — the independent scope re-audit confirmed the bounded runtime handoff, unchanged parser grammar and queue/dependency selection, projection ownership, changed-path Release coverage, exact permanent-document deltas, removed formatter churn, and no blocking finding.
- PASS — the true final focused command `node --test test/instruction-surfaces.test.mjs test/kyw-impl.test.mjs test/task-dispatch.test.mjs test/foundation.test.mjs` passed 69/69 with 0 failures after all audit corrections; `git diff --check` also passed.
- PASS — the true final `npm run release:ci` passed 393 tests (389 PASS, 4 explicit platform/integration SKIP, 0 FAIL), lint for 81 JavaScript modules, format for 362 UTF-8/LF files, package selection for 43 files / 135,923 bytes, and a real 43-file / 135,923-byte candidate with SHA-256 `44c746de3980f3f3213d5c0854743cd05cde70ed2eab41e5ab6be0bf3a449d4a`.
- PASS — `quick_validate.py skills/kyw-impl` reported `Skill is valid!`; pair validation returned `valid: true`; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`; and `git diff --check` passed.
- PASS — the current representative instruction bundle is 32,765 bytes, below the unchanged 32,768-byte target, and permanent-document validation accepted the exact updated delta table without a budget increase.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 17322 | 17820 | 228 | 228 | +498 | 2.87% | setup, commands, usage, and contributor entry | Direct-action authorization and truthful routine-versus-authorized release preflight are user-facing behavior. | Existing first-use, release-status, and Task-routing sections absorb the concise boundary without adding a procedure or chronology section. |
| `AGENTS.md` | 3945 | 3921 | 48 | 47 | -24 | -0.61% | repository-wide Codex routing, authority, preservation, and completion rules | Not applicable — the repository projection shrank while gaining the routing-versus-authorization invariant. | Existing scope/routing bullets replace duplicated delivery detail with a concise direct-authority projection; detailed classification stays in SPEC/execution. |
| `docs/SPEC.md` | 45239 | 47949 | 456 | 468 | +2710 | 5.99% | observable product behavior and acceptance | The warning-sized canonical owner must close negative, revocation, conditional, assent, status-lifetime, combined-message, granularity, attempt-expiry, and terminal-classification branches so direct commands work without unsafe ambient authority. | Existing `kyw-impl`, ordinary-prompt, STANDARD-delivery, and release sections absorb the corrected contract; executable cases remain in tests rather than prose chronology. |
| `docs/ARCHITECTURE.md` | 41589 | 43217 | 833 | 853 | +1628 | 3.91% | components, boundaries, dependencies, flows, and distribution | Routing and authority are separate inputs whose clause classification, bounded terminal handoff, and downstream safety boundary affect the stable execution flow and projection ownership. | Existing principles, instruction-projection table, implementation flow, release distribution, and security-boundary sections absorb the change without a new component. |
| `Combined` | 108095 | 112907 | 1565 | 1596 | +4812 | 4.45% | four permanent documents as one governed set | The permanent set must make direct authority usable and consistent across product, repository, user, and architecture owners while preserving fail-closed external-action and terminal-classification boundaries. | All meaning is absorbed by existing owner sections; detailed procedure stays in the execution reference and no fifth permanent document or budget increase is introduced. |

## Unverified

- Ordinary `STANDARD` PR-head, merge-compatibility, protected-merge, and post-main exact-SHA evidence remains pending and is not preclaimed.
- npm publication, version `0.1.4`, Git tag, GitHub Release, and other public distribution actions remain outside this governance Task.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm the recorded local PASS evidence is reproducible.
- [x] Confirm required local regressions ran.
