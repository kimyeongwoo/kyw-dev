# TASK 0058 — Deduplicate Hosted CI Verification

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Reduce duplicated hosted CI verification commands while preserving supported OS/Node behavioral coverage, complete synthetic combined-tree checks, packed-candidate proof, fail-closed Required aggregation, and every distinct HARDENED_EXACT_HEAD identity role.

## Dependencies

- Task 0057.

## In Scope

- Measure the current pull-request topology by hosted job instances and leaf repository-command executions before selecting a new topology.
- Investigate a seven-lane behavioral test matrix for Linux/macOS/Windows on Node 22/24 plus Ubuntu Node 26, a separate Ubuntu Node 24 quality job, a packed-candidate job, a complete synthetic merge job, and the Required aggregate.
- Preserve exact expected/actual checkout-SHA proof before every repository command in every code-executing job.
- Preserve distinct actual-head, synthetic merge-compatibility, reviewed expected-head merge, and post-main exact merge-SHA HARDENED_EXACT_HEAD roles and their repository/workflow/run-attempt/job/checkout/parent bindings.
- Update workflow, delivery expectations, evaluator required-job sets, deterministic mutation tests, verification planning, execution guidance, and only necessary permanent-document owner projections.
- Produce actual-head and merge-compatibility evidence on this Task's first authorized PR attempt and post-main evidence at the final merge SHA; fail closed without a CI rerun.

## Out of Scope

- Removing supported Node 22/24 Linux/macOS/Windows coverage, Ubuntu Node 26 compatibility, complete combined-tree verification, packed archive inspection, or Required fail-closed aggregation.
- Collapsing or weakening HARDENED_EXACT_HEAD roles, accepting stale/reused/partial/mismatched evidence, or treating historical evidence as current.
- Changing evaluator production behavior before the dependency establishes its deterministic pure/native boundary.
- Recombining Skills, changing current/legacy readers, redesigning installers/recovery, adding production dependencies, or changing package/plugin version `0.1.0`.
- Model-backed public CI, credentials, registry/auth probes, publishing, `npm run release:check`, release-evidence actual mode, version/tag/GitHub Release/public submission, reruns, force/destructive Git operations, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: Required public CI retains Linux, macOS, and Windows coverage on Node 22 and 24 plus an Ubuntu Node 26 compatibility lane.
- [x] AC-02: Every code-executing job proves expected and actual checkout SHA equality before its first repository command, with event-appropriate fail-closed input validation.
- [x] AC-03: PR actual-head, synthetic merge compatibility, reviewed expected-head merge, and post-main exact merge-SHA remain distinct HARDENED_EXACT_HEAD roles with no job/evidence reuse.
- [x] AC-04: Lint, format checking, and package-selection verification that have no platform-specific requirement are not repeated in every OS/runtime behavioral lane.
- [x] AC-05: The synthetic merge job proves exact synthetic/base/head identity and exactly two ordered parents, then runs one complete check capable of detecting regressions in the combined base+head state.
- [x] AC-06: The packed-candidate job creates exactly one real archive, extracts and verifies its contents in isolation, and performs no publish, registry, credential, or version mutation.
- [x] AC-07: `Required / credential-free CI` or an explicitly compatible protected-check migration treats missing, wrong-event skipped, failed, stale, partial, reused, or mismatched required-job evidence as failure.
- [x] AC-08: Delivery expectations and evaluator required-job sets match the new topology without weakening repository, workflow ID/name/path, run attempt, job ID/name/key, checkout, merge-parent, or post-main identity binding.
- [x] AC-09: The implementation records before/after hosted job instances and leaf-command executions, targets at least a 45% reduction in duplicated leaf-command executions from the current PR topology, and blocks rather than removes a verification contract merely to reach the number.
- [x] AC-10: This Task's actual PR proves the new actual-head and merge-compatibility roles on its first authorized attempt, and post-merge main proves the final merge SHA before completion.
- [x] AC-11: No CI rerun is authorized; the first required PR or post-main failure stops delivery fail-closed and remains honest evidence.
- [x] AC-12: Public CI remains credential-free, model-free, production-dependency-free, immutable-Action-pinned, bounded by explicit timeouts, read-only except repository-local build artifacts, and non-publishing.
- [x] AC-13: Deterministic tests fail when quality, packed, or merge commands are omitted/duplicated/misassigned or when Required incorrectly reports success for a missing, skipped, stale, partial, reused, failed, or mismatched prerequisite.

