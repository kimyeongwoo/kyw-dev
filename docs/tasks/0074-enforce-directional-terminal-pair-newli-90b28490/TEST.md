# TEST 0074 — Enforce Directional Terminal-Pair Newline and File-Mode Immutability

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: ./TASK.md
- Product requirements: ../../SPEC.md
- Architecture constraints: ../../ARCHITECTURE.md
- Pre-entry continuity baseline: `../.kyw-dev-standard-delivery-continuity.json`, file SHA-256 `aa934de227c1a45dacf9a89e9d5bf477cbb0b6ef2bb1087232cbbdaaeeb9cafe`, digest `e183b4958a5db76a7d05776d6b20821732d87e17a69516a23df5c1ce3ae8752f`, count `41`, last Task `0072`
- Active continuity baseline after the sole selected-Task transition: file SHA-256 `bc82b0a5c68d4806f739590479d86e1657c75ade0d3aaddee5fd792f20b9a407`, digest `7816d140cce98fbf750dd7d15d6e7c7422e036fde57b39442c87165d49e8edd6`, count `42`, last Task `0073`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no model override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Exact bytes and unchanged regular-file modes remain valid. | Exercise TASK.md and TEST.md exact-byte fixtures through fresh and checkpoint-covered validation. | Unit plus integration | PASS | Exact canonical `100644` and `100755` fixtures passed fresh and covered validation on Windows; the executable class is bound through Git index mode where the host does not expose POSIX worktree bits. |
| T-02 | AC-02 — Newline tolerance is worktree-to-canonical only. | Run both LF/CRLF directions and require only canonical LF with worktree CRLF under exact space-M to pass. | Unit / boundary | PASS | Pure and repository fixtures accepted only LF canonical / CRLF worktree with one exact ` M`; statusless CRLF, identical-byte ` M`, and canonical CRLF / worktree LF rejected fresh and covered. |
| T-03 | AC-03 — Non-CRLF byte drift cannot normalize away. | Mutate bare CR, final newline, spaces, Unicode, characters, and lines and assert exact immutable-pair rejection. | Security / regression | PASS | The full fresh/covered matrix rejected all listed drift, and the late pure/fresh/covered regression proved canonical CRLF plus worktree CRCRLF can no longer hide an inserted carriage return. |
| T-04 | AC-04 — File-mode drift is always rejected. | Exercise staged and unstaged chmod-only and chmod-plus-CRLF fixtures using deterministic Git modes and POSIX worktree chmod where supported. | Integrity / cross-platform | PASS | Staged `100644→100755` and staged-mode-plus-CRLF attacks rejected fresh and covered; a missing stage-zero entry rejected fresh; canonical `100755` passed fresh and covered. Native POSIX chmod/chmod-plus-CRLF is an explicit Windows skip and remains hosted exact-head proof. |
| T-05 | AC-05 — Unsafe porcelain, path, and object states never enter the exception. | Run identical-byte space-M, T status, links, renames, copies, deletions, shadows, and unsupported-type attacks and compare diagnostics. | Security / regression | PASS | Exact-byte ` M`, both T columns, rename/copy, missing-index, deletion, shadow, type, and malformed cases retained `FUTURE_TERMINAL_PAIR_IMMUTABLE` with the affected path; native symlink creation is an explicit Windows skip and remains hosted proof. |
| T-06 | AC-06 — Fresh and checkpoint-covered paths share one rule set. | Execute the full positive and negative matrix before and after continuity coverage on Windows and a POSIX-capable CI job. | Integration / compatibility | PASS | Post-correction hydration/continuity execution passed `53/57` with four explicit Windows/live skips; fresh and covered byte/status/mode rules agree locally, while native POSIX chmod and symlink execution remain the hosted exact-head obligation. |
| T-07 | AC-07 — Durable truth and full verification agree. | Inspect SPEC and ARCHITECTURE diffs, run focused hydration and continuity suites, Stable, pair validation, transaction and hash checks. | Documentation / delivery | PASS | The post-correction focused, complete related, and Stable gates passed; documentation-delta evidence, pair validation, transaction `NONE`, fixed hashes, whitespace, and exact scope/matrix review agree. |

## Regression Coverage

- Normal exact terminal pairs remain usable, and canonical LF checked out as CRLF is tolerated only with one exact ` M` record and unchanged modes.
- First-record leading spaces, CRLF-framed porcelain, exact paths, and normal T type-change parsing remain correct while type drift is rejected.
- Renames, copies, deletions, staged content, ambiguous status, and unsupported types remain fail closed; native symlink creation is explicitly deferred from Windows to hosted POSIX proof.
- Fresh delivery evaluation and continuity-covered closure remain behaviorally identical.
- Task 0070 bytes, the trusted checkpoint, and external delivery and publication state remain unchanged.

## Commands

