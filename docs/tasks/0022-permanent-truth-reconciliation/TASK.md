# TASK 0022 — Permanent Truth Reconciliation

## Status

DONE

## Goal

Reconcile `README.md` and `docs/ARCHITECTURE.md` with the current merge commit, `docs/SPEC.md`, and the preserved Task 0020/0021 evidence so users are not told that release readiness, complete MVP acceptance, or interruption cleanup is stronger than the implementation and executed evidence actually support.

## Dependencies

- `../../../AGENTS.md`
- `../../../README.md`
- `../../SPEC.md`
- `../../ARCHITECTURE.md`
- `../0020-release-readiness-gate/TASK.md`
- `../0020-release-readiness-gate/TEST.md`
- `../0021-audit-redirection-guard/TASK.md`
- `../0021-audit-redirection-guard/TEST.md`
- Reviewed merge commit `4ab9fdb7118b4174244622b7124beb01e581af8a`
- Normalized branch base, current HEAD, and upstream: `origin/main` at `4ab9fdb7118b4174244622b7124beb01e581af8a`
- Post-merge CI run `29644447450`

## In Scope

- Verify that `0022` is the next unused Task number at the actual working HEAD and attribute every initial staged, unstaged, and untracked path before editing.
- Reconcile the README status text with the following retained facts:
  - Tasks 0001–0021 implement substantial `0.1.0` pre-publication package/plugin functionality and verification infrastructure.
  - Task 0020's latest complete release-readiness result remains `BLOCKED`.
  - Task 0021 fixes its audit-redirection defect within a narrower scope but explicitly does not re-run or replace the full Task 0020 gate.
  - The project has not yet demonstrated every `docs/SPEC.md` §15 MVP acceptance criterion.
  - No npm publication, GitHub Release, tag, or public plugin-directory submission has occurred.
- Replace unqualified claims such as “release candidate” or “four complete workflow Skills” only where they imply full release approval or complete SPEC acceptance; retain accurate descriptions of implemented functionality.
- Remove the stale chronological `## Development sequence` section and direct maintainers to `docs/tasks/` and `CODEX_PROMPTS.md` without presenting an obsolete implementation order as current user guidance.
- Reconcile README and Architecture cleanup wording with the actual evaluator control flow:
  - normal completion and handled failures attempt bounded cleanup;
  - abrupt process termination, including ordinary SIGINT/SIGTERM or Windows console interruption, is not currently proven to execute final cleanup;
  - file-based authentication copies can therefore remain in an evaluator-owned temporary directory after interruption;
  - unavoidable hard termination such as SIGKILL or power loss is not covered by a cleanup guarantee.
- Keep user guidance concise and avoid moving Task-specific chronology into another permanent document.
- Preserve the literal product requirements in `docs/SPEC.md`, including the distinction between implementation, demonstrated acceptance, release approval, and a licensing check on an actually published tarball.
- Record the exact document-impact decision, commands actually run, and final diff review in this Task/Test pair.

## Out of Scope

- Changing any runtime, Skill, CLI, test, fixture, package, workflow, or script behavior.
- Implementing signal handlers, asynchronous child management, stale-root scavenging, audit command parsing, release-isolation attribution, or SPEC behavioral E2E.
- Weakening or rewriting `docs/SPEC.md` requirements to make current evidence appear sufficient.
- Editing `AGENTS.md`; its source-of-truth and completion rules are already the reason this reconciliation is required.
- Rewriting historical Task 0017, Task 0020, or Task 0021 status, commands, results, or evidence.
- Creating Task 0023 or any later Task directory.
- Running model-backed evaluation, consuming authentication, or using network/registry checks.
- Commit, push, merge, rebase, force operation, tag, npm publish or publish dry-run, GitHub Release, public Plugin submission, or branch-protection changes.

## Acceptance Criteria

