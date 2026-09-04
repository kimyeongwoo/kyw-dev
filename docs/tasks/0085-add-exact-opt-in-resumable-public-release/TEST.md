# TEST 0085 — Add Exact Opt-In Resumable Public Release

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially explicit Skill routing, activation-scoped authority, `STANDARD` delivery, publication state/authority, safety, compatibility, distribution, and acceptance.
- Architecture constraints: `../../ARCHITECTURE.md`, especially the one-adapter dependency graph, delivery flow, external ledgers, continuity isolation, publication workflow, validation, and package boundaries.
- Repository rules and usage: `../../../AGENTS.md`, `../../../README.md`, `../../../CODEX_PROMPTS.md`, and `../../../templates/project/AGENTS.md`.
- Hard dependency: Task 0084.
- Release and regression precedents: Tasks 0066, 0067, 0069, 0079, 0081, and 0082.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — one new exact opt-in and unchanged plain route | Parse the exact positive form and adversarial suffix, alias, implicit, ordinary-language, chained, continuous, and background inputs; compare plain delivery result shape and authority with the Task 0084 baseline. | Routing / compatibility | PASS | Exact and adversarial routing plus unchanged plain descriptors passed in `task-public-release`, `task-dispatch`, and `kyw-deliver` suites. |
| T-02 | AC-02 — `STANDARD FINAL` is a strict public-write gate | Drive READY, active, blocked, wrong-policy, pending commit/push/PR/CI/merge/post-main, failed, and final graphs through injected delivery state; assert zero public calls before exact final and no repeated completed STANDARD action. | Dispatcher / integration | PASS | Dispatcher and production hydration fixtures admitted public preflight only after a freshly reconstructed hardened `FINAL` graph. |
| T-03 | AC-03 — exact public-release tuple is frozen and cross-checked | Mutate each Task, repository, base, workflow, package/plugin, registry/access, packed digest, merge tree/SHA, tag, and Release metadata field independently and require pre-write fail-closed classification. | Identity / contract | PASS | Strict tuple mutation tests and immutable archive/source guards rejected every independently changed field before a write. |
| T-04 | AC-04 — every remote surface has closed state classes and full preflight | Use fixtures for `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, and `UNKNOWN` across workflow/npm/tag/Release, including out-of-order future conflict before npm; assert only absent admits its stage write. | State machine / negative | PASS | Public-core and production-client fixtures covered all five classifications, malformed evidence, and future-stage conflicts. |
| T-05 | AC-05 — npm uses one OIDC workflow dispatch/publish with no alternate path | Inject command/API traces for target absence, matching active/success/failure attempts, delayed visibility, and ambiguous dispatch; inspect workflow bytes for exact checkout, one `npm publish . --ignore-scripts`, no lifecycle, token, interactive auth, retry, rerun, or fallback. | Publication / control | PASS | Workflow mutation guards and production traces proved one ten-input first-attempt dispatch, one exact directory publish, and no alternate credential/retry path. |
| T-06 | AC-06 — canonical npm state proves exact immutable package identity | Serve owned-loopback/cache-bypassed fixtures for expected and conflicting `gitHead`, tarball bytes, integrity/shasum, signature, provenance, access, `latest`, and prior history; assert exact-only satisfaction and no repair mutation. | Registry / supply chain | PASS | Bounded registry fixtures verified raw tarball equality, canonical signature/SPKI, exact signed SLSA/DSSE identity, prior history, and hostile malformed base64/provenance rejection. |
| T-07 | AC-07 — tag is create-once at the exact merge SHA | Exercise absent, exact lightweight, exact annotated/peeled, wrong-SHA, ambiguous peel, namespace collision, unreadable, lost-response, and concurrent tag states; count at most one create and zero force/update/delete. | GitHub ref / safety | PASS | Tag classifier/orchestrator fixtures covered exact direct/peeled targets, conflicts, races, lost responses, and one-create traces. |
| T-08 | AC-08 — Release is create-once and attached to the exact tag | Exercise absent, exact, draft, prerelease, wrong repository/tag/target/title, unexpected asset, duplicate, unreadable, lost-response, and concurrent Release states; count at most one create and zero edit/delete/alternate Release. | GitHub Release / safety | PASS | Release fixtures rejected duplicate, draft/prerelease, metadata, target, asset, and ambiguity conflicts while preserving one create request. |
| T-09 | AC-09 — partial success resumes monotonically without repeats | Cover all absent, all exact, active npm, npm exact/tag absent, npm plus tag exact/Release absent, and every failure boundary over multiple reconstructed invocations; assert the first absent safe stage and immutable per-stage call counts. | Resume / idempotency | PASS | All-exact, active, partial-success, base-advance, race, and reconstructed-invocation cases resumed only the first absent safe stage. |
| T-10 | AC-10 — failures and ambiguity block with exact recovery while pair/continuity stay immutable | Inject failed/cancelled/timeouts, malformed responses, delayed consistency, command-runner errors, concurrent drift, and uncertain writes; verify read-only reconciliation, sanitized `BLOCKED` stage/recovery/resume data, unchanged terminal pair bytes, and unchanged STANDARD checkpoint. | Failure / continuity | PASS | Public runner, adapter, and terminal-pair guards returned bounded classified blocks, reconciled read-only, and preserved Task/Test/continuity bytes and modes. |
| T-11 | AC-11 — final result comes only from canonical registry and GitHub API reads | Make dispatch, command, workflow, or logs report success while final registry/tag/Release facts are missing or wrong, then supply an exact final snapshot; assert only the latter reaches final and is bound to the merge SHA. | Final evidence / adversarial | PASS | Accepted-command/log fixtures never completed without fresh exact npm/run/tag/Release reads; final proof remained merge-SHA-bound. |
| T-12 | AC-12 — secrets and sensitive logs never cross the report boundary | Inject npm/GitHub tokens, OIDC JWT, OTP, auth URL, cookie, Authorization header, credential environment entries, and oversized logs through success and failure paths; assert bounded deterministic redaction from outputs, fixtures, and stored state. | Security / privacy | PASS | Public-core and command-cache adversarial fixtures redacted full environment subtrees and every credential/log shape within fixed bounds. |
| T-13 | AC-13 — one Skill/adapter/core graph and synchronized projections | Inspect imports, exports, packaged/direct-install files, procedure ownership, Task schemas, owner manifests, permanent-document budgets/deltas, plugin prompts, planner mappings, and Task 0084 bytes for absence of a duplicate engine, ledger, checkpoint, Skill, dependency, or historical mutation. | Architecture / documentation / package | PASS | Facade/DAG, foundation, instruction, installation, distribution, and planner tests passed; Task 0084 blobs remained `bda9850a…` / `43070fbc…`. |
| T-14 | AC-14 — mock-only coverage and all required stable commands pass | Run focused parser/dispatcher/hydration/continuity/workflow/Skill/instruction/foundation/distribution/installation/planner suites, inspect external call traces for zero live targets, run the planner-selected Release tier, then execute all four required stable commands and close final diff coverage. | Stable / Release / coverage | PASS | Final `npm run release:ci` passed; explicit `npm test` passed 473/477 with four expected skips, lint passed 85 modules, format passed 382 files, and pack passed 48 files / 197,194 bytes, with no live target call. |

## Regression Coverage

- Plain `$kyw-deliver NNNN` remains exact four-digit `STANDARD`-only delivery/resume/report with no suffix authority, public mutation, duplicate confirmation, automatic retry, or Skill chaining.
- `$kyw-impl` and its three managed Korean aliases remain implementation-only, stop at `DONE/PASSED`, and never select either delivery form or infer public-release authority.
- `$kyw-task` remains author-only; `$kyw-audit` remains independent; `kyw-init` and `kyw-grilling` retain their activation and mutation boundaries; the visible Skill inventory remains exactly six.
- Contract-3 terminal-pair immutability, contract-1/2 compatibility, hard dependencies, one-active selection, reasoned `NONE`, `STANDARD` evaluator identities, causal-lag continuity, no self-coverage, and checkpoint atomicity remain unchanged.
- Exact-path commit, non-force push, non-draft PR, actual-head CI, synthetic merge compatibility, review/mergeability, expected-head merge, and post-main CI retain Task 0084 ordering and resume/no-rerun guarantees.
- The manual OIDC workflow remains exact-main/version/repository/registry guarded, tokenless, one-publish, `--ignore-scripts`, no-retry, and separate from tag/Release API creation.
- Existing `kyw-dev@0.1.4`, historical npm versions, `v0.1.4`, its GitHub Release, package/plugin version, zero production dependencies, and no public plugin-directory submission remain unchanged by implementation and tests.
- Install/update/uninstall/doctor ownership, plugin/direct-install parity, package allowlist, transaction recovery, unknown-byte preservation, and no-lifecycle installation remain safe.

## Commands

- `node --test test/task-public-release.test.mjs test/task-dispatch.test.mjs test/task-delivery-hydration.test.mjs test/task-artifacts.test.mjs test/publish-workflow.test.mjs`
- `node --test test/kyw-deliver.test.mjs test/task-dispatch.test.mjs test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs test/publish-workflow.test.mjs test/instruction-surfaces.test.mjs test/foundation.test.mjs test/distribution.test.mjs test/skill-installation.test.mjs test/verification-plan.test.mjs`
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures`
- `npm run verify:plan -- .codex-plugin/plugin.json .github/workflows/publish.yml AGENTS.md CODEX_PROMPTS.md README.md docs/ARCHITECTURE.md docs/SPEC.md docs/tasks/0085-add-exact-opt-in-resumable-public-release/TASK.md docs/tasks/0085-add-exact-opt-in-resumable-public-release/TEST.md scripts/lib/validate-foundation.mjs scripts/verification-plan.mjs skills/kyw-deliver/SKILL.md skills/kyw-deliver/agents/openai.yaml skills/kyw-deliver/references/public-release.md skills/kyw-task/scripts/task-artifacts.mjs src/core/skill-installation-inventory.mjs src/core/task-artifact-delivery.mjs src/core/task-artifact-hydration.mjs src/core/task-artifact-public-release.mjs src/core/task-artifact-queue.mjs src/core/task-artifacts.mjs templates/project/AGENTS.md test/foundation.test.mjs test/instruction-surfaces.test.mjs test/kyw-deliver.test.mjs test/publish-workflow.test.mjs test/skill-installation.test.mjs test/task-artifacts.test.mjs test/task-delivery-hydration.test.mjs test/task-dispatch.test.mjs test/task-public-release.test.mjs test/verification-plan.test.mjs`
- `npm run release:ci`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0085-add-exact-opt-in-resumable-public-release`
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`
- `git diff --check`

