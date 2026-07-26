# TASK 0050 — Reconcile README Release History

<!-- kyw-task-contract: 2 -->

## Status

DONE

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

- [x] AC-01: README no longer states or implies that no fresh re-gate has run; it accurately records Task 0047 historical `READY_FOR_APPROVAL` and Task 0048's audited `UNCHANGED` candidate impact.
- [x] AC-02: README uses stable wording that does not embed a latest exact candidate hash or mutable current readiness verdict and does not require a circular edit after each later re-gate.
- [x] AC-03: Historical readiness, current publication state, and publication authority are clearly distinguished, with no implication that readiness authorizes publication.
- [x] AC-04: README identifies numbered Task/Test artifacts as the authoritative record for exact-byte candidate identities, verdicts, and supersession.
- [x] AC-05: Task 0050 terminal evidence honestly records that its packaged README bytes, together with Task 0049 package-relevant changes, supersede Task 0047's candidate and make Task 0051's fresh re-gate necessary.
- [x] AC-06: No publication, registry mutation, version, tag, GitHub Release, public submission, release command, or Task 0051 implementation occurs.
- [x] AC-07: SPEC, ARCHITECTURE, and AGENTS remain unchanged unless the final README edit reveals a real permanent-truth conflict; any required synchronization is minimal and explained.
- [x] AC-08: Focused documentation tests, formatting, package-boundary verification, canonical validation of every Task pair, whitespace review, and final documentation/scope review pass.

## Plan

- [x] Reconfirm Tasks 0047 and 0048 terminal evidence and isolate the exact stale sentences in README's release/status section.
- [x] Draft one concise durable paragraph that records historical readiness and audit impact while delegating exact-byte current evidence to numbered Task artifacts.
- [x] Preserve the explicit no-publication/no-authority boundary and remove only the stale fresh-gate claim.
- [x] Add or update the smallest existing documentation test for the stable wording and absence of circular/latest-candidate claims.
- [x] Record the post-edit package-byte supersession and Task 0051 dependency in this pair without inserting mutable candidate state into README.
- [x] Review permanent-document impact, run focused documentation checks, format, package boundary, canonical all-Task validation, and final diff/coverage review.
- [x] Finish `DONE/PASSED` only with executed evidence and no release action.

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
- Fresh immutable evidence confirms Task 0047's exact candidate reached `READY_FOR_APPROVAL` only after its authentication blocker cleared, while expressly withholding publication authority; Task 0048 then proved the package-relevant bytes remained `UNCHANGED` at its audited main.
- Canonical exact dispatch selected Task 0050 as `IMPLEMENT` only after fresh GitHub/local evidence satisfied every current-contract `STANDARD` transition from Task 0030 through Task 0049.
- Execution started from clean exact local/cached/live-remote `main` SHA `1ae16f51c23275450d58ff12e2556b0282023bb3`, the Task 0049 merge commit. No Task 0050 branch or PR, Task transaction, tag, GitHub Release, staged path, tracked change, or untracked path existed.
- The branch `task/0050-reconcile-readme-release-history` was created directly from that exact main after the preflight passed.
- The focused current-main documentation baseline passed 10/10 before the README/test edit.
- The README release section now preserves Task 0020 and Tasks 0029/0038, adds only the immutable Task 0047 `READY_FOR_APPROVAL` and Task 0048 `UNCHANGED` facts, delegates exact candidate identities/verdicts/supersession to numbered Task/Test artifacts, and separates exact-byte readiness from publication authority.
- The existing README instruction-surface test gained the smallest focused positive and negative assertions for those stable facts, the evidence owner, the publication boundary, and removal of both stale current-readiness sentences.
- The exact changed-path planner classified the four Task 0050 paths as `STABLE` because README is a package input and required `npm run check`.
- The planner-selected Stable gate passed 288/288 tests, lint over 70 JavaScript modules and foundation metadata, format over 292 UTF-8/LF text files, and package selection over 39 files totaling 93,183 bytes.
- Package-input comparison from Task 0047's source SHA `515a5ff5cc69f4324fcb10e48c7fb9c7f5fd9ca8` to the Task 0049 merge contains only `skills/kyw-task/references/execution.md`; adding the current worktree contains only that file plus `README.md`. Those package-byte changes supersede the Task 0047 candidate and require Task 0051's fresh re-gate.
- All 51 Task/Test pairs passed canonical validation, `git diff --check` passed, and the exact current diff contains only README, this pair, and `test/instruction-surfaces.test.mjs`. Among permanent documents only README changed.
- Package and plugin versions remain `0.1.0`; no tag or GitHub Release exists. No release, candidate, dry-run, registry/auth, isolation, model-backed, publish, version, tag, Release, or public-submission command or mutation ran.
- Two independent read-only final reviews found no historical-evidence error, circular wording, authority ambiguity, scope drift, package-boundary mismatch, uncovered acceptance criterion, unsupported result, or permanent-document conflict.

## Documentation Impact

- SPEC: Unchanged; release evidence identity and separate publication authority already own the durable product requirement.
- ARCHITECTURE: Unchanged; exact candidate, package inclusion, and publication boundaries already own the durable system meaning.
- README: Minimal release/status reconciliation is the primary outcome.
- AGENTS: Unchanged; repository execution and completion rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Read the current Task/Test pair, all four permanent documents, Task 0049 dependency evidence, and the explicitly referenced Task 0047/0048 historical release evidence.
- Reconstructed and validated the full current-contract external delivery ledger through Task 0049, then received canonical `IMPLEMENT` selection for Task 0050.
- Passed the clean exact-main/remote/status/branch/transaction/tag/Release preflight and created the Task branch from SHA `1ae16f51c23275450d58ff12e2556b0282023bb3`.
- Passed the focused 10/10 baseline, applied the minimal README and existing-test assertion change, and passed the same focused group after the edit.
- Ran the exact changed-path planner and its required Stable gate successfully.
- Proved the package-byte supersession boundary, unchanged package/plugin versions, zero tags/Releases, exact four-path scope, README-only permanent-document impact, canonical validity of all 51 pairs, and clean whitespace.
- Completed the exact diff-to-matrix and AC-to-test self-review plus two independent read-only reviews; all found the four-path outcome complete and within scope.

## Remaining

- None — the repository outcome and its local verification evidence are complete; mutable `STANDARD` delivery is evaluated separately.

## Resume Point

- None — no repository work remains; resume only separately tracked `STANDARD` delivery from the exact terminal commit.

## Blockers

- Not applicable — no blocker is known.
