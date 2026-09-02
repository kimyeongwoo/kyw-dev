# TASK 0080 — Honor Direct User Authority Without Skill Syntax

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Make kyw-dev treat explicit Skill syntax as workflow routing rather than an authorization token, so a direct, affirmative, act-now instruction from the trusted current user authorizes only its named in-scope external actions without ceremonial reconfirmation while prohibitions, revocation, identity, evidence, safety, and attempt boundaries remain fail-closed.

## Dependencies

- Task 0079.

## In Scope

- Define current-user natural-language authority independently from `$kyw-*` Skill discovery and managed Task dispatch.
- Treat an imperative current-user instruction or an unambiguous reference to one immediately preceding concrete execution proposal as sufficient authority for only the named actions, targets, scope, and current attempt.
- Keep questions, status requests, plans, examples, quotations, Task/Test text, documentation, CI, metadata, inferred intent, and other untrusted content non-authoritative.
- Give an explicit prohibition, cancellation, or scope reduction priority over an older grant; a non-authoritative status question neither grants authority nor silently revokes an already executing authorized attempt.
- Accept a conditional action only when the current user delegates act-now execution and its objective condition is safely verifiable and currently satisfied; otherwise stop without mutation.
- Keep version selection, npm publication, Git tag, GitHub Release, public submission, retry, fallback, force, bypass, account change, and deletion as distinct authority categories unless the user's instruction names them.
- Define combined routed messages so appended Task constraints and action-specific external authority are classified independently rather than forcing all suffix text into one channel.
- Add one bounded executor-to-dispatcher `overrideClassification` handoff so an immutable terminal Task treats an external-action-only suffix as report-only while retaining fail-closed correction routing for a Task override or missing classification.
- Clarify `kyw-impl` routing so ordinary natural-language action commands remain outside its dispatcher and are not redirected to `$kyw-task` merely because they describe a new outcome.
- Synchronize the four permanent documents, the project `AGENTS.md` template, the `kyw-impl` Skill/reference, deterministic foundation ownership, and focused regression tests.

## Out of Scope

- Changing any Skill's `allow_implicit_invocation` policy, adding a Skill, broadening the three managed Task aliases, or making natural-language action commands parse as Task invocations.
- Automatically creating or chaining Task workflows from incidental prose, weakening one-active-Task or immutable-delivery rules, changing parser grammar, queue selection/dependency algorithms, adapter hydration, or adding a deterministic natural-language authority classifier. The only runtime exception is the two-value terminal override-classification handoff named in scope.
- Executing an npm publish, version bump, Git tag, GitHub Release, workflow dispatch/rerun, public submission, force/destructive operation, bypass, branch deletion, or account/security change.
- Changing `$kyw-audit --fix`, `EXPLICIT_REBASELINE`, or another exact workflow-mode selector whose syntax selects a bounded operating mode rather than external-action authority.

## Acceptance Criteria

- [x] AC-01: Durable product truth states that explicit Skill syntax selects a managed workflow but is never an authorization token, and a direct affirmative act-now instruction from the trusted current user independently authorizes its named in-scope action without a special phrase or duplicate confirmation.
- [x] AC-02: Authority is evaluated per action, target, scope, and current attempt; publication, version, tag, Release, retry, fallback, force, bypass, account mutation, deletion, and public submission do not imply one another.
- [x] AC-03: Questions, status requests, plans, unsatisfied/unverifiable conditionals or conditionals without act-now delegation, examples, quotes, Task/Test or documentation prose, CI, metadata, inferred intent, and untrusted content supply no mutation authority; explicit prohibition, cancellation, or scope reduction supersedes an older grant while a status question alone does not.
- [x] AC-04: `$kyw-*` Skills remain explicit-only, the existing Task parser recognizes only its anchored forms, and ordinary publication/version/tag/Release commands neither dispatch a Skill nor receive `$kyw-task` redirection merely for being new outcomes.
- [x] AC-05: `kyw-impl` distinguishes appended Task method/scope overrides from separate current-user external-action authority supplied before, after, or in the same combined message as dispatch; its bounded terminal handoff preserves external-only report mode and fail-closed correction mode without redispatch, automatic chaining, or acceptance/safety waiver.
- [x] AC-06: Root and generated-project instructions, README, SPEC, ARCHITECTURE, `kyw-impl`, and the foundation rule-family registry project one consistent routing-versus-authorization boundary with no duplicated detailed procedure.
- [x] AC-07: Focused scenario tests cover affirmative imperatives, prohibitions/revocation, verifiable and unsatisfied conditionals, status-after-grant, combined routed messages, referential approval, non-authoritative language, action separation, parser non-routing, later authority, and regression of explicit-only Skill metadata and managed aliases.
- [x] AC-08: Final focused, Stable, Release/package, permanent-document, pair, transaction, and diff-coverage checks pass with no external publication or destructive mutation.

