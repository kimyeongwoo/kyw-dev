# TASK 0049 — Formalize Cumulative Completed-Outcome Retention

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Create an explicit cumulative retention contract between release-critical completed outcomes and their existing direct tests, without reimplementing those behavioral tests, and strengthen refactor execution guidance so later work cannot silently restore current-main behavior and tests from an older repository state.

## Dependencies

- Task 0048.

## In Scope

- Add one compact deterministic test-only registry, proposed as `test/completed-outcome-retention.json`, and one focused validator test, proposed as `test/completed-outcome-retention.test.mjs`.
- Give every retained outcome a stable identifier and map it to the exact current test file and test-case name that directly protects it.
- Retain mappings for truthful current Task terminal verdicts; strict current dependency grammar; ownership-safe Task transaction and recovery; exact-SHA `main` CI preservation; immutable Action pins; the Task core facade/module inventory; and the installer core facade/module inventory.
- Verify the registered direct tests still exist and remain in the ordinary hosted-CI execution chain through `.github/workflows/ci.yml`, `npm test`, and the package test script.
- Reuse existing direct assertions; add assertions only for the registry contract and its CI/test-discovery linkage.
- Add a focused negative case proving that removal or renaming of one registered critical path, test case, or required contract makes the retention validator fail.
- Strengthen `skills/kyw-task/references/execution.md` so a refactor or large-file extraction starts from the current exact-main baseline, records branch-base SHA, PR-base SHA, and the immediately pre-merge `main` SHA, checks critical-path upstream movement, and stops for reconciliation when those identities drift.
- State that stale branch snapshots, old whole-file copies, and broad cherry-picks are evidence only and must not be used as the current implementation source.
- Add the smallest focused instruction-surface regression needed for the new refactor rule.
- Synchronize existing permanent documents only where the new stable validation or execution boundary changes their meaning.

## Out of Scope

- Product fixes for F-01 through F-04 or any product/runtime behavior change.
- Reimplementation or bulk duplication of the existing direct behavioral tests.
- Dynamic parsing of historical numbered Task Markdown at runtime or test time.
- A generic policy engine, evaluator platform, provider abstraction, model-backed test, daemon, watcher, database, or dependency-injection framework.
- Restoring or rewriting the current queue, transaction, CI, Task-core, installer-core, or module implementation.
- A new permanent document, production dependency, release command, publication action, or Task 0050 implementation.

## Acceptance Criteria

- [x] AC-01: A small, deterministic, human-reviewable retention registry contains stable identifiers and exact current file/test-case mappings for all seven named critical outcomes.
- [x] AC-02: The retention check proves every registered direct test exists and is included in ordinary CI through the current `npm test` chain.
- [x] AC-03: The contract reuses direct tests, dynamically interprets no historical Task Markdown, and adds no duplicate behavioral implementation or production/runtime dependency.
- [x] AC-04: A focused negative test proves that removing or renaming a registered critical test path, case name, or required CI linkage fails the retention check.
- [x] AC-05: Refactor execution guidance requires a current exact-main baseline, branch-base SHA, PR-base SHA, immediately pre-merge `main` SHA, and a critical-path upstream-movement check with a stop-and-reconcile rule.
- [x] AC-06: The guidance rejects stale branch snapshots, old whole-file copies, and broad cherry-picks as current implementation sources while permitting them as bounded comparison evidence.
- [x] AC-07: Existing product/runtime behavior, direct behavioral assertions, public facades, package identity, and dependency set remain unchanged except for the explicit test-only contract and procedural guidance.
- [x] AC-08: SPEC, ARCHITECTURE, README, and AGENTS impact is reviewed; only an existing owner whose durable meaning changed is minimally synchronized, and no new permanent document is created.
- [x] AC-09: Focused retention/instruction tests, every registered direct test file, full Stable verification including package boundary, canonical validation of every Task pair, whitespace review, and final scope-to-test review pass.

## Plan

- [x] Fix the seven stable outcome identifiers and their exact current test file/test-case mappings from Task 0048 evidence and current-main tests.
- [x] Implement the minimal sorted schema-v1 test-only registry and a dependency-free validator inside the test boundary.
- [x] Validate path containment, unique identifiers, exact test declarations, and the `.github/workflows/ci.yml` to `npm test` to `node --test` inclusion chain.
- [x] Add an in-memory or temporary-fixture negative mutation that removes one registered path/case/linkage and must fail without changing repository source files.
- [x] Update the canonical Task execution reference with exact-main extraction, SHA capture, upstream-drift stop, and stale-snapshot prohibitions.
- [x] Add the smallest instruction-surface assertion and make any required minimal Architecture synchronization; leave unaffected permanent documents byte-unchanged.
- [x] Run focused checks, all registered direct tests, `npm run check`, canonical all-Task validation, and final diff/coverage review.
- [x] Record only executed evidence and finish `DONE/PASSED` only when every mapped requirement is proven.

## Decisions