- node --test --test-name-pattern "terminal artifact newline equivalence|terminal-pair porcelain|future terminal delivery binds|checkpoint-covered future pairs remain exact" test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs
- platform-capable chmod integration command recorded from the implementation fixture without weakening Windows execution
- npm test
- npm run lint
- npm run format:check
- npm run pack:check
- node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <allocated-task-directory>
- node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks
- git diff --check
- Production dispatcher — `node skills/kyw-task/scripts/task-artifacts.mjs dispatch --tasks-root docs/tasks --invocation '$kyw-impl 0074' --managed-routing false --execution-preflight-json <verified-empty-preflight>`
- Selected transition — active pair validation, then `node skills/kyw-task/scripts/task-artifacts.mjs apply-continuity --tasks-root docs/tasks --selected-task 0074 --transition-token <opaque-token>`
- Initial focused red — `node --test --test-name-pattern "terminal artifact newline equivalence|terminal newline exception|terminal-pair Git modes|checkpoint-covered future pairs remain exact" test/task-delivery-hydration.test.mjs`; exit `1`, four tests, one pass and three expected failures.
- Corrected focused matrix — `node --test --test-name-pattern "terminal artifact newline equivalence|terminal artifact Git entry|terminal newline exception|terminal-pair Git modes|terminal-pair type, rename, and copy|terminal-pair porcelain|fresh and checkpoint-covered future pairs remain exact" test/task-delivery-hydration.test.mjs`; exit `0`, seven passes, zero failures.
- POSIX mode probe — `node --test --test-name-pattern "POSIX terminal-pair chmod wins over newline equivalence" test/task-delivery-hydration.test.mjs`; exit `0`, one explicit skip because POSIX executable-bit worktree state is unavailable on Windows.
- First complete related run — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs`; exit `1`, 57 tests / 52 passes / four explicit skips / one stale current-main assertion failure.
- Corrected complete related run — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs`; exit `0`, 57 tests / 53 passes / four explicit skips / zero failures.
- Exact changed-path plan — `npm run verify:plan -- docs/SPEC.md docs/ARCHITECTURE.md docs/tasks/.kyw-dev-standard-delivery-continuity.json docs/tasks/0074-enforce-directional-terminal-pair-newli-90b28490/TASK.md docs/tasks/0074-enforce-directional-terminal-pair-newli-90b28490/TEST.md src/core/task-artifact-hydration.mjs test/task-delivery-hydration.test.mjs`; exit `0`, `STABLE`, one local aggregate command and hosted exact-SHA PR/main gates.
- Initial pre-late-audit Stable aggregate — `npm run check`; exit `0`, including `418` tests / `414` passes / four explicit skips and pack selection of `43` files / `134479` bytes.
- Bare-CR ambiguity red — `node --test --test-name-pattern "terminal artifact newline equivalence|terminal newline exception" test/task-delivery-hydration.test.mjs`; exit `1`, two intended failures: pure canonical-CRLF / worktree-CRCRLF equivalence and missing fresh immutable rejection.
- Bare-CR ambiguity green — the same focused command; exit `0`, two passes and zero failures, including pure plus fresh/checkpoint-covered rejection.
- Post-correction complete related run — `node --test test/task-delivery-hydration.test.mjs test/task-delivery-continuity.test.mjs`; exit `0`, 57 tests / 53 passes / four explicit skips / zero failures.
- Post-correction Stable aggregate — `npm run check`; exit `0`, including test, lint, format, and pack checks.

## Results