- [x] AC-01: `0022` is proven unused at the actual working HEAD; the current HEAD, branch, index, worktree, and untracked paths are recorded; every pre-existing change is attributable before the first edit.
- [x] AC-02: `README.md` states the current release condition without implying `READY_FOR_APPROVAL`, full SPEC MVP acceptance, npm publication, GitHub Release, tag, or public plugin submission; it preserves Task 0020's `BLOCKED` result and Task 0021's narrower completion.
- [x] AC-03: The obsolete chronological `## Development sequence` and its incomplete Task list are removed; README remains limited to externally useful entry, usage, development, distribution, and concise contributor guidance consistent with SPEC §7.1.
- [x] AC-04: README and Architecture no longer promise that evaluator temporary repositories, homes, copied auth, JSONL, or last-message files are “always” removed or deleted “after every run”; they accurately distinguish normal/handled cleanup from unverified abrupt-interruption cleanup without exposing credentials or recommending broad deletion.
- [x] AC-05: The wording preserves accurate implemented capabilities while clearly separating “implemented,” “demonstrated,” “release-approved,” and “published”; no product requirement or runtime behavior is silently changed.
- [x] AC-06: The final changed-path set is limited to `README.md`, `docs/ARCHITECTURE.md`, and this Task/Test pair unless an existing repository validator requires a narrowly justified documentation test update; any additional path makes the Task `BLOCKED` pending explicit scope reconciliation.
- [x] AC-07: Acceptance-specific document checks, `npm run check`, `git diff --check`, Task/Test contract validation through the existing suite, and a final diff review all pass with actual command and exit evidence.
- [x] AC-08: `TASK.md` and `TEST.md` record exact results, unverified items, documentation impact, and residual risks; completion does not claim that the underlying audit, interruption, isolation, SPEC E2E, or full release-gate defects are fixed.

## Plan

- [x] Read `AGENTS.md`, the four permanent documents, Task 0020/0021 Task/Test evidence, and only the directly relevant README/Architecture sections.
- [x] Verify the actual HEAD, Task-number availability, branch, status, diff, index, and untracked provenance; stop before edits on collision or unexplained user changes.
- [x] Create or confirm this Task/Test pair together in `DRAFT` and map every acceptance criterion before editing permanent documents.
- [x] Draft the smallest README status and responsibility correction.
- [x] Draft the smallest README/Architecture interruption-cleanup correction based on inspected current code, without implementing the fix.
- [x] Remove stale chronological guidance without creating a replacement permanent roadmap.
- [x] Review the permanent-document diff against SPEC, preserved Task evidence, and README/Architecture responsibilities.
- [x] Run acceptance-specific checks and the stable repository checks actually required by this documentation/package change.
- [x] Record exact evidence, review the final changed paths and diff, and end `DONE/PASSED` or `BLOCKED`.

## Decisions

- `docs/SPEC.md` remains the product requirement authority. This Task corrects claims about current implementation/evidence; it does not lower acceptance criteria.
- Task 0020 remains historical `BLOCKED` evidence. Task 0021 remains a completed narrow remediation and is not retroactively converted into a full release gate.
- “Implemented” may describe code and packaged surfaces that exist. “MVP accepted,” “release-ready,” “ready for approval,” and “published” require their own executed evidence and must not be used interchangeably.
- A pre-publication package candidate may exist without release approval. The README must state that distinction directly.
- Current cleanup documentation must describe what is actually guaranteed today. A later implementation Task may strengthen the guarantee and update the documents again.
- No production or development dependency is needed.

## Risks

- Overcorrecting the README could hide genuinely implemented CLI, Plugin, Skill, CI, and packaging capabilities.
- Under-correcting could leave users with the false impression that Task 0021 replaced the full blocked release gate.
- Cleanup wording can become either falsely absolute or too vague to help a user who interrupted a model run.
- Moving the removed chronological sequence to another permanent file would recreate the SPEC violation rather than fix it.
- An unexpected current-HEAD change may make the prepared wording stale; provenance must be checked first.

## Discoveries and Changes