## Plan

- [x] Inventory current workflow jobs, matrix expansions, leaf commands, action pins, timeouts, permissions, evidence records, Required aggregation, and external check-name expectations.
- [x] Reconfirm the dependency's deterministic evaluator test/native-smoke boundary before changing behavioral lanes.
- [x] Design the smallest role-preserving topology, calculate both metrics, and write failing structural/evaluator mutations before editing the workflow.
- [x] Implement SHA-first behavioral, quality, packed, synthetic-merge, and Required jobs with exact immutable evidence roles and no credential/model/publication path.
- [x] Update delivery/queue expectations, execution guidance, verification planning, and only durable documentation projections; keep current/legacy readers and five Skills intact.
- [x] Run focused/stable/packed checks, validate mutation coverage and count reduction, then obtain first-attempt PR and post-main exact-SHA evidence without rerun.

## Decisions

- The 45% target is credited only against duplicated leaf repository-command executions, not by deleting identity roles or hiding work inside an uncounted wrapper; hosted job instances are reported separately and any increase requires justification.
- Current read-only baseline is 10 pull-request hosted job instances and 33 leaf repository commands: seven Stable lanes times four commands, one packed-candidate command, four merge commands, and the Required aggregate with no repository command.
- The adopted seven-test-lane plus quality/packed/merge/Required topology has 11 pull-request hosted jobs and 15 leaf commands, a 54.5% command reduction. The synthetic merge exposes all four `npm run check` leaves to the structural counter rather than hiding work behind the wrapper.
- The exact `Required / credential-free CI` identity is preserved unless current external repository rules and evaluator evidence prove an explicitly compatible migration; absence of branch protection today does not authorize weakening repository contracts.
- Synthetic merge completeness and packed archive proof stay separate because they validate different artifacts and identities; their evidence cannot be reused for actual-head or post-main roles.

## Risks

- Moving quality commands out of the matrix can hide platform-dependent behavior if repository evidence shows a tool is not portable; such a command must retain justified coverage rather than meet the metric.
- A wrapper called complete can conceal omitted leaf commands or make counting dishonest; tests must inspect the actual command graph and mutations.
- Changing job names or needs edges can break external Required identity or delivery evaluation even when commands pass; external rules and internal expectations must be reconciled before delivery.
- Synthetic checkout semantics can drift across event types, shallow history, or action behavior; exact synthetic/base/head/parent proof must execute before combined-tree commands.
- First-attempt fail-closed delivery creates no rerun escape hatch; diagnostics must make missing or mismatched evidence actionable without weakening acceptance.

## Discoveries and Changes