- PASS — pre-entry validation accepted Task 0074 and hard dependencies 0070/0071, the Task transaction state was `NONE`, Task 0070 hashes remained `2d6782789b3bde4d55aec6565f8086525580debf7538b29bcea7d59fba7ae184` / `79e47459ea9796a948c018b559fdcad4dd920d4062275c6c9131d9cc3d9c9292`, and local/fetched/direct-remote `main` aligned at `d1969c7376477263bdc5e4287e7e9649c2c6dc52`.
- PASS — the sole dispatcher selected `IMPLEMENT / 0074` with one predecessor continuity transition; no implementation, terminal-pair, future-Task, or external mutation preceded selection.
- PASS — after branch creation and active-pair validation, one transition application advanced only delivered predecessor Task 0073 from count `41` / digest `e183b495…` to count `42` / digest `7816d140…`; Task 0074 is excluded, the active checkpoint file hash is `bc82b0a5…`, and transaction inspection remains `NONE`.
- FAIL — the initial focused red command proved the three false-positive boundaries before production mutation: symmetric normalization returned `true` for canonical CRLF/worktree LF, exact bytes under synthetic ` M` produced no rejection, and a staged `100644→100755` index-mode change under synthetic ` M` produced no rejection. The existing checkpoint negative byte matrix passed, so the failure was confined to the newly asserted boundaries.
- PASS — the corrected seven-test matrix passed pure one-way bytes and Git-entry parsing, exact/statusless/reverse newline directions, exact-byte status rejection, deterministic stage/index modes, canonical executables, exact affected-path diagnostics, valid T/rename/copy status rejection, and identical fresh/checkpoint byte attacks. The Windows run executed no native chmod claim; that named test is explicitly platform-skipped.
- FAIL — the first full hydration/continuity run passed every changed-behavior case but found the existing `current tracked-main redelivery identity scan is read-only` assertion still equated Task 0072's PR `#60` merge `17ce6ff…` with current main `d1969c7…` after the legitimate Task 0073 merge. The fixture now checks exact ancestry and parses Task 0072's identity at its own merge SHA instead of freezing the repository frontier.
- PASS — the corrected full related rerun passed all 57 tests with 53 passes, four explicit symlink/POSIX/live skips, and zero failures; the Task 0072 identity remains exact while current main may advance through later valid merges.
- PASS — exact changed-path planning classified the outcome as runtime / `STABLE`, prescribed `npm run check`, and retained hosted exact-SHA CI as the external delivery gate.
- PASS — the initial pre-late-audit `npm run check` exited `0`: `418` tests / `414` passes / four explicit host/live skips / zero failures, lint over `84` JavaScript modules and foundation metadata, format over `360` UTF-8/LF text files, and pack selection of `43` files / `134479` bytes.
- PASS — its initial local review retained exact Task 0070 hashes `2d6782789b3bde4d55aec6565f8086525580debf7538b29bcea7d59fba7ae184` / `79e47459ea9796a948c018b559fdcad4dd920d4062275c6c9131d9cc3d9c9292`, active checkpoint SHA-256 `bc82b0a5c68d4806f739590479d86e1657c75ade0d3aaddee5fd792f20b9a407` through Task 0073 only, transaction `NONE`, exact seven-path scope, pair validity, and `git diff --check`.
- FAIL — final helper audit reproduced canonical `"a\r\n"` with worktree `"a\r\r\n"` returning newline-equivalent: worktree-only pair conversion removed the second CR and left the first equal to canonical, hiding an inserted bare carriage return forbidden by AC-03 and SPEC section 7.
- FAIL — the new two-test red command reproduced both layers before correction: the pure helper returned `true` for canonical CRLF / worktree CRCRLF, and the fresh terminal-pair path did not reject the same attack.
- PASS — the identical focused command passed `2/2` after requiring canonical bytes to contain no carriage return before any non-identical newline representation can qualify; exact CRLF bytes remain valid, while fresh and covered CRCRLF attacks reject.
- PASS — the post-correction complete hydration/continuity run passed `53/57` with four explicit symlink/POSIX/live skips and zero failures.
- PASS — the post-correction `npm run check` exited `0`: `418` tests / `414` passes / four explicit host/live skips / zero failures, lint over `84` modules and foundation metadata, format over `360` UTF-8/LF files, and pack selection of `43` files / `134489` bytes.
- PASS — terminal validation accepted the `DONE/PASSED` pair; transaction inspection remained `NONE`; foundation passed `21/21`; current queued artifacts passed `1/1`; Task 0070 hashes and the count-42 checkpoint hash `bc82b0a5c68d4806f739590479d86e1657c75ade0d3aaddee5fd792f20b9a407` remained exact; formatting, whitespace, and the seven-path Task scope passed with Task 0075–0076 untouched.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 16881 | 227 | 227 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — setup, commands, configuration, usage, and contributor workflow do not change. | README remains byte-stable; comparison mechanics and evidence stay in source/tests and this pair. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — routing, authority, preservation, and completion rules do not change. | AGENTS remains byte-stable; the current correction uses the existing future-pair rule. |
| `docs/SPEC.md` | 43740 | 44348 | 452 | 454 | 608 | 1.39% | observable product behavior and acceptance | The warning-sized SPEC must state canonical Git mode/blob authority, one-way worktree-only conversion, exact modified-status eligibility, and negative drift meaning so product acceptance cannot retain the symmetric loophole. | Existing Task/Test and STANDARD delivery paragraphs absorb the corrected invariant without a new section; algorithms and attack enumeration remain in source/tests. |
| `docs/ARCHITECTURE.md` | 40748 | 41259 | 823 | 829 | 511 | 1.25% | stable components, boundaries, dependencies, flows, and distribution | Hydration and checkpoint closure now share an explicit status, type, tree/index/worktree mode, raw-byte, then newline-exception flow that must remain durable system truth. | Existing runtime, STANDARD delivery, and pair-state sections replace the earlier path/byte-only description; implementation detail remains in the owner module. |
| `Combined` | 105314 | 106433 | 1550 | 1558 | 1119 | 1.06% | all four permanent-document owners | SPEC and ARCHITECTURE must agree on the corrected path/mode/blob authority and directional exception while setup and repository-wide workflow rules remain unchanged. | The changed meaning is absorbed into existing owner sections, README and AGENTS stay byte-stable, and exhaustive cases remain Task/test-owned. |

## Unverified

- Native unstaged executable-bit behavior was unavailable on this Windows host; its named regression is an explicit local skip and remains required in hosted POSIX exact-head CI.
- Native terminal-pair symlink creation was unavailable on this Windows host; its unchanged named regression remains required in hosted POSIX exact-head CI.
- Exact-head PR CI, protected merge, post-main CI, and final production-evaluator satisfaction remain the external STANDARD delivery ledger and are not pre-claimed here.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