- Starting HEAD is `f38128c0aa4defd16f0785f23c77464e40ba0dce` on `task/0021-audit-redirection-guard`. It is not ahead of reviewed merge `4ab9fdb7118b4174244622b7124beb01e581af8a`; it is that merge's second parent. Both commits have tree `22d6f22e3ce3176252fcba02dc6167ada652495d` and `git diff HEAD 4ab9fdb...` is empty, so the prepared Task contract applies to the actual working bytes without reset, checkout, or overwrite.
- Branch normalization occurred after Task 0022 had reached `DONE`/`PASSED` and before any commit. The original four-path worktree was stashed as `bcd1f3b39b01622892ca11822d419e30efa51aee` (`task-0022 before branch normalization`), the clean checkout moved from `task/0021-audit-redirection-guard@f38128c...` to a new `task/0022-permanent-truth-reconciliation` branch created from `origin/main@4ab9fdb...`, and that exact stash was restored without conflict and dropped after a successful pop.
- Direct provenance reinspection confirmed the current branch `task/0022-permanent-truth-reconciliation`, HEAD/upstream/`origin/main` all at `4ab9fdb...`, the old local branch still at `f38128c...`, and both commit trees at `22d6f22e3ce3176252fcba02dc6167ada652495d`. The dropped stash remains inspectable as unreachable commit `bcd1f3b...`: its first-parent delta contains only README/Architecture and its untracked parent contains only the Task 0022 pair.
- The first direct `git reflog show refs/stash` probe exited 128 because the successful pop had dropped `refs/stash`; it changed no file. Read-only fallback `git fsck --unreachable --no-reflogs`, followed by `git cat-file`, `git diff-tree`, and `git ls-tree`, recovered and verified `bcd1f3b...`; a later quiet ref check returned 1, consistently proving that no live stash ref remains.
- Normalization changed branch/base provenance only. The pre-stash and restored SHA-256 values matched for README, Architecture, TASK, and TEST; no path was added, removed, staged, or semantically changed by the branch move. Current README and Architecture Git blobs (`b25a70040fcb139c47c8f46e69f6009752764c07` and `af47ef4552dd2bd63537c3bc030208971a44c3a3`) still exactly match the stash snapshot, so branch normalization itself changed neither permanent document's bytes or meaning. The normalized base is `origin/main@4ab9fdb7118b4174244622b7124beb01e581af8a`, whose tree is byte-identical to the original Task start tree.
- Post-normalization acceptance assertions passed 16/16; Task artifact validation returned `valid: true`; and `npm run check` exited 0 with 133/133 tests, lint over 35 JavaScript modules plus foundation metadata, format over 167 UTF-8/LF files, and pack validation over 29 files/60,642 bytes.
- Post-normalization `git diff --check` exited 0. Final scope validation found exactly two unstaged tracked and two untracked Task paths, zero staged/unexpected/missing/deleted paths, zero Task 0023-or-later directories, no protected historical or implementation diff, and no remaining stash. README and Architecture retained their pre-normalization SHA-256 values.
- The requested final revalidation after provenance wording was reconciled also passed without failure or retry: acceptance assertions 16/16, Task artifact `valid: true`, `npm run check` 133/133 with the same 35-module/167-file/29-file stable summaries, `git diff --check` exit 0, and final scope `valid=true` with exactly four allowed paths and zero staged or Task 0023+ paths.
- Initial tracked and staged diffs were empty. The only untracked paths were this user-provided `docs/tasks/0022-permanent-truth-reconciliation/{TASK.md,TEST.md}` pair. Neither actual HEAD nor the reviewed merge tracks any `0022-*` path, and `docs/tasks/` contains no other `0022` directory, so there is no unexplained change or number collision.
- The supplied pair existed together, both files were `DRAFT`, and AC-01 through AC-08 were each mapped to T-01 through T-08 before the first edit. The user's instruction to start exactly Task 0022 authorizes transition to `IN_PROGRESS`/`RUNNING`.
- Narrow control-flow inspection found synchronous child execution and bounded `finally` cleanup in `scripts/grilling-eval/core.mjs` and `scripts/audit-smoke.mjs`. On normal return or a handled throw, the grilling runner attempts to remove unpublished staging and its evaluator-owned temporary root, and the audit runner attempts to remove its evaluator-owned temporary root. Neither runner registers `SIGINT`, `SIGTERM`, SIGHUP, or `process.on`/`process.once` cleanup handling.
- With `--auth-file`, both runners copy authentication below evaluator-owned temporary `CODEX_HOME`. Because default signal or Windows console termination need not unwind JavaScript `finally`, abrupt interruption can leave that copy and associated temporary repository/home/JSONL/last-message or staging state. SIGKILL and power loss are also outside the implemented cleanup guarantee.
- README Status now describes implemented pre-publication capabilities separately from evidence verdicts, retains Task 0020 `BLOCKED`, identifies Task 0021 as a narrow passed remediation that did not replace the full gate, and states that SPEC §15 acceptance, release approval, tagging, GitHub Release, npm publication, and public plugin submission have not occurred.
- README's stale `## Development sequence` and incomplete 0001–0011 list were removed. The replacement is one contributor pointer to the active contract/evidence under `docs/tasks/` and the existing `CODEX_PROMPTS.md`, not a new roadmap.
- Task-number chronology was removed from the evaluator and local-marketplace user guidance where it was not needed. Implemented CLI, Skill, CI, evaluation, packaging, and installation descriptions remain.
- README and Architecture now say normal/handled paths attempt bounded `finally` cleanup, while SIGINT/SIGTERM/Windows console interruption is not guaranteed to unwind it; copied `auth.json` and evaluator-owned temporary/staging state may remain, and SIGKILL/power loss are outside the guarantee. Architecture also distinguishes publish-permitting package metadata from a release verdict.
- The first `npm run check` reached the full test suite and failed one of 133 tests because `test/kyw-task.test.mjs` retains a documentation-coupled assertion for the literal `Tasks 0001 through 0015`. No test or runtime file was changed. README now preserves that true historical phrase as the initial implementation range while immediately distinguishing later work and the current blocked/unapproved state; the required check must be rerun.
- The corrected acceptance assertion passed all 16 checks. Paragraph-level semantic review mapped README Status to SPEC §15 plus Task 0020's terminal `BLOCKED`/failed T-08 and Task 0021's explicit non-regating limitation; mapped contributor guidance to SPEC §7.1 and the one-Task context rule; mapped publication wording to SPEC §13/§16; and mapped both cleanup sections to the inspected runner control flow without weakening SPEC safety requirements.
- The second `npm run check` exited 0: 133/133 tests, lint over 35 JavaScript modules plus foundation metadata, format over 167 UTF-8/LF files, and pack check over 29 files/60,642 bytes. The current Task validator returned `valid: true`, and a preliminary `git diff --check` exited 0.
- Scope audit found exactly four changed paths: `README.md`, `docs/ARCHITECTURE.md`, and this Task/Test pair, with zero unexpected paths. `AGENTS.md`, `docs/SPEC.md`, and historical Tasks 0017, 0020, and 0021 have zero diff.
- Final coverage review found no additional behavior or claim outside T-01 through T-08. The permanent-document diff is documentation-only, the Task/Test evidence retains the initial failed check and successful rerun, and every unresolved implementation/release item remains explicitly outside this completion verdict.
- Before normalization, the first terminal Task validation returned `valid: true`; `git diff --check` exited 0; HEAD remained the historical starting commit `f38128c0...`; and the inventory contained exactly the four allowed paths with no staged content, protected-history diff, or later Task directory.

