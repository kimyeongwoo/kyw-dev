# TEST 0050 — Reconcile README Release History

<!-- kyw-task-contract: 2 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially release evidence identity, publication authority, distribution, and documentation consistency.
- Architecture constraints: `../../ARCHITECTURE.md`, especially README ownership, package inclusion, immutable candidate boundaries, and numbered Task evidence.
- Repository rules: `../../../AGENTS.md`.
- Historical evidence inputs: Task 0047 exact-candidate verdict and Task 0048 I-47/F-06/candidate-impact findings.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Requested model alias: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Historical release facts replace the stale claim | Assert README identifies Task 0047 `READY_FOR_APPROVAL`, Task 0048 `UNCHANGED`, and no longer says a fresh full gate has never run. | Documentation/static | TODO | Planned focused README assertion; no documentation test has run. |
| T-02 | AC-02, AC-04 — Stable non-circular evidence wording | Review and test that README delegates exact hashes/current verdicts/supersession to numbered Task artifacts and contains no latest-candidate invariant that must change after every gate. | Documentation/audit | TODO | Planned focused assertion plus manual semantic review. |
| T-03 | AC-03 — Readiness, publication state, and authority separation | Assert the release section keeps no-publication facts and says readiness alone does not authorize publish/tag/Release/submission actions. | Documentation/static | TODO | Planned focused foundation/instruction test. |
| T-04 | AC-05 — Package-byte supersession is recorded honestly | Compare package inclusion and final changed paths; record in this pair that README and Task 0049 package-relevant changes supersede the Task 0047 archive and require Task 0051. | Package/audit | TODO | Planned `npm run pack:check`, `package.json#files` review, and terminal Task/Test evidence review. |
| T-05 | AC-06, AC-07 — No release action and minimal permanent-document scope | Inspect commands, version/tags/Releases/public state, and final diff; require no release command or unrelated permanent-document edit. | Integrity/audit | TODO | Planned before/after Git/publication-state and exact-path review. |
| T-06 | AC-08 — Focused docs, format, package, canonical, and coverage gate | Run planned documentation tests, formatting, package check, every-pair validator, whitespace review, and complete AC-to-test/final-diff mapping. | Focused/package/integrity | TODO | Planned commands below; no PASS is pre-claimed. |

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

## Results

- Not applicable — verification has not run.

## Unverified

- Final README wording, focused tests, package-byte supersession evidence, permanent-document impact, and external `STANDARD` delivery remain unverified until execution.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
