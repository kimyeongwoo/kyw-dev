# TASK 0074 — Enforce Directional Terminal-Pair Newline and File-Mode Immutability

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Make terminal Task/Test comparison obey canonical authority exactly: accept only identical bytes or a worktree CRLF representation that becomes the canonical bytes after one-way CRLF-to-LF conversion, and reject any file-mode change even when content bytes are identical or newline-equivalent.

## Dependencies

- Task 0070.
- Task 0071.

## In Scope

- Use the canonical Git blob as the authoritative byte sequence and normalize only the worktree candidate by replacing CRLF pairs with LF for the narrow representation comparison.
- Reject canonical CRLF with worktree LF, bare CR, final-newline, whitespace, Unicode, character, line, and any other semantic or byte drift.
- Bind each terminal TASK.md and TEST.md to the canonical regular-file Git mode or executable class and compare it with the current index and worktree state before accepting a modified-status exception.
- Permit exact porcelain code space-M only when the path and type are exact, modes are unchanged, raw bytes actually differ, and the one-way newline comparison succeeds.
- Reject chmod-only, chmod plus CRLF, metadata-only space-M with identical bytes, staged mode changes, type changes, links, renames, copies, deletions, alternate paths, and unsupported filesystem objects with the exact terminal-pair diagnostic.
- Apply the same rules to freshly evaluated uncovered terminal outcomes and checkpoint-covered terminal-pair closure.
- Add deterministic byte/mode helpers and platform-proportionate integration coverage, including POSIX chmod execution where supported and Windows-safe Git mode fixtures.
- Synchronize SPEC and ARCHITECTURE and preserve Task 0070 bytes, checkpoint state, delivery hydration semantics, and package/publication state.

## Out of Scope

- Changing Task/Test semantic content, statuses, dependencies, contract parsing, or terminal history after delivery.
- General text normalization, line-ending rewriting, automatic chmod repair, Git configuration mutation outside isolated fixtures, or allowing other modified-status cases.
- Refactoring the hydration module, changing command-cache behavior, removing the Task 0070 shim, or performing unrelated parser cleanup.
- Changing package version, preparing 0.1.4, publishing, or mutating GitHub, checkpoint, tag, or registry state.

## Acceptance Criteria

- [x] AC-01: Exact canonical and worktree bytes with unchanged regular-file modes remain accepted for both terminal artifacts.
- [x] AC-02: Canonical LF with worktree CRLF is accepted only under exact space-M status after one-way worktree normalization; canonical CRLF with worktree LF is rejected.
- [x] AC-03: Bare CR, final-newline, whitespace, Unicode, character, added or removed line, and any non-newline byte change remain rejected even when another normalization could hide them.
- [x] AC-04: Canonical and current regular-file modes are compared, and chmod-only, staged or unstaged executable-bit drift, and chmod combined with otherwise allowed CRLF are rejected before newline equivalence can suppress them.
- [x] AC-05: Identical bytes under space-M, type-change status, link, rename, copy, deletion, shadow path, or unsupported object never enter the newline exception and retain exact fail-closed diagnostics.
- [x] AC-06: Fresh uncovered and checkpoint-covered terminal pairs enforce the same directional byte and mode rules on Windows and POSIX-capable fixtures without host-specific false passes.
- [x] AC-07: SPEC and ARCHITECTURE state the canonical authority, one-way worktree conversion, regular-file mode binding, and rejection order; focused attacks and all Stable checks pass with Task 0070 and checkpoint hashes unchanged.

## Plan

- [x] Capture the reverse-newline and mode-only false positives with pure helper and repository fixtures before changing production comparison.
- [x] Make canonical bytes directional and add an exact mode/type authority check before the space-M newline exception.
- [x] Add positive and negative byte matrices plus chmod-only, chmod-plus-CRLF, staged, unstaged, and platform-specific mode coverage.
- [x] Run the same attack matrix through fresh hydration and checkpoint-covered closure and preserve existing link/type/status diagnostics.
- [x] Synchronize owner documentation, run focused and Stable checks, verify immutable hashes and transaction state, and record only executed evidence.

## Decisions

- Treat the canonical Git blob as authority; representation tolerance is directional because only a checkout may present canonical LF bytes as CRLF.
- Require a real byte difference before newline equivalence so metadata-only space-M cannot be mistaken for an encoding presentation.
- Bind regular-file mode separately from content because byte equality cannot prove executable-bit immutability.
- Keep the exception limited to exact space-M and exact paths; all staged, type, link, and ambiguous porcelain states remain outside it.

## Risks

- Platform Git settings can hide or report executable-bit changes differently, so tests must separate deterministic index/tree mode fixtures from host-capable worktree chmod integration.
- A broad newline transform could erase bare CR or other content differences and weaken terminal immutability.
- Checking mode after byte equivalence would preserve the current bypass for chmod-only or chmod-plus-CRLF changes.
- Changing shared porcelain parsing could regress the previously repaired normal T status and exact first-record path behavior.

## Discoveries and Changes

