# TASK 0084 — Separate Implementation and STANDARD Delivery

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Separate repository implementation from GitHub-backed `STANDARD` delivery so `$kyw-impl` ends after documentation synchronization, local verification, and `DONE/PASSED`, while a new explicit-only `$kyw-deliver NNNN` exclusively performs or resumes the selected Task's exact delivery lifecycle through post-main CI and final reporting.

## Dependencies

- Task 0083.

## In Scope

- Narrow `$kyw-impl` to exact existing-Task implementation, resume, documentation synchronization, acceptance-specific local verification, final-diff coverage, and truthful `DONE/PASSED` or `BLOCKED/BLOCKED`; it must perform no selected-Task commit, push, PR, merge, or post-main delivery action.
- After a `STANDARD` Task reaches `DONE/PASSED`, make `$kyw-impl` report the exact line `다음 단계: $kyw-deliver NNNN` and stop. Exact, next, and continuous implementation routes must not select or execute pending delivery or chain into another Skill; when an earlier pending delivery blocks implementation, they identify its exact deliver command.
- Add the explicit-only, four-digit exact `$kyw-deliver NNNN` Skill, metadata, and one canonical detailed delivery reference. It owns only a repository-complete Task's current `STANDARD` delivery, interrupted-delivery resume, already-satisfied report-only result, and terminal delivery report; no bare form or managed-language alias is added.
- Preserve the established delivery sequence and identities: stage and commit only the selected Task's exact verified paths, non-force push, non-draft PR, actual-head exact-SHA CI observation, distinct synthetic merge compatibility, review and mergeability inspection, one ordinary expected-head PR merge that honors existing protection without requiring protection to exist, post-merge `main` exact-SHA CI observation, and final reporting.
- Extend the sole packaged Task adapter and shared route-aware dispatcher so implementation and delivery use one parser/queue/evaluator/hydration/continuity graph. Reuse the existing production delivery evaluator and core modules; add no second adapter, selector, delivery ledger, checkpoint, or copied deterministic engine.
- Keep implementation-side prior-delivery checks read-only. Move application of an opaque continuity transition to the delivery route, allow it only for the exact selected terminal Task branch, cover only already delivered predecessors, and preserve atomic/idempotent one-step causal lag with no selected-Task self-attestation.
- Resume a partially completed delivery from revalidated local Git and GitHub state without repeating a completed commit, push, PR creation, merge, or other externally visible action. Observe existing CI only; never rerun it, fall back to an earlier successful attempt after a later result, retry a failed external action, or fabricate missing evidence.
- Fail closed on missing or malformed state, wrong Task lifecycle or delivery policy, another active Task, unsafe or unexplained work, dependency or continuity gaps, identity or expected-head drift, missing objects or logs, failed/cancelled/skipped/incomplete or role-confused CI, review blockers, non-mergeability, terminal-pair drift, or a genuine user-owned decision.
- Preserve contract-3 delivered Task/Test path, mode, and byte immutability. An unchanged satisfied delivery is report-only; corrections continue through a new explicit hard-dependent `$kyw-task "<correction outcome>"` pair rather than reopening, editing, redelivering, or reclassifying the original pair.
- Preserve user work during implementation and delivery. Exact staging and commit must exclude unrelated tracked, untracked, staged, or generated changes; an unprovable selected-Task path set blocks instead of using broad staging, cleanup, reset, or destructive recovery.
- Update routing and discovery across `$kyw-task`, `$kyw-impl`, the new Skill, root and generated project instructions, plugin prompts, maintainer command examples, and fallback/state guidance. Keep the three Korean aliases implementation-only and make every state transition name the correct exact next Skill command.
- Project exactly six current Skills through plugin packaging and direct user/project installation. Newly written ownership metadata lists six Skills; doctor, update, and uninstall safely read both the immediately previous ordered five-Skill inventory and the original ordered four-Skill schema-1 inventory without broadening ownership or touching unrelated bytes.
- Synchronize the four permanent owners, affected project templates, plugin/package/direct-install projections, deterministic validators and verification planner, focused Skill/dispatcher/hydration/continuity/installation/distribution tests, direct behavioral acceptance, evaluator fixtures, and command examples. Recalculate actual inventories and permanent-document growth evidence instead of preserving stale counts.

## Out of Scope

