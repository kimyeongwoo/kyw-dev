# TASK 0029 — Full Release Readiness Re-Gate

## Status

IN_PROGRESS

## Goal

Form one immutable `0.1.0` candidate from the integrated Task 0028 mainline, verify that exact candidate through the complete authorized pre-publication release gate, record one evidence-only terminal verdict, and deliver that evidence through exact-head pull-request and post-merge CI without performing any publication action.

## Dependencies

- `origin/main` at `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`, including merged Tasks 0001 through 0028.
- Task 0017 historical grilling evidence and its retained `BLOCKED` verdict.
- Task 0020 historical release-gate evidence and its immutable old-candidate `BLOCKED` verdict.
- Tasks 0021, 0023, 0024, and 0025 remediation and deterministic safety evidence.
- Task 0027 direct SPEC AC-04 through AC-08 behavioral evidence, subject to candidate relevant-byte identity.
- Task 0028 evaluator-cleanup determinism and exact integrated CI evidence.
- Current official OpenAI Codex Plugin and Skill requirements and the currently installed Codex CLI.

## In Scope

- Exact local and remote collision/drift preflight and one normal non-force fetch.
- One Task branch and this atomic Task/Test pair.
- One immutable candidate commit containing only this initial pair and a terminal-outcome-safe README status reconciliation.
- One normal candidate push, one detached exact-SHA worktree, fresh exact-candidate manual hosted CI, stable source verification, and one real unpublished tarball.
- Separate SPEC §15 AC-01 through AC-12 evidence, including byte-identity carry-forward only where authorized.
- Direct current-session audit and grilling contract evidence, deterministic regression evidence, lifecycle and filesystem safety, registry read-only checks, current official-requirements verification, and protected-state attribution.
- One evidence-only terminal commit, candidate/evidence package-identity proof, one non-draft PR, exact-head PR CI, expected-head merge commit, and exact-merge post-merge main CI.
- Publication, tag, release, download-verification, and rollback commands as planning text only if the verdict reaches `READY_FOR_APPROVAL`.

## Out of Scope

- Any product, Skill, test, workflow, package, or configuration repair.
- Resuming or rewriting Task 0020, or modifying Tasks 0017, 0020, 0026, 0027, or 0028.
- Creating Task 0030 or selecting another Task number.
- A new model cohort, nested `codex exec`, or subagent orchestration merely for independence.
- Selective stochastic retries, changed scenarios/rubrics/thresholds/graders/baselines, or weakened requirements.
- `npm publish`, publication dry-run, `npm run release:check`, registry mutation, a Git tag, a GitHub Release, public plugin submission, or any existing Actions-run rerun.
- Candidate amend, rebase, squash, force push, reset, clean, stash, or branch deletion.

## Acceptance Criteria

- [ ] AC-01: The exact candidate tarball contains only the approved release allowlist, with every packed byte attributable to the immutable candidate.
- [ ] AC-02: The exact candidate installs in isolated user scope, exposes exactly four byte-matching Skills with ownership metadata, and preserves unrelated state.
- [ ] AC-03: The exact candidate installs only in a fresh isolated project scope, exposes exactly four project Skills without user leakage, and preserves existing project files.
- [ ] AC-04: The Task 0027 empty-project initialization behavior remains directly verified for the candidate by exact relevant-byte identity.
- [ ] AC-05: The Task 0027 existing-project adoption behavior remains directly verified for the candidate by exact relevant-byte identity.
- [ ] AC-06: The Task 0027 one-Task authoring and execution behavior remains directly verified for the candidate by exact relevant-byte identity.
- [ ] AC-07: The Task 0027 multi-outcome narrowing and one-Task-at-a-time behavior remains directly verified for the candidate by exact relevant-byte identity.
- [ ] AC-08: The Task 0027 audit and ordinary-prompt routing behavior remains directly verified for the candidate by exact relevant-byte identity.
- [ ] AC-09: Packed `$kyw-audit` directly blocks stale permanent documentation and unsupported PASS evidence without mutation, and exact `--fix` performs only planned bounded repairs with rerun evidence.
- [ ] AC-10: Exact packed install, doctor, update, uninstall, recovery, ownership, duplicate, modified/missing/unknown-file, containment, link/junction, and unsupported-type behavior fails closed and preserves unrelated state.
- [ ] AC-11: The exact candidate completes the isolated local `./` marketplace add/discover/install/list/remove lifecycle with exactly four byte-matching packaged Skills and no normal Codex/plugin-state mutation.
- [ ] AC-12: The unpublished candidate contains the required MIT and third-party licensing bytes; the actually published-tarball check remains explicitly pending.
- [ ] AC-13: The immutable candidate passes all stable source commands and one fresh attempt-1 exact-SHA manual CI run with all nine required jobs successful and no capability skip.
- [ ] AC-14: Current official requirements, public-registry name availability, credential prerequisite state, and protected-state before/after evidence support a pre-publication verdict without an unexplained mutation.
- [ ] AC-15: The terminal evidence commit changes only this Task/Test pair and produces a package byte-identical to the immutable candidate.
- [ ] AC-16: One non-draft expected-base PR receives 9/9 exact-head CI, merges with expected-head protection as a merge commit, and its exact merge commit receives 9/9 post-merge main CI while retaining candidate-identical package bytes.

