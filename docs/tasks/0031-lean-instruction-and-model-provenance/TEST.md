# TEST 0031 — Lean Instruction Surfaces and Model Provenance
<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- Verification policy: current-session direct and risk-proportionate by default; preserve the configured model and reasoning effort.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active surface did not expose an exact identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user supplied no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active surface did not expose the configured effort)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: the interface did not expose a concrete CLI, IDE, desktop, app, or cloud subtype)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active surface did not expose a version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-07 — Instruction ownership inventory | Map each rule to one canonical source and detect contradictory duplicates. | Static | PASS | `test/instruction-surfaces.test.mjs` owner/projection test passed; root/template routing bullets are equal and Architecture records the authority table. |
| T-02 | AC-02 — Short invocation parity | Run exact and automatic invocation fixtures using only the short user command. | Behavioral | PASS | Existing dispatch fixtures plus the prompt regression passed exact, automatic, managed, portable, incidental-text, confirmation, dependency, and delivery cases without an external procedure prompt. |
| T-03 | AC-03 — Context measurement | Measure the same representative instruction bundle before/after and record byte/token estimates. | Performance | PASS | The automated three-file representative bundle assertion passed at 36,382→34,683 bytes (-1,699; -4.6699%) and 9,096→8,671 estimated tokens (-425). A separate six-stable-path measurement was 169,551→169,221 bytes (-330; -0.1946%) and 42,388→42,306 estimated tokens (-82). The runtime contract remains eight distinct paths and one distinct execution-reference path; current Task/Test evidence growth is excluded from byte deltas. |
| T-04 | AC-04 — Provenance rendering | Verify observable and unavailable model/effort cases serialize honestly. | Unit | PASS | Template-contract tests passed all-observed, all-unavailable, mixed `NOT_REQUESTED`, malformed syntax/basis/value, duplicate/missing/unknown/out-of-order field, and observability/value mismatch cases while preserving unmarked legacy free-form compatibility. |
| T-05 | AC-05 — No model mutation | Assert no code or instruction performs automatic model/effort changes. | Static/behavioral | PASS | Runtime scan found no model/reasoning setting flag or assignment in the Task core/adapter; the canonical reference preserves settings unless the current user overrides. |
| T-06 | AC-06, AC-07 — Semantic contract | Check safety, publication, evidence, and delivery invariants across all retained surfaces. | Regression | PASS | Focused Skill/dispatch/foundation suites passed; detailed safety, evidence, publication, delivery, one-active-Task, create rollback, and DRAFT cancellation assertions remain on their canonical surfaces. |
| T-07 | AC-06 — Stable/package regression | Run full repository and packed Skill checks. | Regression | PASS | Final `npm test` passed 242/242; lint, format, and 29-file package allowlist passed; `npm run release:ci` repeated the stable gates and passed real packed-release isolation at 74,874 bytes, SHA-256 `4f2a334924ec146afa3d388a528cf4dca3521405bf413951945a9ae9901c07a9`. |

## Regression Coverage

- Existing Task artifact and template contracts.
- Existing packed Skill and package allowlist contracts when affected.
- Existing user-work, filesystem, evidence-honesty, and publication boundaries.
- Exact changed behaviors and error paths discovered during implementation.

## Commands

- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory ./docs/tasks/0031-lean-instruction-and-model-provenance` — pre-execution pair validation passed.
- Exact managed dispatch with inline Task 0030 local expectations and GitHub ledger — returned `SELECTED`, `EXACT`, `IMPLEMENT`, and `confirmation: true` for Task 0031.
- Git/GitHub preflight — verified clean `origin/main@9446c22372b5aff95093deb53de79293f49a14cd`, merged PR #16, successful outcome run `30009899722`, and successful merge run `30010099111`.
- Fixed representative bundle measurement over `templates/project/AGENTS.md`, `skills/kyw-task/SKILL.md`, and `skills/kyw-task/references/execution.md` — 36,382→34,683 UTF-8 bytes / 9,096→8,671 estimated tokens; trailing duplicated Skill block baseline 3,021 bytes.
- Separate six-stable-path measurement at `origin/main@9446c22372b5aff95093deb53de79293f49a14cd` versus final worktree — 169,551→169,221 bytes / 42,388→42,306 estimated tokens. The runtime-context audit adds the current pair for eight distinct paths and retains one distinct execution-reference path.
- `node --test test/instruction-surfaces.test.mjs test/template-contracts.test.mjs test/task-artifacts.test.mjs test/task-dispatch.test.mjs test/kyw-task.test.mjs test/foundation.test.mjs` — first run failed 1/44 because one test still required the removed execution boundary on `SKILL.md`; moving that semantic assertion to the canonical reference produced 44/44 PASS.
- `node --test test/template-contracts.test.mjs test/instruction-surfaces.test.mjs` — passed 11/11 after adding provenance error-branch coverage.
- Final focused command over instruction, template, artifact, dispatch, Task, and foundation suites — passed 45/45.
- `npm test` — passed 242/242.
- `npm run lint` — passed 56 JavaScript modules plus foundation metadata.
- `npm run format:check` — passed 240 UTF-8/LF text files.
- `npm run pack:check` — passed 29 files, 74,874 bytes.
- `npm run release:ci` — repeated all stable gates and passed real tarball isolation: 29 files, 74,874 bytes, SHA-256 `4f2a334924ec146afa3d388a528cf4dca3521405bf413951945a9ae9901c07a9`.
- Do not record an unexecuted method as `PASS`.
- Do not change the configured model or reasoning effort unless the user explicitly directs it.

## Results

- Pre-execution validation, exact short dispatch, dependency-delivery preflight, ownership/projection parity, byte/path measurement, short-prompt regression, provenance validation, model-mutation scan, focused suites, full suite, lint, format, package allowlist, and packed-release isolation passed as recorded.
- The only failed focused attempt was the expected stale-location assertion exposed by removing duplicated policy; it was corrected to assert the same invariant on its canonical execution reference.
- Independent contract, measurement, and test-coverage reviews were read-only; every confirmed finding was corrected, and their latest focused rechecks passed 35/35 or 45/45 with no remaining implementation blocker.

## Unverified

- Exact model identifier, reasoning effort, concrete Codex surface, and Codex version are unavailable on this surface and were not inferred.
- Task 0031 publication and mutable GitHub delivery were not authorized or attempted; this pair records the completed repository outcome only, and `STANDARD` remains an external queue-advancement gate.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible and names exact source/package/model provenance where relevant.
- [x] Confirm required regressions actually ran.
- [x] Confirm this pair records repository evidence only and makes no external-delivery claim.