- Editing, renaming, deleting, reopening, or otherwise changing delivered Task 0083 or any other historical Task/Test pair; this new pair depends on and preserves that activation-scoped guardrail baseline.
- Adding a bare `$kyw-deliver`, a Korean delivery alias, implicit invocation, automatic Skill chaining, background delivery, a daemon, watcher, second dispatcher, alternate delivery provider, generic provider abstraction, second continuity checkpoint, growing receipt ledger, or production dependency.
- Changing Task contract version 3, supported Task/Test lifecycle pairs, hard-dependency grammar, the static `STANDARD` versus reasoned `NONE` declaration, GitHub as the sole current `STANDARD` ledger, or grandfathered contract-1/2 meaning.
- Initiating CI reruns, retries, fallback credentials or delivery paths, force push, destructive cleanup or recovery, branch deletion, branch-protection bypass, administrative override, or account/security configuration changes.
- Publication, npm registry mutation, package or plugin version change, dist-tag, Git tag, GitHub Release, public plugin-directory submission, or any other public distribution action; package metadata remains at its current version unless separately authorized later.
- Unrelated refactoring, historical fixture rewriting beyond affected routing/delivery projections, or changes to grilling/audit behavior that are not required to recognize the sixth Skill and shared guardrail contract.

## Acceptance Criteria

- [x] AC-01: Product truth, architecture, repository instructions, user/maintainer guidance, plugin metadata, and Skill metadata expose exactly six explicit-only Skills and consistently assign authoring to `$kyw-task`, repository implementation through `DONE/PASSED` to `$kyw-impl`, current `STANDARD` delivery to `$kyw-deliver NNNN`, and independent verification to `$kyw-audit`.
- [x] AC-02: For a selected `STANDARD` Task, `$kyw-impl` can return only implementation/resume/block/report outcomes, performs no selected-Task Git/GitHub delivery mutation, terminalizes the repository pair honestly, emits exactly `다음 단계: $kyw-deliver NNNN`, and stops even in continuous mode without invoking or dispatching the delivery Skill.
- [x] AC-03: Existing exact and managed implementation routes never auto-select pending delivery. A pending current or predecessor delivery blocks further implementation with the correct exact `$kyw-deliver NNNN` handoff, while a reasoned `NONE` Task retains local terminal behavior and no unnecessary delivery command.
- [x] AC-04: Only an exact explicit `$kyw-deliver NNNN` may select delivery. It rejects missing, DRAFT, READY, active, blocked, cancelled, wrong-policy, dependency-blocked, or conflicting state without implementation or pair mutation; it resumes valid pending state and returns an unchanged, satisfied contract-3 Task as immutable report-only.
- [x] AC-05: A valid delivery follows exact-path commit, non-force push, non-draft PR, actual-head CI, separate synthetic merge compatibility, review and mergeability, one ordinary expected-head PR merge that honors existing protection without requiring protection to exist, post-main exact-SHA CI, and final report ordering with repository/workflow/run/job/attempt/checkout identities kept distinct.
- [x] AC-06: Interrupted delivery revalidates evidence and continues only the first unfinished safe action; completed external actions are not repeated, CI is never rerun, later failed/cancelled/incomplete executions never fall back to older success, and every missing, stale, ambiguous, mismatched, blocked, or unsafe condition fails closed with bounded diagnostics.
- [x] AC-07: Both Skills call one packaged adapter and one route-aware dispatcher backed by the existing delivery evaluator, hydration, queue, and continuity core. Only the delivery route may apply the opaque transition, it covers predecessors only, exact replay is idempotent, and the selected Task cannot attest to or checkpoint its own delivery.
- [x] AC-08: Delivery preserves unrelated user work, commits only the proven selected-Task path set, retains terminal Task/Test bytes, and rejects path/type/mode/content drift or same-Task redelivery; corrections remain new hard-dependent pairs and prior contracts retain their historical interpretation.
- [x] AC-09: Plugin and direct installation expose exactly six current Skills with one `kyw-deliver` source and shared hidden runtime; new metadata writes six, exact legacy five- and four-Skill metadata remain safely readable for doctor/update/uninstall, and package selection contains the intended bytes without lifecycle scripts or duplicate engines.
- [x] AC-10: SPEC, ARCHITECTURE, README, root/generated AGENTS, `CODEX_PROMPTS.md`, affected templates, all Skill/reference projections, deterministic owner/guardrail manifests, planner mappings, plugin prompts, and state-specific command examples agree without copied procedure, stale five-Skill language, invalid links, or unjustified permanent-document growth.
- [x] AC-11: Focused implementation/delivery/parser/dispatcher/hydration/continuity scenarios, interrupted-stage and no-rerun fixtures, behavioral acceptance, lifecycle guardrails, immutability, dirty-worktree preservation, installation generations, plugin/package projection, and final diff coverage all pass with every failure and limitation recorded honestly.
- [x] AC-12: The final diff introduces no second evaluator/dispatcher/ledger/checkpoint, production dependency, Task schema change, implicit or background route, publication/version/tag/Release/submission action, force/destructive/bypass/admin/account mutation, external retry, or CI rerun.