## Plan

- [x] Capture the current routing, authority, parser, documentation, package, and permanent-document baselines.
- [x] Update canonical behavior and minimal repository/user/template/architecture projections without changing Skill invocation metadata.
- [x] Narrow the `kyw-impl` new-outcome guidance and execution authority wording, add the bounded terminal-classification handoff, then strengthen deterministic owner and behavioral tests.
- [x] Run focused tests, Stable and Release verification, measure permanent-document deltas, and complete the final scope/coverage audit.
- [x] Re-enter through a valid managed selection, then prepare the terminal repository outcome for ordinary `STANDARD` delivery without performing any external release action.

## Decisions

- Preserve all five explicit-only Skill policies; invocation syntax and mutation authority are orthogonal channels.
- Treat only the latest trusted current-user action request as authority. A referential approval is valid only when the immediately preceding assistant proposal is single, concrete, and fully resolved.
- Scope authority to named action categories and one current attempt. Failure does not authorize retry, fallback, bypass, credential substitution, or guard weakening.
- Keep natural-language external-action commands outside the Task dispatcher instead of weakening its exact grammar.
- Keep natural-language clause classification in the executor; deterministic runtime accepts only `TASK_OVERRIDE_PRESENT` or `NO_TASK_OVERRIDE`, and omission remains fail-closed.

## Risks

- Wording that is too broad could turn status questions or quoted instructions into external mutations.
- Wording that is too narrow could preserve the ceremonial `$kyw-*` or repeated-confirmation failure this Task corrects.
- Mixing Skill routing with authority parsing could weaken exact Task selection or accidentally chain authoring and implementation.
- Trusting an unvalidated terminal classification could misroute a delivered Task, so the handoff has a closed two-value enum and an `UNCLASSIFIED` fail-closed fallback.
- Permanent-document projections can drift or exceed growth policy unless duplicate wording is replaced rather than accumulated.

## Discoveries and Changes

