# TASK 0083 — Scope kyw Skill Guardrails to Active Invocations with Bounded Reconfirmation

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Supersede the delivered Task 0080 authority model without changing its immutable pair by making kyw project guardrails active only for an actually invoked Skill workflow and replacing immediate execution versus permanent refusal with a warning, fresh exact reconfirmation, truth synchronization, and bounded-execution state machine.

## Dependencies

- Task 0080.

## In Scope

- Define an invocation-local lifecycle shared by all five kyw Skills: inactive ordinary handling, active aligned execution, active change pending after a concrete warning, freshly reconfirmed bounded execution, and cancelled or expired state. Exact explicit Skill invocations and the three existing managed aliases remain the only activation routes.
- Make a prompt outside an active kyw Skill remain ordinary: kyw workflow rules alone must not block it, warn about Task scope, select or allocate a Task, or redirect it into a Task workflow. An ordinary requested change may still synchronize affected permanent truth as part of that outcome, without making a Task gate its prerequisite.
- Let an active Skill continue without ceremonial confirmation when a new command remains aligned with the established shared baseline, selected Task, acceptance criteria, scope, action, target, and current attempt.
- When an active-Skill command changes or leaves the established baseline, selected Task, acceptance, or scope, require a pre-mutation warning that identifies the controlling old criterion, the requested new criterion, concrete implementation, Task/Test, permanent-document, verification, and delivery impacts, plus the proposed action, target, scope, and attempt; then wait with zero mutation.
- Accept only the trusted current user's immediate, unambiguous, explicit reconfirmation of that exact warning. After valid reconfirmation, synchronize every applicable mutable Task/Test contract and affected permanent owner before implementation or external mutation, then execute only the approved action, target, scope, and attempt. A kyw project guardrail may constrain model initiative but may not serve as a permanent veto after this transition.
- Treat cancellation, decline, ambiguous assent, an intervening or stale response, changed facts, a different or additional action, target, scope, attempt, baseline, Task, or acceptance change as no authority. Clear or replace the pending warning without mutation, and require a fresh concrete warning for any materially changed request.
- Define combined routed-message behavior as one activation and one route: classify clauses independently, continue aligned clauses, warn before any changing clause mutates, never count the originating message as its own reconfirmation, and never redispatch, chain Skills, or broaden a later approval.
- Synchronize the canonical product and architecture owners, concise README and root/generated AGENTS projections, all five Skill procedures and applicable detailed references, deterministic projection validation, and executable behavior scenarios without relying on regular-expression wording checks alone.

## Out of Scope

- Editing, renaming, deleting, reopening, or reterminalizing delivered Task 0080 or either preserved file on `wip/0080-pre-dispatch-draft`; this correction receives a new identity and hard dependency.
- Weakening or redefining system or platform safety limits, fabricating evidence or truth, mutating immutable delivered history, exposing secrets, or treating reconfirmation as a generic safety bypass.
- Enabling implicit Skill invocation, widening the three managed aliases, changing Task parser grammar, adding a Task-ID exception, bypassing the dispatcher, auto-invoking another Skill, or redirecting inactive ordinary prompts into authoring or implementation.
- Adding an ambient, persistent, cross-invocation, cross-attempt, or unbounded approval store; adding a production regular-expression or general natural-language authority classifier; or adding a daemon, watcher, background workflow, or production dependency.
- Performing an npm publication, version or tag change, GitHub Release, public submission, push, PR, merge, external retry, force/destructive recovery, bypass, account mutation, or unrelated cleanup.

## Acceptance Criteria