## Plan

- [x] Capture and freeze the Task 0083, current five-Skill, dispatcher, delivery evaluator, hydration/continuity, install metadata, plugin/package, permanent-document, template, fixture, and command-example baselines without mutating delivered history.
- [x] Add failing focused tests and fixtures for the exact implementation-to-delivery handoff, non-selection by implementation aliases, exact-only delivery routing, lifecycle rejection, every resumable delivery stage, no-rerun behavior, causal lag, immutability, and dirty-worktree preservation.
- [x] Add `kyw-deliver` with compact metadata and one detailed delivery reference; narrow `kyw-impl` and its execution reference to repository completion and the exact terminal handoff without retaining a duplicate delivery procedure.
- [x] Make the existing adapter and dispatcher route-aware, separate prior immutable continuity evidence from current in-flight delivery state, and extend the shared core only where required for terminal-branch transition application, exact resume, fail-closed state, and no self-coverage.
- [x] Extend plugin/direct-install inventories and compatibility readers from five to six current Skills while preserving exact legacy five- and four-Skill ownership generations and all containment, transaction, collision, and user-file protections.
- [x] Synchronize affected permanent owners, root/generated instructions, maintainer prompts, project templates, plugin prompts, validators, planner mappings, behavioral harnesses, copied routing fixtures, and command examples; leave semantically unaffected Task templates and evaluator benchmarks byte-stable.
- [x] Run the complete changed-path planner, focused suites, direct fixture validation, Stable and package-sensitive local verification selected by the planner, pair/transaction validation, permanent-document measurements, and final scope/matrix/immutability review.
- [x] Repair the audited current-delivery probe so it re-reads exact PR detail after CI, fails closed on detail drift, safely resumes an existing PR after bounded correction, and closes focused plus required regression evidence before restoring terminal status.
- [x] Make base protection optional for the ordinary expected-head PR merge, keep existing-policy enforcement and no-bypass behavior, synchronize canonical truth, and close focused plus stable regression evidence.

## Decisions

- Keep this as one atomic Task: removing delivery from implementation and adding its only replacement route cannot ship independently without duplicate authority or an undeliverable intermediate product.
- Depend only on delivered Task 0083 because the sixth Skill must inherit its activation-scoped warning, reconfirmation, route-lock, and immutable-reporting baseline. Tasks 0039, 0053, 0054, 0058 through 0062, 0070, and 0073 remain regression/test bases rather than extra hard dependencies.
- Interpret explicit-only `$kyw-deliver NNNN` literally: require the four-digit exact form, add no bare or managed alias, and make implementation routes return its exact command instead of silently dispatching it.
- Keep prior-delivery dependency and continuity discovery available to implementation as read-only gating, but move continuity transition application and all current-Task delivery mutation to the delivery route. A transition may cover only an already delivered predecessor, preserving causal lag and forbidding self-attestation.
- Keep Task/Test `DONE/PASSED` as repository completion before delivery. `$kyw-deliver` treats those terminal bytes as its input, never records mutable GitHub chronology in them, and leaves a blocked or completed delivery to the external ledger and user-facing report rather than reopening the pair.
- Move the detailed Git/GitHub procedure to `skills/kyw-deliver/references/delivery.md`; keep `skills/kyw-impl/references/execution.md` focused on implementation and local evidence, and let both invoke the sibling `kyw-task` adapter without adding Skill-local scripts.
- Treat the ordered current five-Skill install list as a second legacy schema-1 generation alongside the original four-Skill list; only new install/update metadata writes the ordered six-Skill list.
- Keep package/plugin version and all publication state unchanged. Package and planner checks are verification only and grant no external delivery or publication authority.
- Treat branch protection as optional repository configuration. The exact `$kyw-deliver NNNN` route authorizes one ordinary merge-commit request bound to the expected PR head without a second kyw confirmation; positively observed absence is allowed, present rules remain mandatory without bypass/admin authority, and unknown protection state blocks.

## Risks