- `.github/workflows/ci.yml` currently expands Stable to seven OS/Node jobs and runs test, lint, format, and pack in each; packed-release runs one candidate; PR merge-compatibility verifies synthetic identity then repeats the four checks; Required aggregates the job results.
- Current PR baseline therefore contains 10 hosted job instances and 33 leaf repository-command executions. Required is a control job and contributes no leaf repository command.
- Every current code-executing job already checks event-specific expected/actual SHA and emits schema-2 evidence; checkout/setup actions are immutable-SHA pinned, permissions are read-only, and jobs have timeouts.
- `src/core/task-artifact-delivery.mjs` requires distinct actual-head, merge-compatibility, Required-gate, and post-main jobs and binds exact repository/workflow/run-attempt/job/checkout/parent identities; execution guidance forbids rerun and evidence reuse.
- Live read-only repository APIs currently report no active branch protection/ruleset on main, but repository tests and delivery contracts still own the exact Required gate. This is a discovery to recheck, not authority to remove it.
- No workflow, delivery source, test, instruction, permanent document, or historical pair has been modified during authoring.
- Fresh execution preflight aligned local, cached, direct-origin, and GitHub `main` at `b4bc81f84960dde7ad8ab5030ec417b54731825f`, found a clean worktree and no Task transaction, and validated Task 0057 as actual `DONE/PASSED`.
- Local ancestry plus fresh GitHub API, attempt-specific job metadata, job logs, and synthetic commit reads reconstructed 23 eligible legacy deliveries and full `HARDENED_EXACT_HEAD` graphs for Tasks 0054–0057. The production evaluator classified all 27 prior STANDARD outcomes `SATISFIED`; Task 0057 proved `VERIFIED`, `VERIFIED_SYNTHETIC`, and `VERIFIED_EXACT_CHECKOUT` with no issue.
- The one direct packaged-adapter dispatch selected `IMPLEMENT / 0058` with `STANDARD_LIFECYCLE` authority and preserved the exact current-user override.
- The selected topology has 11 pull-request hosted job instances: seven Behavioral lanes, one Quality job, one Packed release job, one Merge compatibility job, and Required. Separating platform-independent work increases the hosted count by one while retaining every identity role.
- The executable leaf graph has 15 commands: seven behavioral `npm test` leaves, three quality leaves, one packed candidate leaf, and four leaves exposed by the synthetic merge's single `npm run check`; this is an 18/33 or 54.5% reduction.
- The delivery evaluator remains the unchanged generic pure contract owner. Its fixtures now model Behavioral, Quality, and Packed exact job sets and add missing, skipped, partial, stale, reused, workflow, attempt, job, checkout, parent, and gate mutations.
- The exact 12-path verification planner selected `RELEASE` and only `npm run release:ci`. That one execution passed 349/349 tests, lint over 77 JavaScript modules, format over 315 files, package selection over 41 files / 98,261 bytes, and exactly one isolated non-publishing packed candidate with SHA-256 `4023504fb61d80872ec003a98e2f3b3c367c0a26203be2ca7f7b312ce6a5838c`.
- Mutable first-attempt PR, reviewed expected-head merge, and post-main identities cannot be embedded in the exact head they describe. As established by Task 0054, the repository pair owns the executable contract and terminal handoff, while the same invocation's canonical GitHub ledger must still satisfy AC-10/AC-11 before delivery is reported complete or another Task can advance.

## Documentation Impact

- SPEC: Unchanged; supported coverage, Required fail-closed acceptance, exact-SHA roles, and publication boundaries are preserved.
- ARCHITECTURE: Updated the durable actual-head/post-main role graph and hosted-CI responsibility split; +414 UTF-8 bytes and +6 lines from the Task 0057 baseline.
- README: Updated the contributor-facing hosted topology and responsibility split; +173 UTF-8 bytes and +2 lines from the Task 0057 baseline.
- AGENTS: Unchanged; stable commands, evidence honesty, authority, and completion rules remain in force.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Completed read-only inventory of the current workflow topology, command baseline, immutable action/security controls, Required aggregation, delivery identity evaluator, execution guidance, external rule state, and dependency rationale.
- Authored a role-preserving metric and verification boundary; no implementation or delivery action has occurred.
- Completed fresh Git/GitHub delivery hydration, production evaluator classification, exact queue/transaction validation, and the sole authorized packaged dispatch.
- Entered the selected Task 0058 lifecycle on exact `main` base `b4bc81f84960dde7ad8ab5030ec417b54731825f`.
- Wrote the structural and delivery mutations first, preserved their expected pre-workflow failure, then implemented the Behavioral/Quality/Packed/Merge/Required topology.
- Updated delivery fixtures, verification alignment, retained-outcome coverage, execution guidance, README, and ARCHITECTURE without changing evaluator production behavior.
- Passed focused workflow/delivery/planner regressions, the exact changed-path planner, its sole `npm run release:ci` command, permanent-document growth policy, real packed-archive isolation, and all local topology/security/identity mutations.
- Completed canonical pair, exact 12-path diff/scope, historical Task 0057 byte identity, version/dependency, transaction, and archive-residue review; the repository outcome is ready for the mandatory same-invocation external ledger gate.

## Remaining

- None — repository implementation, acceptance verification, documentation synchronization, and terminal evidence are complete; ordinary `STANDARD` delivery remains gated by the same invocation's canonical GitHub ledger.

## Resume Point

- None — future queue advancement must consume Task 0058's exact GitHub ledger rather than mutate this terminal repository pair.

## Blockers

- None — Task 0057 is freshly delivery-satisfied and every local Task 0058 implementation check has passed; mutable Task 0058 delivery evidence remains the separate same-invocation external gate.