- [x] AC-01: Only an exact explicit kyw Skill invocation or existing exact managed alias activates kyw workflow guardrails for that invocation; inactive and post-terminal ordinary prompts receive no kyw-only block, warning, active-Task selection, Task creation, or Task redirection.
- [x] AC-02: While a Skill is active, a command aligned with the established baseline, selected Task, acceptance, scope, action, target, and attempt proceeds within the current workflow without duplicate confirmation.
- [x] AC-03: A command that changes or leaves the active baseline, selected Task, acceptance, or scope produces a concrete old-versus-new impact warning and a mutation-free pending state before any Task/Test, permanent-document, implementation, dispatcher, or external-action mutation.
- [x] AC-04: Only immediate explicit reconfirmation of the exact pending warning permits progress; applicable Task/Test and permanent truth synchronize before the approved mutation, execution remains limited to the named action, target, scope, and attempt, and no kyw project guardrail permanently vetoes that properly reconfirmed change.
- [x] AC-05: Cancellation, decline, ambiguity, stale or intervened assent, changed facts, and changed or added action, target, scope, attempt, baseline, Task, or acceptance grant nothing, perform no mutation, and require cancellation or a fresh warning rather than reviving older authority.
- [x] AC-06: A combined routed message activates and dispatches once, preserves clause separation, proceeds only with aligned clauses, warns and waits on a changing clause, requires a later exact reconfirmation, and never self-confirms, redispatches, chains Skills, or broadens authority.
- [x] AC-07: SPEC, ARCHITECTURE, README, root and generated AGENTS, all five Skill procedures and applicable references, and deterministic projection ownership express one consistent activation-scoped state machine while explicit-only metadata, exact aliases, closed dispatcher preflight, one-active-Task selection, immutable delivered pairs, evidence honesty, and system/platform safety remain fail-closed.
- [x] AC-08: Executable multi-turn behavior scenarios cover inactive ordinary handling, active aligned execution, warning-before-mutation, exact reconfirmation, truth-sync-before-action ordering, bounded execution, cancellation, stale and changed approval, combined routing, and post-terminal inactivity; focused, Stable, package, pair, transaction, and final-diff checks pass with no external mutation.

## Plan

- [x] Freeze the delivered Task 0080 and WIP reference identities, then capture the current permanent-owner, Skill, parser, dispatcher, projection, and behavior-oracle baselines.
- [x] Add failing executable state-transition scenarios and event-order assertions for every activation, warning, reconfirmation, expiry, cancellation, bounded execution, and combined-message branch.
- [x] Replace the canonical immediate-authority-versus-stop meaning in SPEC with the activation-scoped state machine, update ARCHITECTURE control flow, and keep README and root/generated AGENTS projections concise.
- [x] Align all five Skill procedures and applicable detailed references, then update the deterministic rule-family owner and focused compatibility assertions without widening invocation or dispatcher grammar.
- [x] Run the changed-path planner, focused scenarios, Stable and package-sensitive verification, pair and transaction validation, permanent-document measurements, and final scope, immutability, and coverage review.

## Decisions

- Preserve delivered Task 0080 byte-for-byte and express this outcome as its new hard-dependent correction.
- Keep the state machine invocation-local and conversational; do not add persistent approval state or a production natural-language classifier unless a later explicit rebaseline establishes a separately accepted need.
- Keep SPEC as the canonical behavior owner, ARCHITECTURE as the activation/control-flow owner, and each Skill or detailed reference as the procedural owner for its active phase; projections remain minimal.
- Treat permanent-truth synchronization for an ordinary requested outcome as part of that outcome, not as a kyw Task precondition, while active-Skill baseline changes use the warning and reconfirmation gate.
- Preserve explicit Skill routing, exact managed aliases, deterministic Task mechanics, delivered-pair immutability, and truthful evidence; reconfirmation changes only the warned project baseline and named execution bounds, never system or platform safety.
- Keep Skill-native confirmation distinct from guardrail reconfirmation: `kyw-init` materialization and `kyw-task` DRAFT promotion retain their own final write confirmation, while goal authoring and aligned implementation do not gain a ceremonial duplicate.
- Model implementation stages explicitly: `IMPLEMENT` and `RESUME` use a mutable pair with no delivery state, `DELIVER` uses a mutable pair with resumable delivery, and terminal `REPORT` is read-only against an immutable pair with satisfied delivery.