- The registry is test-only static data with stable outcome IDs and exact current test locators; it is not a runtime policy engine.
- Exact test-case names are deliberate contract keys. A legitimate rename updates the direct test and registry together in one reviewed change.
- Current direct tests remain the behavioral authority. The new validator checks retention and CI reachability, not the same behavior a second time.
- Historical Task pairs are authoritative evidence inputs for why an outcome matters, but the validator does not parse them dynamically.
- `skills/kyw-task/references/execution.md` owns detailed refactor execution procedure; root `AGENTS.md` stays thin unless a repository-wide invariant truly changes.
- Refactor source is the verified current exact-main tree. Historical branches, snapshots, and commits may explain a delta but may not replace then-current files wholesale.

## Risks

- Brittle text matching could make harmless test formatting changes noisy; the contract should match exact Node test declarations with a deliberately narrow deterministic parser and clear diagnostics.
- An overly broad registry would become an unreviewable policy catalog; only the seven audited release-critical outcomes belong in this Task.
- Checking file existence without CI reachability would preserve dead tests; the validator must prove both declaration and current CI discovery linkage.
- Refactor guidance can become redundant or conflicting if placed outside its canonical execution owner; instruction-surface tests must preserve one authority chain.
- A package-relevant Skill guidance change supersedes prior candidate bytes and must remain visible to the later release re-gate without running a release command here.

## Discoveries and Changes

- Task 0048 is the authoritative audit input: F-01 through F-04 are `NOT_CONFIRMED`; F-05 is `PARTIAL` because direct tests run in CI but no independent retention/refactor contract exists; F-06 is `PARTIAL`; and no product regression is confirmed.
- Current direct test declarations already cover every named outcome in `test/task-dispatch.test.mjs`, `test/task-artifacts.test.mjs`, `test/continuous-integration.test.mjs`, and `test/skill-installation.test.mjs`.
- Fresh preflight found local `main`, direct remote `main`, and the latest successful `main` CI at exact SHA `d0793d16d2c860f61da9ba1052f8b9d0433443e1`; all prior current-contract STANDARD deliveries through Task 0048 were revalidated before selection.
- The Task branch `task/0049-formalize-cumulative-completed-outcome-retention` was created directly from that exact current-main SHA after proving no same-named local or remote branch existed.
- A read-only independent mapping review confirmed seven stable outcome IDs and 13 exact direct-test locators across the four audited files; composite transaction and facade/module outcomes retain several locators without copying assertions.
- The first focused validator run failed because the Windows repository URL retained a trailing separator and the containment check constructed a double separator. Normalizing the root once with `path.resolve` fixed that test-only bug; the failure remains recorded in `TEST.md`.
- Read-only validator-design and instruction-owner reviews confirmed the registry belongs wholly in the development test boundary and the refactor rule belongs only in the packaged execution reference. The latter also identified the existing representative-instruction size gate, so redundant authority/reconfirmation prose was compacted while preserving its tested semantics.
- The repository planner classified the five implementation/documentation paths as `STABLE`; the current Task already requires `npm run check` plus hosted exact-SHA Stable delivery.
- The planner-selected `npm run check` reached the format stage after `npm test` passed 288/288 and lint passed, then failed because the pre-created future Task 0050 and 0051 `TASK.md`/`TEST.md` files lack final newlines. `pack:check` did not run. Those four files are outside Task 0049's mutation boundary, so the required Stable gate cannot be completed safely in this execution.
- Because those four future Task artifacts were outside Task 0049's original mutation boundary, execution stopped without editing them and retained the exact failed-format evidence instead of expanding scope automatically.
- The user separately approved an exact four-path, one-final-LF-only queue-artifact hygiene exception after a fresh read-only branch, remote, changed-path, filesystem identity, content, status, canonical, and format preflight. This exception does not implement or activate Task 0050 or Task 0051.

| Future artifact | Before bytes / SHA-256 | After bytes / SHA-256 | Delta |
|---|---|---|---:|
| `docs/tasks/0050-reconcile-readme-release-history/TASK.md` | `7055` / `f6029ae647d2afd036b1c55eb95757b099507714904583e85780c858b40d6551` | `7056` / `72fa3ccb4ca583cef6e5f66756fbe03c06a190f84ef56a8f84cefcfc9f139ab2` | `+1` |
| `docs/tasks/0050-reconcile-readme-release-history/TEST.md` | `5018` / `16e3f4d4b4b196150518b99002674a626023942cdec41c36998749536fe26412` | `5019` / `feb8c1e8b378985da9270184c782ee0924dd364a4f8f393b02ee8b18242695a8` | `+1` |
| `docs/tasks/0051-post-documentation-release-readiness-re-gate/TASK.md` | `10158` / `6fb98dd8782cbdc679badabc8a89220e3fbb43ed72946ef0b7d88015f9abd905` | `10159` / `8f5de2d464d3ee09da0dc2014582c28289ea639955c1ece301583d0b47937226` | `+1` |
| `docs/tasks/0051-post-documentation-release-readiness-re-gate/TEST.md` | `8469` / `d8f6925f9cdd74fa27d00ef79c60c80cf0ffbebef613ae627d33ee6920c8a3ef` | `8470` / `b6f7f3ace29c7091626f0bb143be53d60bd76936d673ae5fca525f79689f8e29` | `+1` |