- The current helper normalizes both canonical and worktree bytes, so it accepts canonical CRLF with worktree LF even though durable truth permits only worktree CRLF converted toward canonical bytes.
- The current space-M exception can accept identical bytes and does not bind executable-bit or file-mode state, allowing a content comparison to suppress metadata drift.
- Existing tests explicitly expect the reverse newline direction and do not cover chmod-only or chmod-plus-newline attacks.
- Task 0070 already preserved exact path, regular-file, porcelain, link, type, and content boundaries; this correction narrows only the remaining false positives.
- Execution started at `2026-09-01T13:55:28+09:00` after Task 0074 and both hard dependencies validated, the Task transaction reported `NONE`, and local, fetched, and direct-remote `main` aligned at `d1969c7376477263bdc5e4287e7e9649c2c6dc52`.
- The pre-existing untracked Task 0075 and Task 0076 pairs are future work outside this mutation boundary and remain untouched.
- The sole dispatcher returned `SELECTED / IMPLEMENT / 0074` and prepared one opaque predecessor continuity transition for application only after this pair became active on its Task branch.
- After active-pair validation, the opaque transition was applied exactly once and advanced durable coverage from digest `e183b4958a5db76a7d05776d6b20821732d87e17a69516a23df5c1ce3ae8752f`, count `41`, last Task `0072`, to digest `7816d140cce98fbf750dd7d15d6e7c7422e036fde57b39442c87165d49e8edd6`, count `42`, last Task `0073`; Task 0074 remains uncovered.
- The Task's checkpoint-preservation requirement therefore binds the canonical post-entry count-42 baseline after this one authorized predecessor transition; implementation and verification must not mutate it again.
- Focused red execution reported three intended failures and one existing negative-matrix pass: the pure helper accepted canonical CRLF/worktree LF, metadata-only exact-byte ` M` was suppressed, and staged executable-bit drift under exact ` M` was suppressed before any production change.
- Production now binds each canonical outcome/merge tree entry to exact `100644` or `100755` mode plus blob identity, rechecks aligned-main and stage-zero index mode/object state, and compares the worktree executable class on POSIX-capable hosts before reading raw bytes.
- The byte helper now converts only worktree CRLF pairs toward untouched canonical bytes. Raw equality remains valid only without a pair-specific status; the sole ` M` exception additionally requires a genuine raw difference, one exact path/status record, unchanged modes, and directional equality.
- Checkpoint-covered closure now consumes the same fresh immutable-pair inspection result and exempts only its explicitly accepted newline-representation paths from the later diff guard; filtered `hash-object --path` no longer defines a second comparison rule.
- Expanded focused execution passed seven selected tests across pure byte/mode parsing, statusless and exact-` M` directionality, Windows-safe staged modes, canonical executables, type/rename/copy states, and the same fresh/checkpoint byte matrix. The separate POSIX chmod test is explicitly skipped on Windows and remains an exact-head CI lane obligation.
- The first complete hydration/continuity run passed 52 of 57 tests with four explicit skips but exposed one stale current-repository assertion: a Task-0072 identity test still required PR `#60`'s merge to equal `main` after Task 0073 had legitimately advanced it. The assertion now proves that exact merge is an ancestor of current main and parses its unchanged PR `#60` identity at its own SHA.
- The corrected complete hydration/continuity rerun passed 53 of 57 tests with only four explicit host/live skips and zero failures, including the current tracked-main identity scan and every new fresh/checkpoint attack.
- Changed-path planning classified the exact seven-path outcome as `STABLE`, prescribed `npm run check`, and retained hosted exact-SHA PR and main gates.
- The initial pre-audit Stable verification passed all `418` tests with `414` passes, four explicit host/live skips, and zero failures; lint passed `84` JavaScript modules and foundation metadata, format passed `360` UTF-8/LF files, and pack selection passed `43` files / `134479` bytes.
- Its initial local invariant review retained exact Task 0070 hashes `2d6782789b3bde4d55aec6565f8086525580debf7538b29bcea7d59fba7ae184` / `79e47459ea9796a948c018b559fdcad4dd920d4062275c6c9131d9cc3d9c9292`, checkpoint SHA-256 `bc82b0a5c68d4806f739590479d86e1657c75ade0d3aaddee5fd792f20b9a407` through Task 0073 only, transaction `NONE`, exact scope, and a clean whitespace diff.
- Final review then found a distinct bare-CR ambiguity: canonical `CRLF` plus worktree `CRCRLF` normalized back to the canonical bytes, so the initial implementation could still hide an inserted carriage return despite AC-03 and the synchronized SPEC prohibition.
- The exact two-test regression captured that ambiguity before correction: the pure helper returned `true`, and fresh hydration omitted the required immutable-pair rejection. The comparison now permits non-identical newline representation only when canonical bytes contain no carriage return, while exact canonical/worktree bytes remain valid regardless of their line endings.
- The focused correction passed `2/2`; the complete hydration/continuity rerun passed `53/57` with four explicit host/live skips; and the post-correction Stable gate passed `414/418` with the same four skips, lint over `84` modules, format over `360` files, and pack selection of `43` files / `134489` bytes.
- Terminal review then passed pair validation, transaction `NONE`, foundation `21/21`, current queued-artifact validation `1/1`, formatting, whitespace, exact seven-path scope, unchanged Task 0070 hashes, and unchanged count-42 checkpoint SHA-256 `bc82b0a5c68d4806f739590479d86e1657c75ade0d3aaddee5fd792f20b9a407`.
- Commit `84580160f63cc909d9b0df59d12890979caadac0` preserved the exact seven-path scope, was pushed non-forced, and opened non-draft PR `#62` at that exact head.
- First PR run `33474424353` completed without rerun: Quality, packed release, and both Windows behavioral jobs passed; Ubuntu 22/24/26, macOS 22/24, and merge compatibility failed on one common test-fixture setup error, so the required aggregate failed as designed.
- Representative Ubuntu, macOS, and merge logs show the native POSIX chmod/chmod-plus-CRLF regression itself passed. The failing canonical-executable fixture staged `100755` but left its real POSIX TASK.md/TEST.md files at `0644`, so switching branches aborted as dirty before fresh or covered positive assertions.
- The bounded recovery aligns those two physical fixture files to `0755` on non-Windows before the existing deterministic `update-index --chmod=+x`; production, permanent owners, workflow, continuity, dependencies, and future pairs remain unchanged.
- Recovery-focused execution passed the canonical-mode test on Windows with the native POSIX test explicitly skipped (`1/2` pass, one skip); post-recovery Stable again passed `414/418` with four explicit host/live skips, lint over `84` modules, format over `360` files, and pack selection of `43` files / `134489` bytes.
- Recovery planning retained `STABLE`; terminal review passed pair validation, transaction `NONE`, foundation `21/21`, current queue `1/1`, formatting, whitespace, exact three-path recovery scope, unchanged permanent owners, exact Task 0070 hashes, and unchanged count-42 checkpoint SHA-256 `bc82b0a5c68d4806f739590479d86e1657c75ade0d3aaddee5fd792f20b9a407`.