## Risks

- An overbroad inactive state could suppress necessary system safety or preservation behavior instead of only kyw workflow gating.
- A permissive reconfirmation match could accept stale, ambiguous, or enlarged authority, while an overly strict match could recreate a permanent project-guardrail veto.
- Inconsistent projections across five Skills could make identical user turns behave differently by entry path or leave a stopped Skill accidentally active.
- Combined messages could mutate before warning, route twice, or confuse a Task override with separate action authority.
- Cross-owner wording and packaged Skill changes could exceed document or representative-instruction budgets or leave deterministic foundation assertions tied to the superseded model.

## Discoveries and Changes

- Delivered Task 0080 and current SPEC Section 6.3 grant a resolved affirmative act-now command immediately and otherwise stop on conflict; neither defines an active-Skill flag, pending warning identity, truth-sync gate, or fresh reconfirmation transition.
- The current executable authority helper models grants and closed attempts but not Skill activation, baseline or acceptance drift, warning payloads, freshness, synchronization ordering, or post-confirm execution bounds.
- Combined suffix coverage currently routes once and preserves the closed dispatcher preflight enum, but a recognized external-action clause can grant immediately without the requested warning transition.
- Exact Skill metadata, anchored Task parsing, closed preflight, one-dispatch queue behavior, and immutable-terminal handling are sound regression boundaries; the conversational state machine does not currently require a new production classifier.
- The preserved WIP draft predates the delivered correction, retains the same immediate-authority family, and contains no requested activation-scoped warning/reconfirmation state machine; it is comparison evidence only.
- No unresolved product decision or new production dependency is known after the user's explicit approval of a new hard-dependent correction pair.
- The sole dispatch aligned local and remote `main` at `9431dbfb0ab17eb87f6b2b4d72f66072822811de`, production-evaluated Task 0081 as the one uncovered predecessor, and selected Task 0083 with `IMPLEMENT` and a one-use continuity transition.
- The delivered Task 0080 pair baselines are Git blobs `56dd16285dd5333cb58a5426877dad36be3337d5` (`TASK.md`) and `9d0ff00939cc85d9a37bc9d7f442872a9b5391c4` (`TEST.md`); the preserved comparison branch remains `wip/0080-pre-dispatch-draft` at `ab03a813784c994a9f1c4369f0f1b1573b981c3b`.
- SPEC now owns the five canonical lifecycle states and exact warning/reconfirmation semantics; ARCHITECTURE owns activation, context loading, ordered synchronization, one-route clause flow, and the absence of a persistent approval store or production natural-language classifier.
- Route identity binds Skill, mode, route capability, selected Task ID and exact directory, pair disposition, and delivery disposition. Unsupported Skill/mode transitions, Task or directory changes, immutable implementation criteria, and terminal `REPORT` action changes expire to a new exact route with zero mutation.
- The test-only lifecycle oracle uses closed contract, activation, aligned, change, impact, reconfirmation, and deferred-execution shapes. It rejects missing, extra, whitespace-only, `null`, `undefined`, sparse, reordered, duplicate, stale, widened, or mismatched values before mutation and orders permanent-owner sync, Task/Test sync, then the bounded action.
- All five Skills and implementation/audit references project the same lifecycle without changing explicit-only discovery, the three managed aliases, native confirmation, read-only, author-only, repair, implementation, immutable-history, or external-action boundaries.
- The foundation manifest structurally fixes the owner/projection family, five states, transition graph, route profiles, Task identity locks, implementation-stage dispositions, exact synchronization order, and non-waivable invariants. The behavioral fixture also proves inactive ordinary prompts cannot activate, warn, select, or redirect a Task.
- `kyw-grilling` changed intentionally, so immutable `benchmark.v10.json` remains untouched and new `benchmark.v11.json` pins Skill SHA-256 `f5677ef38b43a03b3ad55e00edac5623b720bc9e296e2f483caa090de518f164`; the evaluator default and frozen-delta test now select v11.
- Final permanent-document measurements are 17,748 / 4,089 / 48,305 / 44,557 bytes and 229 / 50 / 467 / 882 lines for README / AGENTS / SPEC / ARCHITECTURE. The combined set is 114,699 bytes / 1,628 lines, and the representative generated-AGENTS plus authoring/implementation bundle is 32,751 bytes.