## Documentation Impact

- SPEC: Unchanged. Product requirements and MVP acceptance criteria remain authoritative and were not lowered.
- ARCHITECTURE: Updated only to separate publish-permitting metadata from release verdicts and to document the evaluator cleanup/signal boundary implemented today.
- README: Updated for truthful release status, removal of stale chronological guidance, concise contributor pointers, and evaluator interruption-cleanup limitations.
- AGENTS: Unchanged. Its conflict-reconciliation and completion rules remain accurate.

## Completed

- Read and reconciled every authorized permanent and historical evidence source in the required order.
- Completed current-HEAD, branch, reference ancestry/tree, staged/unstaged/untracked, Task-number, pair-state, and matrix-mapping preflight with no blocker.
- Inspected only the Task-referenced evaluator cleanup, authentication-copy, child-execution, and signal-handler control flow needed to ground the documentation change.
- Reconciled README Status, contributor guidance, evaluator interruption guidance, time-sensitive npm-name wording, and local marketplace wording without changing product behavior.
- Reconciled the Architecture release-metadata and evaluator cleanup boundaries without changing runtime, tests, SPEC, AGENTS, or historical Task evidence.
- Completed the corrected 16-point document assertion, paragraph-level source comparison, full stable check, preliminary Task validation, whitespace check, and four-path scope/protected-history audit.
- Completed final acceptance-to-matrix mapping, full four-path diff review, documentation-impact routing, terminal evidence review, and `DONE/PASSED` reconciliation.
- Revalidated the terminal pair and final workspace scope after the last evidence update.
- Preserved the completed four-path worktree through stash, created the correctly based Task 0022 branch, restored byte-identical content without conflict, removed the successful normalization stash, and recorded the original and final branch provenance without rewriting the starting-HEAD history.
- Directly reverified the old/new branch refs, commit ancestry, equal trees, dropped-stash object and path inventory, restored permanent-document blobs, current upstream, index, worktree, and untracked state before the final requested validation.
- Re-ran the complete Task 0022 acceptance, Task artifact, stable repository, whitespace, changed-path, staged-state, later-Task, and protected-path verification set on the normalized branch with no failure.

## Remaining

- No in-scope documentation work remains.
- Audit mutation-classifier completeness, interrupt-safe evaluator cleanup, release-isolation ambient-state attribution, SPEC §15 behavioral E2E, and a new full release-readiness gate remain unresolved outside Task 0022.

## Resume Point

Task 0022 is complete on `task/0022-permanent-truth-reconciliation` at and tracking `origin/main@4ab9fdb7118b4174244622b7124beb01e581af8a`. Do not infer release approval from this documentation reconciliation. Resume only if its four-path diff or recorded evidence is later invalidated.

## Blockers

- None.

## Final Result

COMPLETED