- The observed failure was not an npm or GitHub permission problem: the assistant treated workflow syntax as an authorization prerequisite after the user directly approved named npm and GitHub actions.
- Current product truth separates ordinary prompts from Skill invocation and requires distinct authority for external mutations, but it does not yet state precisely when direct affirmative or referential authority is sufficient.
- The Task parser is correctly anchored and remains unchanged. Final coverage review found that immutable-terminal dispatch nevertheless inferred correction intent from every non-empty transported suffix, so an external-action-only combined message could not reach report-only handling without a bounded executor classification handoff.
- The first managed selection attempt failed read-only because the valid Task 0079 frontier required 525 unique command-cache entries while the default bound was 512.
- The separate bounded repair was merged through PR #66 at main commit `dee58b1d652bd30709a9dd493c7a322563c79d04`; exact PR-head and post-main CI passed with the finite default raised to 1024 and 525-entry plus low-bound regressions.
- The first post-repair managed re-entry stopped read-only because the local `main` ref lagged verified upstream `main`; after proving a clean fast-forward ancestry and aligning the ref to `dee58b1d652bd30709a9dd493c7a322563c79d04`, the next sole dispatch selected `IMPLEMENT`.
- The selected transition updated the fixed-bounded continuity checkpoint exactly once to digest `375df4bc3d59d3eb7035785b22ad67b814d9da74cfd2eed29e187a6c80c44e11` with 46 covered Tasks; no opaque token was retained.
- An independent review of the preserved pre-dispatch draft found unresolved prohibition/revocation, condition-satisfaction, status-after-grant, combined-message classification, projection, and scenario-test gaps. Those findings are inputs to implementation, not completed acceptance evidence.
- Canonical and projected semantics now cover negative imperatives, prohibition/cancellation/revocation/scope reduction, current verified conditions, status lifetime, resolved referential assent, per-action/target/scope/attempt granularity, and one-route combined suffix classification.
- The representative template/Task-Skill/implementation-Skill/execution-reference bundle is 32,765 bytes, below the 32,768-byte target without raising its budget or duplicating the detailed contract outside SPEC and the execution reference.
- A final-review helper accidentally applied unconfigured Prettier defaults to three JavaScript files. The formatter churn was fully removed before final verification; only the reviewed semantic handoff and focused tests remain.
- The earlier draft is preserved only on local branch `wip/0080-pre-dispatch-draft` as comparison evidence and has not been pushed or delivered.

## Documentation Impact

- SPEC: Define the canonical routing-versus-authorization behavior and action/attempt boundaries.
- ARCHITECTURE: Separate Skill/Task routing from the direct current-user authority channel and keep safety gates downstream.
- README: Explain to users that Skill syntax selects workflows but is not required to authorize a direct named action.
- AGENTS: Require direct current-user authority to be honored without ceremonial syntax or reconfirmation while preserving fail-closed boundaries.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Authored and validated the Task/Test scope and dependency on delivered Task 0079.
- Diagnosed the independent hydration-capacity blocker and completed its separately authorized bounded repair through PR #66 with exact-main CI.
- Preserved the unselected earlier draft locally without pushing or claiming Task 0080 implementation.
- The clean-main dispatcher returned `IMPLEMENT` for Task 0080 on branch `task/0080-honor-direct-user-authority`.
- Applied the dispatcher-provided continuity transition exactly once after activating and validating the selected pair.
- Reapplied only the in-scope preserved draft, corrected the documented authority/projection findings, and added executable scenario and parser coverage for the named branches.
- Synchronized SPEC, ARCHITECTURE, README, root/generated AGENTS, `kyw-impl`, and the deterministic foundation rule-family registry while preserving all five explicit-only Skill policies.
- Fully reread the four permanent documents and explicitly rebaselined the pair for the bounded executor-to-terminal classification handoff required by AC-05; parser grammar and queue selection/dependency behavior remain unchanged.
- Removed the accidental whole-file formatter churn, leaving only the reviewed enum, terminal classification, transport fields, and focused tests in the two runtime files and dispatcher suite.
- Corrected the independent authority review findings for terminal cancellation tombstones, same-attempt re-grant rejection, explicit new-attempt allowance, and exact combined-suffix enum transport; the authority re-audit then passed with no remaining AC-05 or SPEC 6.3 finding.
- Completed an independent scope re-audit confirming the bounded runtime diff, unchanged parser/queue/dependency behavior, projection ownership, package scope, and removal of formatter churn with no blocking finding.
- Passed the final 69/69 focused suite and planner-selected `npm run release:ci`: 393 tests (389 pass, 4 explicit skip, 0 fail), lint, format, package selection, and the real 43-file / 135,923-byte candidate with SHA-256 `44c746de3980f3f3213d5c0854743cd05cde70ed2eab41e5ab6be0bf3a449d4a`.

## Remaining

- None — the repository outcome is complete; ordinary `STANDARD` delivery is the separate GitHub gate.

## Resume Point

- None — the repository outcome is complete; delivery continues through the declared `STANDARD` gate.

## Blockers

- None — PR #66 removed the prior hydration-capacity blocker, both final read-only audits passed, and the terminal local verification is green.