## Plan

- [x] Revalidate the exact starting checkout, remote objects, PR #13, its two expected CI runs, and all collision/drift categories before mutation.
- [x] Read permanent truth, historical gate evidence, current remediation evidence, and implementation/verification surfaces.
- [x] Create this exact branch from the expected `origin/main` and publish the initial Task/Test states locally.
- [ ] Reconcile README without making a provisional terminal claim; validate and commit the immutable candidate.
- [ ] Push the exact candidate, create the detached isolated verification worktree, and capture protected-state baselines and tool identities.
- [ ] Dispatch and inspect one fresh exact-candidate hosted CI run while completing all authorized local gates.
- [ ] Determine `READY_FOR_APPROVAL` or `BLOCKED` without fixing any discovered release defect.
- [ ] Record terminal evidence only in this pair, prove package identity, and create/push Commit B.
- [ ] Complete non-draft PR, exact-head CI, expected-head merge, post-merge CI, cleanup, and final integrity review.

## Decisions

- Commit A is immutable once pushed; all release evidence names its exact SHA.
- Commit B is terminal evidence only and may change only this Task/Test pair.
- Task 0020 remains historical `BLOCKED` evidence for its old candidate and is not resumed.
- Task 0027 evidence is carried forward only if every candidate byte relevant to S-01 through S-06 is exactly equal.
- Audit and grilling behavioral checks performed here are labeled `CURRENT_SESSION_DIRECT`, never independent/cohort/hosted model evidence.
- Task 0017's failed cohort remains visible historical evidence; any available later Task 0020 comparison is supplementary only.
- A gate defect is preserved and mapped to a blocked criterion; Task 0029 performs no repair.
- AC-12 can reach only `PREPUBLICATION_CANDIDATE_PASS` with `PUBLISHED_TARBALL_CHECK_PENDING`; success therefore means `READY_FOR_APPROVAL`, not published-MVP acceptance.

## Risks

- Hosted CI, current official requirements, or registry-name state can drift after candidate formation.
- Normal Codex state may change concurrently; attribution must distinguish `AMBIENT_STATE_CHANGED` from a kyw-dev isolation violation and may use only the runner's bounded built-in retry.
- Windows native junction and evaluator-process timing behavior must be observed as real execution rather than a passing capability skip.
- README changes alter the package identity relative to Task 0027 even when all scenario-relevant bytes remain identical.
- Post-merge CI failure is terminal delivery evidence and is not authorized for rerun or follow-on repair in this Task.

## Discoveries and Changes

- Exact preflight found the expected clean Task 0028 checkout, exact local/remote SHAs, merged PR #13, both named 9/9 successful runs, and no later unexpected commit, PR, Actions run, branch, tag, release, Task 0029 collision, or user work.
- The deterministic Task adapter normalized the display title `Re-Gate` to `re-gate`; before any commit, its newly created two-file directory was identity-checked and moved to the user-required exact `0029-full-release-readiness-regate` path. No alternate Task ID was allocated.
- The first pair validation rejected per-row `RUNNING` states and one compound AC-04-through-AC-08 matrix reference. Before candidate formation, the matrix was reconciled to allowed `TODO` row states with one explicit row per SPEC criterion; the top-level Test state remains `RUNNING`.

## Documentation Impact

- SPEC: No product requirement changes; verify the existing §15 criteria separately.
- ARCHITECTURE: No component, boundary, dependency, data-flow, storage, or distribution change is authorized.
- README: Reconcile only the current evidence authority and pre-publication status without claiming a provisional PASS.
- AGENTS: No repository-wide workflow or completion-rule change.

## Completed

- Exact preflight and required source/evidence review.
- Exact Task branch and initial Task/Test pair creation.

## Remaining

- Candidate README reconciliation, validation, Commit A, exact push, all local/hosted gates, terminal evidence, Commit B, PR/merge/post-merge lifecycle, cleanup, and terminal report.

## Resume Point

Review and validate the three-file Commit A scope, then create `chore: form 0.1.0 release candidate` without amending it later.

## Blockers

- None known.

## Final Result

PENDING