- For every row, the complete after-file prefix excluding its final byte hashes to the before SHA-256 and the new final byte is exactly LF (`0x0a`), proving that no earlier byte changed. Both future pairs remain canonically valid `READY/READY` with unchanged semantic content, dependencies, acceptance criteria, and unchecked execution evidence.
- The post-normalization `npm run format:check` passed all 292 UTF-8/LF text files, so the recorded four-path format blocker is cleared and this pair returned to the ordinary resume lifecycle.
- The current 11-path planner invocation selected `STABLE` and required `npm run check`; the final composite passed `npm test` 288/288, lint over 70 JavaScript modules and foundation metadata, format over 292 UTF-8/LF text files, and package selection over 39 files totaling 93055 bytes.
- Post-normalization focused retention/instruction verification passed 25/25 and all four registered direct-test files passed 93/93. Canonical validation passed for all 51 Task/Test pairs, and `git diff --check` passed.
- Final scope review found exactly 11 expected paths: five Task 0049 implementation/verification paths, the Task 0049 evidence pair, and four preserved future-pair artifacts whose only Task 0049-owned delta is the approved final LF byte. No generated, staged, or out-of-scope path appeared.
- The registered direct-test files, `package.json`, dependency metadata, runtime source, workflow, manifests, and public facades remain byte-unchanged. The registry and validator have no production reference or historical Task-Markdown parser; the only package-relevant change is the intended execution guidance.
- Two independent read-only final reviews checked artifact identity/package scope and full acceptance-to-test coverage. Both found no scope drift, uncovered implementation branch, unsupported PASS evidence, or permanent-document conflict.

## Documentation Impact

- SPEC: Unchanged because no user-visible product behavior, business rule, or acceptance requirement changed.
- ARCHITECTURE: Updated minimally with the test-only retention boundary and canonical current-main/refactor identity rule.
- README: Unchanged because release-history reconciliation belongs to dependent Task 0050.
- AGENTS: Unchanged because the detailed selected-Task execution procedure belongs in the packaged execution reference and no repository-wide invariant changed.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Read the current Task/Test pair, all four permanent documents, Task 0048 audit evidence, and the relevant current-main CI, package-script, and direct-test declarations.
- Revalidated the complete acceptance-to-test mapping, canonical pair shape, transaction-free queue, prior delivery ledger, exact main identity, and Task-branch ownership before activation.
- Ran the exact four-file current-main direct-test baseline at branch base `d0793d16d2c860f61da9ba1052f8b9d0433443e1`; all 93 tests passed.
- Added the sorted schema-v1 test-only registry and dependency-free validator for all seven outcomes and 13 exact direct-test declarations.
- Proved the validator fails when the `task-current-terminal-verdicts` mapping is removed in memory; after the Windows path fix, both focused positive and negative cases passed.
- Added the current exact-main, `branch-base`, `PR-base`, immediately pre-merge `main`, critical-path drift, and historical-evidence-only rules to the canonical execution reference; the focused instruction/retention group passed 25/25 without raising the instruction-size baseline.
- Ran the planner-selected Stable command through its first failing boundary: the complete test suite passed 288/288 and lint passed before format failed on four out-of-scope future Task artifacts.
- Re-preflighted the exact branch/HEAD/local and live remote main identities, complete changed-path set, future-pair filesystem ownership/type/link state, `READY/READY` status, canonical validity, and the exact four-only format failure before applying the separately approved hygiene exception.
- Added exactly one final LF byte to each approved future artifact; byte-prefix comparison proved the four original hashes were otherwise unchanged, every size delta was `+1`, and the expected post-hashes matched.
- Confirmed both future pairs remain semantically unchanged `READY/READY` and reran `npm run format:check` successfully over all 292 text files.
- Reran the focused retention/instruction group successfully at 25/25 and all four registered direct regression files successfully at 93/93.
- Passed the current 11-path `STABLE` plan through `npm run check`: 288/288 tests, lint, 292-file format, and 39-file package selection all succeeded.
- Passed canonical validation for all 51 Task/Test pairs, `git diff --check`, exact 11-path inventory, package/dependency/direct-test immutability checks, and the complete diff-to-matrix and acceptance-to-test self-review.
- Confirmed the final implementation adds no production dependency, runtime import, historical Task parser, duplicate behavioral assertion, release action, publication mutation, or uncovered meaningful branch.

## Remaining

- None — the repository outcome and its verification evidence are complete; mutable `STANDARD` delivery is evaluated separately from this pair.

## Resume Point

- None — no repository work remains; resume only separately tracked `STANDARD` delivery from the exact terminal commit.

## Blockers

- Not applicable — the prior four-path final-newline blocker was cleared only through the user's exact one-byte exception, and no repository blocker remains.