- Current in-flight delivery cannot be hydrated as if it were an already merged immutable predecessor; failing to separate those modes would block the first commit or accept fabricated history.
- Moving the continuity application boundary from active implementation to terminal delivery could accidentally cover the selected Task, apply on the wrong branch, mutate an already satisfied pair, or break atomic/idempotent replay.
- A partial prose-only split could leave `DELIVER` reachable from implementation aliases, create two procedure owners, or let continuous mode chain across the new explicit boundary.
- Resume logic could repeat a commit, push, PR, merge, or CI execution if local and GitHub identities are not reconstructed before the first unfinished action.
- A pull-request collection item can omit detail-only mergeability fields; reusing it after CI can falsely block a safe PR or accept stale identity unless the exact PR is fetched and rebound.
- Protection inspection can be absent, inaccessible, or inconsistent across classic rules and rulesets. The Skill-owned merge stage must distinguish positively observed absence from unknown state, allow only the former, honor every present rule, and keep protection out of canonical delivery evidence.
- Without protection, GitHub's expected-head merge field is not an atomic base compare-and-swap. The base can move after the final read, so delivery must disclose that residual race and require the exact ordered-parent postcondition even though it can detect rather than prevent the mutation.
- A pre-canonical audit repair can leave the selected terminal-pair bytes newer than an existing PR head. Ignoring that bounded commit marker could merge stale code, while treating unrelated-only work as selected dirt or rejecting every ancestor-only PR head update would break safe resume.
- Broad staging or cleanup during delivery could absorb unrelated user work; exact-path proof must remain a blocking precondition.
- Replacing a fixed five-Skill inventory without recognizing that exact generation could make safe update, uninstall, or doctor reject existing installations or misclassify owned files.
- Six-Skill and two-reference projections could duplicate detailed procedure or exceed root/generated instruction and permanent-document budgets; compact replacement, measured deltas, and canonical-owner validation are required.

## Discoveries and Changes

