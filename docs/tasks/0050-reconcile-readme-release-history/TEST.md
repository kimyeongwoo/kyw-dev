# TEST 0050 — Reconcile README Release History

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially release evidence identity, publication authority, distribution, and documentation consistency.
- Architecture constraints: `../../ARCHITECTURE.md`, especially README ownership, package inclusion, immutable candidate boundaries, and numbered Task evidence.
- Repository rules: `../../../AGENTS.md`.
- Historical evidence inputs: Task 0047 exact-candidate verdict and Task 0048 I-47/F-06/candidate-impact findings.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose an exact model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose the configured effort)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: the active surface does not expose a concrete CLI, IDE, or desktop identifier)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active surface version is not exposed)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Historical release facts replace the stale claim | Assert README identifies Task 0047 `READY_FOR_APPROVAL`, Task 0048 `UNCHANGED`, and no longer says a fresh full gate has never run. | Documentation/static | PASS | Focused baseline and post-edit groups each passed 10/10; the updated assertion requires both historical facts and rejects both stale current-readiness sentences. |
| T-02 | AC-02, AC-04 — Stable non-circular evidence wording | Review and test that README delegates exact hashes/current verdicts/supersession to numbered Task artifacts and contains no latest-candidate invariant that must change after every gate. | Documentation/audit | PASS | README embeds no candidate SHA or current readiness verdict and explicitly makes numbered Task/Test artifacts authoritative for exact identities, verdicts, and supersession. |
| T-03 | AC-03 — Readiness, publication state, and authority separation | Assert the release section keeps no-publication facts and says readiness alone does not authorize publish/tag/Release/submission actions. | Documentation/static | PASS | The focused assertion requires the unchanged publication-state boundary and the new exact-byte readiness/non-authority sentence; the post-edit group and full suite passed. |
| T-04 | AC-05 — Package-byte supersession is recorded honestly | Compare package inclusion and final changed paths; record in this pair that README and Task 0049 package-relevant changes supersede the Task 0047 archive and require Task 0051. | Package/audit | PASS | `pack:check` passed 39 files/93,183 bytes; candidate-to-Task-0049 package delta is only execution guidance, and the current package delta adds only README, so Task 0051 must re-gate the superseding bytes. |
| T-05 | AC-06, AC-07 — No release action and minimal permanent-document scope | Inspect commands, version/tags/Releases/public state, and final diff; require no release command or unrelated permanent-document edit. | Integrity/audit | PASS | Exact scope has four paths and README is the only permanent document; versions remain `0.1.0`, tags/Releases remain absent, and no forbidden release/public mutation command ran. |
| T-06 | AC-08 — Focused docs, format, package, canonical, and coverage gate | Run planned documentation tests, formatting, package check, every-pair validator, whitespace review, and complete AC-to-test/final-diff mapping. | Focused/package/integrity | PASS | Focused checks passed 10/10; Stable passed 288/288 plus lint/format/pack; all 51 pairs and whitespace passed; exact four-path diff and complete AC mapping passed two independent final reviews. |

## Regression Coverage

- README continues to state the usable pre-publication installation sources accurately.
- Version `0.1.0`, no-publication state, separate publication authority, licensing warning, repository links, and all unrelated installation/development guidance remain intact.
- SPEC and ARCHITECTURE exact-candidate/publication boundaries remain authoritative and are not duplicated into a mutable README ledger.
- Package allowlist continues to include the final README and exclude numbered Task artifacts.
- No Task 0051 gate, release command, or public mutation occurs.

## Commands

- Planned change classifier: `npm run verify:plan -- README.md`.
- Planned focused documentation checks: `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs`.
- Planned formatting gate: `npm run format:check`.
- Planned package-boundary gate: `npm run pack:check`.
- Planned canonical audit: run `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <each docs/tasks/NNNN-* directory>` for every Task directory and fail on the first nonzero exit.
- Planned integrity review: `git diff --check`, exact changed-path and package-input comparison, release-action absence review, and complete AC-to-test/final-diff mapping.
- Forbidden and not run during authoring or execution: all release, dry-run, registry/auth, isolation, model-backed, publish, version, tag, GitHub Release, and public-submission commands.
- Ran canonical current-pair validation after activation — exit 0, `valid: true`.
- Ran focused baseline: `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs` — exit 0, 10 passed, 0 failed.
- Ran exact current-path planner: `npm run verify:plan -- README.md test/instruction-surfaces.test.mjs docs/tasks/0050-reconcile-readme-release-history/TASK.md docs/tasks/0050-reconcile-readme-release-history/TEST.md` — exit 0, `STABLE`, required `npm run check`.
- Reran focused documentation checks after the README/test edit — exit 0, 10 passed, 0 failed.
- Ran `npm run check` — exit 0: `npm test` passed 288/288; lint passed 70 JavaScript modules and foundation metadata; format passed 292 UTF-8/LF text files; `pack:check` passed 39 files totaling 93,183 bytes.
- Ran canonical validation for every `docs/tasks/NNNN-*` directory — exit 0 for all 51 pairs.
- Ran `git diff --check` — exit 0.
- Ran exact changed-path, permanent-document, package-input, version, tag, and GitHub Release review — exit 0 with exactly four Task 0050 paths; only README changed among permanent documents; Task 0047 candidate-to-current package delta is only Task 0049 execution guidance plus Task 0050 README; package/plugin remain `0.1.0`; tag and Release counts remain zero.
- After synchronizing `DONE/PASSED`, reran the focused documentation group, format, canonical validation of all 51 pairs, `git diff --check`, and exact four-path inventory — exit 0 throughout; focused tests passed 10/10 and format passed all 292 files.

## Results

- Fresh selection/preflight evidence passed at exact local/cached/live-remote main SHA `1ae16f51c23275450d58ff12e2556b0282023bb3` with a clean worktree, no prior Task 0050 branch/PR, no Task transaction, no tag, and no GitHub Release.
- The exact README change removes the stale no-fresh-gate/current-readiness claims, retains Tasks 0020/0029/0038, adds immutable Task 0047/0048 facts, delegates mutable exact-byte evidence to numbered pairs, and expressly denies publication authority.
- Focused documentation checks passed before and after the edit; the planner-required Stable composite passed all tests, lint, format, and package selection.
- Candidate comparison proves the Task 0049 packaged execution guidance and Task 0050 packaged README supersede Task 0047's exact archive, so Task 0051 must form and gate a fresh candidate.
- Canonical, whitespace, exact-scope, permanent-document, package/version, and public-state reviews passed without any forbidden command or mutation.
- Two independent read-only final reviews found all AC-01 through AC-08 evidence covered with no stale release fact, circular mutable claim, authority ambiguity, scope drift, package mismatch, unsupported PASS, or permanent-document conflict.

## Unverified

- No repository acceptance remains unverified.
- External exact-head PR and post-merge `main` `STANDARD` delivery remain mutable ledger state and are not pre-claimed in this repository-local snapshot.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