## Results

- PASS — initial pair validation returned `valid: true`; transaction inspection returned `NONE` / `NO_TRANSACTION_EVIDENCE`.
- PASS — local, upstream, cached, direct-remote, and GitHub `main` aligned at `dc0f9ffcc69aa143755b69b01ae05b452ac0e4c6`; Task 0084 terminal pair blobs matched its canonical merge tree.
- PASS — the sole exact dispatcher call used `NO_TASK_OVERRIDE`, production-evaluated Task 0084 as the one uncovered `HARDENED_EXACT_HEAD` predecessor, and selected Task 0085 as `IMPLEMENT` without retry, continuity mutation, or external write.
- BASELINE — Task 0084 canonical pair blobs are `bda9850ab1fb2bc7d0177ad69a32703c366c6251` / `43070fbcd4b18f028027b4e034d7277bd406071d`; parser, queue, hydration, adapter, workflow, package, and plugin SHA-256 identities were captured before behavior changes, with six Skills, package/plugin version `0.1.4`, and no production dependency.
- BASELINE — cache-bypassed npm reads report `kyw-dev@0.1.4` as `latest`, `gitHead` `8e5d1c43c69314e941e35e6835ae36a6cb40c981`, a 135,958-byte tarball with SHA-1 `9b3e2beda81b0ad81c9c72ea94b29520c83216dc`, SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`, matching SHA-512 integrity, one signature, and publish-workflow SLSA provenance. GitHub reads bind workflow ID `323508270`, lightweight `v0.1.4` at the same SHA, and an asset-free published Release titled `kyw-dev 0.1.4`; this is intentionally conflicting historical state, not a release target.
- BASELINE — permanent documents measure README 17,562 bytes / 223 lines, AGENTS 4,083 / 41, SPEC 49,081 / 476, ARCHITECTURE 44,568 / 881, and 115,294 bytes / 1,621 lines combined.
- FAIL→PASS — initial red tests exposed the intentionally unsupported exact suffix; implementation then made only `$kyw-deliver NNNN --public-release` pass while preserving all plain-route and adversarial rejections.
- FAIL→PASS — workflow mutation tests first exposed incomplete input-regex and integrity assertions, and public-core tests exposed a misplaced version check; corrected suites later passed 29/29 and the current public-core/workflow review passed 27/27 plus 2/2.
- FAIL→PASS — stale permanent-document deltas and compressed projection wording caused foundation/distribution/instruction/Skill failures (including one 5-failure auxiliary run); exact owner wording and measured evidence were synchronized, after which foundation passed 23/23, instruction surfaces 16/16, and the broader suite passed.
- FAIL→PASS — the first terminal-pair validation rejected a `DONE` Resume Point that omitted the contract-required reasoned `None`; the canonical terminal wording was restored and validation then returned `valid: true`.
- PASS — final public/core/production integration command passed 160/163 with three expected platform/live skips; the broader Skill/continuity/distribution/install/planner command passed 237/241 with four expected skips.
- PASS — direct behavioral acceptance returned `valid: true`, method `CURRENT_SESSION_DIRECT`, for six scenarios. The exact changed-path planner selected `RELEASE` and one composite `npm run release:ci`.
- PASS — independent current-byte security review found no remaining concrete irreversible-write or fail-open blocker after hostile fixtures closed remote-tree, package-control, signing-key SPKI/base64, DSSE type/payload/signature, SLSA subject, ID/pagination, prewrite, and ambiguity gaps.
- PASS — Task 0084 canonical blobs remain exactly `bda9850ab1fb2bc7dd0177ad69a32703c366c6251` / `43070fbcd4b18f028027b4e034d7277bd406071d`; Task 0085 validates and transaction inspection remains `NONE / NO_TRANSACTION_EVIDENCE`.
- PASS — final post-hardening `npm run release:ci` completed its selected Release-tier composite: tests passed 473/477 with zero failures and four expected skips, lint passed 85 JavaScript modules, format passed 382 UTF-8/LF files, pack passed 48 files / 197,194 bytes, and the release candidate matched 48 files / 197,194 bytes with SHA-256 `27bf9157b715c41eeef58a820142e78b78f5f2e50f46f8ed5afd5cc4bb542532`.
- PASS — the four explicit stable commands independently reproduced the terminal result: `npm test` passed 473/477 with zero failures and four expected skips; lint, format, and pack passed at 85 modules, 382 files, and 48 files / 197,194 bytes respectively.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 17562 | 18421 | 223 | 225 | +859 | 4.89% | setup, installation, commands, usage, and contributor entry | Users need both exact delivery forms, the unchanged plain route, and the explicit live-release boundary at the entry surface. | Existing release-status and workflow guidance absorbs the opt-in route and links the detailed conditional reference without adding another top-level owner. |
| `AGENTS.md` | 4083 | 4094 | 41 | 41 | +11 | 0.27% | repository-wide Codex routing, authority, preservation, and completion rules | Managed repositories need the exact public-release spelling and its no-retry, immutable-pair boundary. | Existing routing and evidence bullets replace the blanket publication prohibition while remaining under the fixed 4 KiB target. |
| `docs/SPEC.md` | 49081 | 48996 | 476 | 479 | -85 | -0.17% | observable product behavior, safety, publication authority, and acceptance | Product truth must distinguish plain STANDARD authority from the exact compound public-release authority and its five closed states. | Existing delivery, authority, safety, publication, and acceptance sections replace obsolete no-suffix wording and become smaller overall. |
| `docs/ARCHITECTURE.md` | 44568 | 48298 | 881 | 935 | +3730 | 8.37% | components, boundaries, dependencies, control/data flow, and distribution | Stable architecture must locate tuple hydration, canonical npm/GitHub reads, create-once clients, monotonic orchestration, and continuity isolation in the one-adapter graph. | Existing instruction, dependency, delivery-flow, external-ledger, publication, validation, and safety sections absorb the new boundary; detailed stage procedure stays in the progressively loaded Skill reference. |
| `Combined` | 115294 | 119809 | 1621 | 1680 | +4515 | 3.92% | four permanent documents as one governed set | The governed set must express one consistent exact opt-in, STANDARD-first gate, canonical proof model, and failure/no-retry boundary across product, architecture, usage, and repository rules. | All new meaning is projected into the four established owners, with no fifth permanent document, copied stage procedure, receipt ledger, or budget increase. |

## Unverified

- The actual npm registry, workflow dispatch, tag, and Release mutation path is intentionally unexecuted until a user later invokes exact `$kyw-deliver NNNN --public-release` for an eligible, canonically delivered Task with a non-conflicting version.
- Live credential availability, GitHub/npm authorization, API latency, and eventual consistency cannot be proven by fixtures; the production route must classify any unavailable or ambiguous live evidence as `BLOCKED` rather than weakening identity checks or retrying.
- Current `0.1.4` public objects belong to an older source and are not a valid positive live target for this feature's future merge; implementation acceptance depends on deterministic exact/conflict fixtures, not a real release.
- Invocation-local one-request bounds are not a distributed lock, and a trusted external tag or Release writer can still race a create boundary; the next fresh canonical read detects drift and blocks instead of retrying or repairing it.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