- The current `kyw-impl` Skill and its single execution reference own implementation, automatic pending-delivery selection, current `DELIVER`, continuity transition application, and all Git/GitHub delivery steps together.
- `skills/kyw-task/scripts/task-artifacts.mjs` is the sole process adapter. It loads `src/core/task-artifacts.mjs` from the package or hidden direct-install runtime, hydrates delivery evidence, calls `resolveTaskDispatch`, and creates an opaque continuity token; a new Skill-local adapter or evaluator would duplicate the established engine.
- `src/core/task-artifact-delivery.mjs` owns invocation and production evidence parsing/classification, `src/core/task-artifact-queue.mjs` owns deterministic selection, and `src/core/task-artifact-hydration.mjs` plus `task-artifact-continuity.mjs` own exact Git/GitHub reconstruction and the bounded checkpoint.
- The present dispatcher can return `DELIVER` for exact terminal implementation input and prioritizes resumable delivery before READY work for managed next/continuous input. Both behaviors must become route-specific while one dispatcher remains authoritative.
- Current continuity application expects an `IN_PROGRESS/RUNNING` selected branch and internally binds an implementation invocation. The new boundary needs an exact terminal delivery route that can apply only a predecessor transition while retaining selected ID, branch, unchanged-main, exact-prefix, atomic/idempotent, and no-self-coverage guards.
- Task 0083 is contract 3 `DONE/PASSED`; read-only GitHub observation reports PR 70 merged at exact head `c33f0ed5b2935483e4ac84d414878389337343ef` into `main` commit `64e4f2df72507f287ccd57b13405baafe7ec348d`, with successful PR and post-main CI. Production dispatch, not this observation, must establish delivery satisfaction.
- The rolling checkpoint intentionally covers through Task 0081, Task 0082 declares `NONE`, and Task 0083 is the sole uncovered `STANDARD` predecessor. Goal-style authoring must not mutate that causal state; later delivery/implementation dispatch must evaluate it through the existing production path.
- Direct installation currently writes an ordered five-Skill inventory and recognizes only the original ordered four-Skill list as legacy. The six-Skill cutover therefore needs two exact legacy generations, not a permissive subset rule.
- The plugin includes the whole `skills/` tree, while foundation, direct-install, prompt, planner, distribution, and instruction validators contain fixed Skill names, paths, prompts, counts, or owner projections that must be updated from measured final bytes.
- `templates/project/AGENTS.md` contains affected five-Skill routing and automatic-delivery projections. Canonical Task/Test templates retain the static delivery declaration and need no semantic change unless implementation discovers a validator-owned projection that cannot remain stable.
- The plugin manifest and Skill/package paths make the expected diff release-sensitive for local verification, so the planner should select `npm run release:ci`; that command does not publish or authorize any external mutation.
- No unresolved user-owned decision or new production dependency is known. The Task set must remain one pair because its Skill, dispatcher, distribution, documentation, and verification halves are not independently shippable.
- The sole production dispatcher selected Task 0084 as `IMPLEMENT` after aligning local, upstream, cached, direct-remote, and GitHub `main` at `64e4f2df72507f287ccd57b13405baafe7ec348d`; it evaluator-satisfied Task 0083 as the one uncovered `HARDENED_EXACT_HEAD` predecessor and prepared one predecessor-only continuity transition.
- The verified implementation baseline is exact `main` tree `c28b553e67aa427577d5ad767211ec942f6d5977`: five visible Skill directories, `src/core` tree `4f8fa9d60b92e673b9ff6e22c9e81b612bbcd7ba`, sole adapter tree `c836e7da5313a100e5cb8b33a22166ef170315a3`, and immutable Task 0083 pair blobs `682be9f3309ea2ca429036f6e29e35960a05df7b` / `e9db052247770942c55f4073d3b70ab5f28993fd`.
- Baseline permanent-document measurements are README 17,748 bytes / 229 lines, AGENTS 4,089 / 50, SPEC 48,305 / 467, and ARCHITECTURE 44,557 / 882; the combined baseline is 114,699 bytes / 1,628 lines.
- Adversarial review exposed four runtime boundaries that prose-only coverage could not satisfy: selected current delivery must be excluded from predecessor checkpoint gaps, automatic implementation must identify the first pending delivery command, `CANCELLED` must never route to an unusable delivery command, and in-flight PR/CI/review state must be hydrated rather than collapsed to generic pending.
- The continuity write boundary also needs fresh uncached remote/queue/pair/staging validation immediately before mutation and serialized compare-and-swap behavior; checking cached refs and then renaming over a concurrently changed checkpoint can otherwise violate causal/idempotent guarantees.
- The route-aware parser and dispatcher now separate `IMPLEMENTATION` from exact-only `DELIVERY`; implementation returns the earliest exact delivery handoff, while selected-current hydration stays outside predecessor continuity and bounded partial stages preserve actual-head, synthetic, review, merge, and post-main identities.
- Continuity apply now revalidates queue, Git identities, predecessor path/mode/bytes, staging, and checkpoint state under a fixed exclusive lock before atomic compare-and-swap publication; replay is idempotent and selected Task 0084 remains uncovered.
- External commit/push/PR/merge and post-merge synchronization remain intentionally Skill-owned procedure over the sole shared runtime, so local evidence proves their ordering and fail-closed contract rather than claiming an external mutation run. Pre-audit review found no blocker in the branches it exercised, but did not cover the current-PR-detail and correction-resume gaps repaired below.
- Residual non-blocking boundaries are recorded in `TEST.md`: transition provenance is digest-bound and procedurally guarded rather than cryptographically authenticated, and two injected topology/post-main cases have lower persisted-fixture coverage without an observed runtime defect.
- Repair audit found that current-delivery selection reused the pull-request collection item at the review/mergeability gate even though GitHub exposes mergeability only on the exact detail response. The existing exact-detail client method was unused by this path.
- Audit-time ownership review confirmed that base-protection inspection remains the canonical delivery procedure's post-dispatch, immediately-before-merge responsibility rather than hydration-owned evidence. The later user-requested pre-canonical revision keeps that ownership but makes positively observed absence valid and noncanonical report metadata.
- Repair audit found a second resume gap: pending terminal-pair bytes were not represented in stage selection, and a new local commit could not advance an existing open PR by ordinary fast-forward push because any differing PR head was rejected.
- At repair authorization, no complete production-evaluator-satisfied contract-3 delivery graph had attached canonical pair immutability to this Task. Reopening the pair corrected pre-canonical repository evidence without rewriting delivered history or copying mutable GitHub chronology.

## Documentation Impact

