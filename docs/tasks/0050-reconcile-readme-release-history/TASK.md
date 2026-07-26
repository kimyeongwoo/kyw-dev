# TASK 0050 — Reconcile README Release History

<!-- kyw-task-contract: 2 -->

## Status

READY

## Goal

Reconcile the README release/status wording with Tasks 0047 and 0048 using stable historical and authority language that does not require another README edit whenever a later exact-byte release candidate is gated.

## Dependencies

- Task 0049.

## In Scope

- Make the smallest necessary edit to the README release/status section.
- State accurately that Task 0047's exact historical candidate received `READY_FOR_APPROVAL` and that Task 0048 found its package-relevant bytes `UNCHANGED` at the audited point.
- Separate exact-candidate readiness from publication permission and authority.
- Preserve the current fact that no npm publication, version change, Git tag, GitHub Release, or public plugin submission has occurred.
- Avoid presenting a latest candidate hash, mutable current verdict, or a claim that a fresh gate has never run as permanent README truth.
- Direct readers to numbered Task/Test artifacts as the authoritative exact-byte release evidence.
- Record in this Task/Test evidence that README is part of the npm package, so the completed Tasks 0049–0050 package bytes supersede the Task 0047 candidate and require the dependent Task 0051 re-gate.
- Add or update only the smallest focused documentation assertion needed to prevent the stale or circular wording from returning.
- Review SPEC and ARCHITECTURE and change them only if their existing permanent meaning actually changes.

## Out of Scope

- npm publication, registry mutation, package version change, Git tag, GitHub Release, or public plugin submission.
- Running any release, candidate, dry-run, registry/auth, isolation, or model-backed command.
- A release-history permanent document, changelog framework, latest-candidate dashboard, or mutable status file.
- Implementing or executing Task 0051.
- Rewriting unrelated README installation, usage, development, or repository-map content.

## Acceptance Criteria

- [ ] AC-01: README no longer states or implies that no fresh re-gate has run; it accurately records Task 0047 historical `READY_FOR_APPROVAL` and Task 0048's audited `UNCHANGED` candidate impact.
- [ ] AC-02: README uses stable wording that does not embed a latest exact candidate hash or mutable current readiness verdict and does not require a circular edit after each later re-gate.
- [ ] AC-03: Historical readiness, current publication state, and publication authority are clearly distinguished, with no implication that readiness authorizes publication.
- [ ] AC-04: README identifies numbered Task/Test artifacts as the authoritative record for exact-byte candidate identities, verdicts, and supersession.
- [ ] AC-05: Task 0050 terminal evidence honestly records that its packaged README bytes, together with Task 0049 package-relevant changes, supersede Task 0047's candidate and make Task 0051's fresh re-gate necessary.
- [ ] AC-06: No publication, registry mutation, version, tag, GitHub Release, public submission, release command, or Task 0051 implementation occurs.
- [ ] AC-07: SPEC, ARCHITECTURE, and AGENTS remain unchanged unless the final README edit reveals a real permanent-truth conflict; any required synchronization is minimal and explained.
- [ ] AC-08: Focused documentation tests, formatting, package-boundary verification, canonical validation of every Task pair, whitespace review, and final documentation/scope review pass.

## Plan

- [ ] Reconfirm Tasks 0047 and 0048 terminal evidence and isolate the exact stale sentences in README's release/status section.
- [ ] Draft one concise durable paragraph that records historical readiness and audit impact while delegating exact-byte current evidence to numbered Task artifacts.
- [ ] Preserve the explicit no-publication/no-authority boundary and remove only the stale fresh-gate claim.
- [ ] Add or update the smallest existing documentation test for the stable wording and absence of circular/latest-candidate claims.
- [ ] Record the post-edit package-byte supersession and Task 0051 dependency in this pair without inserting mutable candidate state into README.
- [ ] Review permanent-document impact, run focused documentation checks, format, package boundary, canonical all-Task validation, and final diff/coverage review.
- [ ] Finish `DONE/PASSED` only with executed evidence and no release action.

## Decisions

- README is a durable user-facing summary, not the exact-candidate ledger.
- Task 0047 and Task 0048 may be named as immutable historical facts; exact SHA, archive hash, and future mutable verdicts stay in numbered Task/Test artifacts.
- README will describe publication authority as a separate explicit approval boundary regardless of any candidate's readiness verdict.
- Supersession caused by this packaged README edit is recorded in Task 0050 evidence, not as wording that would become stale immediately after Task 0051.
- Task 0051 owns the next candidate gate and remains unimplemented in this Task.

## Risks

- Saying only that current bytes are not approved would recreate the same drift after Task 0051; wording must explain the evidence model rather than freeze a transient state.
- Overstating Task 0047 could imply publish authority; the exact-candidate and publication boundaries must remain separate.
- Updating README changes npm package bytes even when no runtime code changes; failing to record supersession would make the next candidate claim dishonest.
- Broad README edits could obscure the narrowly confirmed documentation drift and create unrelated review noise.

## Discoveries and Changes

- Task 0048 classified README freshness as `DOCUMENTATION_DRIFT`, F-06 as `PARTIAL`, and Task 0047 candidate impact as `UNCHANGED` through the audited main.
- `package.json#files` includes `README.md`; therefore the authorized README edit will be package-relevant even though it changes no runtime behavior.
- No documentation edit or verification command has run for this Task; these are authoring facts, not completion evidence.

## Documentation Impact

- SPEC: Expected unchanged; release and publication requirements already separate readiness from authority.
- ARCHITECTURE: Expected unchanged; exact candidate and publication boundaries are already authoritative.
- README: Minimal release/status reconciliation is the primary outcome.
- AGENTS: Expected unchanged; repository execution and completion rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Apply the minimal README/test change, record candidate supersession, run every planned check, review permanent truth and final scope, and capture terminal evidence.

## Resume Point

- Begin by comparing the current README release/status paragraph with the immutable Task 0047 verdict and Task 0048 candidate-impact finding, then draft stable non-circular wording.

## Blockers

- Not applicable — no blocker is known.