## Documentation Impact

- SPEC: Replace the global direct-authority binary with canonical active/inactive, aligned, warning-pending, freshly reconfirmed, cancelled, and expired behavior plus ordinary-prompt and safety boundaries.
- ARCHITECTURE: Add the invocation lifecycle, warning identity, synchronization-before-action ordering, clause flow, state expiry, and boundary between project guardrails and system/platform safety.
- README: Explain when kyw guardrails are active, how ordinary prompts remain ordinary, and how concrete warning and bounded reconfirmation work during an active workflow.
- AGENTS: Scope managed project guardrails to active routed Skills and project the warning, no-mutation wait, exact reconfirmation, synchronization, and expiry rules without copying detailed procedure.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Validated the pair and transaction state, confirmed no competing active Task, aligned local `main` safely, completed the sole dispatcher preflight, selected Task 0083 as `IMPLEMENT`, and created `task/0083-scope-kyw-skill-guardrails` without a second dispatch.
- Applied the one-use continuity transition exactly once; the checkpoint now covers 48 predecessor Tasks at digest `3f0ee68ab369b9e7fba2b0fc6e7fa13b05454156bb2945fdade72664fc2e5a6c`.
- Replaced the superseded product model in SPEC, added the invocation and context-loading flow to ARCHITECTURE, and synchronized concise README, root/generated AGENTS, five Skill, and implementation/audit-reference projections.
- Added the deterministic foundation rule family and preclassified multi-turn oracle for exact activation, aligned continuation, concrete warning, no-mutation wait, exact immediate/deferred reconfirmation, sync ordering, bounded execution, cancellation/expiry/replacement, combined routing, immutable reporting, and post-terminal inactivity.
- Closed adversarial schema and lifecycle edges for route capabilities, exact Task directories, pair/delivery dispositions, Skill-native confirmations, ordinary outcomes, full transition tuples, self-confirmation, chained routes, sparse or nullable arrays, and deferred-approval inventory substitution.
- Updated direct behavioral acceptance and the immutable grilling benchmark successor; focused nine-file scenarios passed 135/135, grilling evaluation passed 15/15, and fixture validation returned `valid: true` for six current-session scenarios.
- The changed-path planner selected Release. Final `npm run release:ci` passed 404 tests with 400 passes, four explicit skips, zero failures or cancellations; lint covered 82 modules, format covered 370 files, and both package checks verified 43 files / 136,863 bytes with candidate SHA-256 `ddecdd4b5754bf81538cc6c9372012aedca8fa8dab6f6953ee3b407df25764969`.
- Revalidated exact permanent-document deltas, 32,751-byte representative instructions, Task 0080 blobs and WIP ref, current pair, transaction state, whitespace, final diff, scope/matrix coverage, and two independent read-only reviews with no remaining finding or out-of-scope external mutation.

## Remaining

- None — repository implementation, durable truth, acceptance evidence, final coverage, and pair/transaction checks are complete. The separate `STANDARD` GitHub exact-SHA ledger remains external and was intentionally not attempted because push, PR, merge, and other external actions are outside this implementation scope.

## Resume Point

- None — no repository work remains. Any later external delivery must be separately in scope and must not be inferred from this completed implementation attempt.

## Blockers

- None for the repository outcome — hosted exact-SHA delivery evidence is pending outside this scope and is not claimed as completed.