- SPEC: Change the observable Skill count and responsibility contract, implementation terminal handoff, exact delivery route, pending-delivery behavior, continuity application boundary, resume/no-rerun rules, compatibility, and acceptance while retaining all separate-authority exclusions.
- ARCHITECTURE: Split implementation and delivery procedure ownership and control flow, add the exact delivery route, keep one adapter/dispatcher/evaluator/core graph, relocate causal transition application, and project six-Skill direct/plugin distribution plus two legacy install generations.
- README: Update the workflow, command table, routing, examples, installation counts, package/plugin descriptions, repository map, and implementation-to-delivery handoff for users and contributors.
- AGENTS: Compactly route implementation and delivery to separate explicit Skills, remove pending-delivery execution from implementation aliases, preserve active guardrails and immutable/history boundaries, and keep root plus generated template projections synchronized.
- Audit repair: No permanent-owner semantic change is required; the four-path source, test, and pair correction restores the already-owned exact-PR-detail, first-unfinished-resume, unrelated-work-preservation, and Skill-owned protection boundaries.
- Pre-canonical policy revision: SPEC and ARCHITECTURE make base protection optional while retaining exact-head/no-bypass behavior; README and AGENTS remain unchanged because their existing projections already describe an expected-head merge and forbid bypass.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded and reconciled the root instructions, current Task/Test pair, Task 0083 dependency pair, and all four permanent documents; no unresolved baseline conflict or user-owned decision remains.
- Validated the Task 0084 pair and empty Task transaction state, separated its newly authored untracked pair from all other work, and confirmed local plus direct-remote `main` alignment.
- Ran the sole production dispatcher with the exact `$kyw-impl 0084` invocation and closed `NO_TASK_OVERRIDE` preflight; it selected `IMPLEMENT` and verified Task 0083 delivery without retry or external mutation.
- Created `task/0084-separate-implementation-and-standard-delivery` from exact aligned `main` and activated this pair as `IN_PROGRESS/RUNNING`.
- Applied the dispatcher-issued continuity transition exactly once on the active branch; the fixed-bounded checkpoint now covers 49 predecessor Tasks through Task 0083 at digest `7d5767e9e21c9b09c8126cb54f1882c89d6c0a14cc099a1ea661481a50f42f7a` without selected-Task self-coverage.
- Added the sixth explicit-only `kyw-deliver` Skill, canonical delivery reference, implementation-only handoff, interrupted-stage fixture, six-Skill root/template/plugin/user projections, and compact permanent truth; focused Skill/instruction/planner scenarios, behavioral acceptance, foundation, distribution, formatting, and whitespace checks are green.
- Extended direct installation to write the exact ordered six-Skill inventory while safely reading exact previous five- and original four-Skill generations; the full 48-case installation suite, 31-file direct inventory, 46-entry tarball smoke, and unowned newer-Skill byte preservation pass.
- Hardened the shared route, hydration, queue, and continuity runtime for first-pending selection, actual-versus-synthetic CI proof, truthful review timing, deleted-remote history, terminal pair immutability, fresh locked apply validation, and atomic checkpoint compare-and-swap.
- The pre-audit tree reported every acceptance row closed after focused, foundation/distribution, direct-fixture, planner, and Release checks; the repair audit superseded that completeness claim by exposing uncovered current-PR-detail and pre-canonical correction-resume branches.
- Confirmed the final repository boundary: Task 0083 blobs and all main refs remain unchanged, package version stays `0.1.4` with no production dependencies, and the tree has exactly six Skills and one adapter/core graph. The original implementation invocation performed no commit, push, PR, merge, publication, retry, rerun, force, destructive, bypass, or administrative action.
- Repaired current-delivery hydration to scope pending-commit detection to the selected terminal pair, validate an existing PR before COMMIT or fast-forward PUSH resume, and re-read exact PR detail after CI for identity and mergeability while retaining the reviews endpoint for review state.
- Closed the audit repair with 2/2 focused probes, 61/64 full hydration tests with three documented skips, and the planner-required Stable gate: 425/429 tests with four documented skips, zero failures, plus lint, format, and 46-file pack checks.
- Revised the pre-canonical delivery policy so a Ruleset is not required: exact-branch plus complete branch-effective rule inspection distinguishes `ABSENT`, `PRESENT`, and fail-closed `UNKNOWN`; existing rules remain enforced without bypass/admin, final-read drift blocks, and post-merge resume never repeats a proven merge or invents its past disposition.
- Closed the policy revision with Skill validation, 10/10 focused delivery tests, 2/2 expected-head diagnostic tests, 83/83 combined contract regressions, and the planner-required Stable gate: 427/431 tests with four documented skips, zero failures, plus lint, format, and 46-file pack checks.

## Remaining

- None — the policy correction, evidence synchronization, and required local verification are complete.

## Resume Point

- None — repository implementation is complete; a later exact `$kyw-deliver 0084` starts or resumes mutable GitHub delivery from fresh state.

## Blockers

- None — the policy correction is local and does not require creating or changing a GitHub Ruleset.