## Documentation Impact

- SPEC: Clarify terminal-pair immutability as canonical-byte authority with only one-way worktree CRLF conversion and add regular-file mode binding.
- ARCHITECTURE: Document the comparison order across porcelain path/status, type, canonical and current mode, exact bytes, and the final narrow newline exception.
- README: Expected unchanged — no setup, installation, command, or usage behavior changes.
- AGENTS: Expected unchanged — correction and terminal-pair preservation rules already cover this outcome.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Revalidated Task 0074, Tasks 0070 and 0071, exact Task 0070 pair hashes, aligned `main`, the clean transaction state, and the separated pre-existing Task 0075–0076 authoring work.
- Completed the sole production dispatcher call and established `task/0074-enforce-directional-terminal-pair-newline-and-file-mode-immutability` as the selected branch with this pair active.
- Applied the untouched predecessor continuity transition exactly once through delivered Task 0073, preserved Task 0074 as uncovered, and revalidated the active pair and transaction state.
- Added deterministic directional-byte, exact-byte status, staged-mode, canonical-executable, POSIX-capable chmod, fresh, and checkpoint-covered regression fixtures and captured the expected pre-fix failures.
- Implemented canonical/outcome/current/index/worktree mode binding, one-way raw-byte comparison, exact modified-status eligibility, and one shared fresh/checkpoint enforcement path.
- Synchronized SPEC and ARCHITECTURE with canonical path/mode/blob authority and the status-to-type-to-mode-to-bytes rejection order; README and AGENTS remain byte-stable.
- Replaced the stale Task-0072-equals-current-main test premise with exact ancestry plus immutable merge-identity proof, without changing production redelivery semantics or historical fixtures.
- Closed the late canonical-CRLF / worktree-CRCRLF ambiguity with pure, fresh, and checkpoint-covered red/green proof, then repeated the complete hydration/continuity and planner-selected Stable gates.
- Completed terminal pair, foundation/delta, current-queue, immutable-hash, transaction, formatting, whitespace, and exact-scope review without touching future Task 0075–0076 pairs.
- Committed and non-force pushed the initial exact seven paths, opened non-draft PR `#62`, observed immutable failed run `33474424353` to completion, and traced all six platform/merge failures to the same test-fixture worktree-mode mismatch without rerun or bypass.
- Aligned the POSIX canonical-executable fixture's physical and staged modes with a test-only three-path recovery and passed its focused check plus the complete Stable gate without changing product source or durable owners.
- Revalidated the terminal pair, foundation/delta policy, current queue, transaction, immutable hashes, exact recovery scope, formatting, and whitespace before the recovery commit.

## Remaining

- None — the corrected repository outcome and recovery verification are complete; a recovery commit/non-force push, new exact-head CI, protected merge, post-main CI, and production evaluation remain the ordinary STANDARD delivery ledger.

## Resume Point

- None — repository recovery is complete. If delivery is interrupted, resume only from PR `#62` with the local three-path recovery; do not repeat dispatcher selection, continuity transition, initial commit/PR creation, or failed run `33474424353`.

## Blockers

- Not applicable — no repository blocker remains; the failed first run is retained evidence for the new exact head to supersede.
