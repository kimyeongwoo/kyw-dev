# TASK 0018 — Audit Read-Only Diagnostics

## Status

DONE

## Goal

Identify the evidence-backed cause of Task 0016's `READONLY_MUTATION_ATTEMPT`, restore the `$kyw-audit` read-only contract with the smallest justified change, and retain redacted failure diagnostics without publishing failed-run artifacts.

## Dependencies

- `0014-audit-readonly-contract`
- `0016-release-readiness-gate`

## In Scope

- Extend `scripts/audit-smoke.mjs` so a failed mutation classification reports the offending command or `file_change` kind, event index, detector reason, and before/after tree and Git-status invariance.
- Redact credentials and absolute user/temporary paths from all retained error output.
- Preserve the existing contract that an unsuccessful model run publishes no result artifact and removes its temporary repository, HOME, Codex, npm/control, authentication-copy, JSONL, and final-message state.
- Add synthetic JSONL regression coverage for command and `file_change` classification, structural detector behavior, diagnostics, and redaction.
- Reproduce a fresh isolated read-only smoke and classify the evidence as an actual mutation attempt, a detector false positive, or unresolved.
- If evidence proves an actual mutating command, minimally strengthen the `kyw-audit` read-only command boundary. If it proves a false positive, structurally repair the detector without command-string whitelisting. If it proves neither, record `BLOCKED` without speculative Skill changes.
- Re-run the deterministic audit suite, fresh read-only smoke, and explicit-fix smoke, then synchronize only affected durable documentation.

## Out of Scope

- Changing audit findings, repair eligibility, accepted repair paths, or the exact `--fix` authorization grammar.
- Weakening the zero-attempt read-only requirement or accepting unchanged bytes as a substitute for zero mutation attempts.
- Implementing or repairing Task 0016's unrelated release, CI, grilling, distribution-isolation, or publication blockers.
- Publishing npm packages, creating or pushing tags, creating releases, or submitting plugins.
- Saving complete failed model artifacts, raw JSONL, raw final messages, credentials, or normal user paths.

## Acceptance Criteria

- [x] AC-01: A mutation-attempt failure emits a bounded redacted diagnostic naming the offending command or `file_change` kind, zero-based event index, structural detector reason, and whether tree hash and Git status were each invariant before/after.
- [x] AC-02: Diagnostic output and tests prove credential values plus absolute user, fixture, temporary, authentication-source, HOME, and Codex/npm/control paths are absent; failed model execution still publishes no result artifact and cleans temporary state.
- [x] AC-03: Synthetic JSONL regressions cover non-mutating commands, structurally classified mutating commands, output redirection, `file_change` events, multiple attempts in event order, and redacted diagnostic formatting without broad string whitelists.
- [x] AC-04: A fresh isolated read-only smoke identifies the Task 0016 failure cause from retained redacted evidence. Any production Skill or detector change follows only the matching evidence branch; an unresolved cause leaves this Task `BLOCKED` without speculative Skill edits.
- [x] AC-05: The final fresh read-only smoke has observable installed-Skill source-read proof, mutation attempt count `0`, identical before/after fixture tree SHA-256, identical before/after Git status, and final verdict `BLOCKED`.
- [x] AC-06: The final explicit-fix smoke has observable installed-Skill source-read proof, a finding-specific bounded repair plan before the first mutation, changes only the configured allowed/required repair paths while preserving unrelated bytes, passes the fixture test, and ends `PASS`.
- [x] AC-07: The synthetic/focused audit tests, complete deterministic audit suite, and all four stable repository commands pass on the final tree, with exact executed evidence recorded in `TEST.md`.
- [x] AC-08: The final diff contains only Task 0018 work and necessary audit contract/document synchronization, preserves pre-existing user changes and normal HOME/Codex/npm state, and performs no publish/tag/release action.

## Plan

- [x] Read and reconcile the permanent documents, Tasks 0014/0016/0017 evidence, canonical audit Skill/reference, smoke runner, tests, and fixture.
- [x] Confirm Task 0018 was absent and create this Task/Test pair before implementation.
- [x] Refactor mutation analysis into evidence-bearing structural classifications and add bounded redacted failure diagnostics.
- [x] Add synthetic regression tests and run the focused deterministic checks.
- [x] Create isolated temporary HOME/Codex/npm/authentication state and run one fresh read-only smoke to collect the cause.
- [x] Apply only the evidence-authorized minimal Skill or detector correction, or record an unresolved blocker without guessing.
- [x] Run final read-only and explicit-fix smokes plus deterministic/stable verification.
- [x] Review the final diff, synchronize affected documents, and record terminal evidence and user-state preservation.

## Decisions

- Event indexes in diagnostics are zero-based because `analyzeEvents` and plan ordering use the JSONL array index.
- A detector reason is a stable structural rule identifier plus concise explanation, not merely a repeated verdict.
- Diagnostics may retain only the minimum offending event fields and invariance booleans; raw event streams and full failed final messages remain ephemeral.
- Command detection must classify command structure. A false positive is not repaired by adding the observed complete command to an allowlist.
- Read-only success requires both no detected attempt and unchanged final bytes/status. An OS sandbox denial does not erase an attempted mutation.
- Use the Task 0016 proven model family/effort when available, but establish authentication only in an explicit temporary source and never inspect or mutate normal Codex state.
- No production dependency is required.

## Risks

- Shell syntax varies across PowerShell/POSIX commands; an overbroad regex can misclassify quoted text or a detector test command as mutation.
- Model output is nondeterministic, so one clean run must still retain sufficient source-read and invariant evidence.
- Error-path diagnostics can leak credentials or host paths unless every offending field is redacted before formatting.
- Fix-mode event counts may include multiple events for one logical edit; ordering and path invariants matter more than a fixed positive count.

## Discoveries and Changes

- Task 0016 recorded only the aggregate `READONLY_MUTATION_ATTEMPT` code. It retained no offending event, event index, or detector rationale, while confirming authentication-source and fixture bytes were unchanged and no failed result artifact was published.
- The current detector combines a broad mutating-command regular expression with a separate output-redirection regular expression and records only `{ index, command }`; `file_change` records only `{ index }`. The failure path discards these details before cleanup.
- The permanent Spec, Architecture, README, canonical Skill, and audit reference agree that bare audit permits no mutating command attempt and that exact `--fix` repair behavior must remain bounded.
- The repository began Task 0018 with extensive pre-existing tracked and untracked work from earlier Tasks. Those changes are user-owned baseline state and will not be reset, staged, or absorbed.
- Synthetic diagnostics initially missed a JSON-escaped Windows path even though its raw form was in the explicit redaction set. Known-path redaction now covers raw, slash-normalized, backslash-normalized, and JSON-escaped forms; the focused regression proves credentials plus Windows/POSIX paths are absent.
- The first instrumented fresh read-only run failed with four classified events while keeping tree SHA-256 exactly `769990ad4fad1fde26183ae45454e9ead6b33be9d7fa822261a2d30d87428ee7` and Git status invariant. Retained events 38 and 39 contain the same PowerShell isolation command, which actually attempts `New-Item`, `Copy-Item`, and `Remove-Item` around a temporary source/test rerun. This is an actual mutation attempt outside the repository, not a detector false positive.
- The Skill/reference currently permit the audit to prepare an isolated copy for a potentially writing rerun. That permission conflicts operationally with the stronger zero-mutation-attempt smoke contract. The evidence-authorized fix is to require retained evidence or an explicitly supplied pre-existing disposable copy and forbid the bare audit itself from creating, populating, or cleaning isolation state.
- The implemented boundary is stricter and simpler than the initial option above: a bare audit does not create, populate, run against, or clean an isolated copy at all. A potentially writing rerun uses retained reproducible evidence or is skipped with an explicit limitation. This removes the contradictory permission without changing repair mode.
- The post-fix fresh read-only smoke passed in 184 seconds with `skillSourceRead=true`, mutation attempt count `0`, no changed path, identical tree SHA-256 `5ed025d5df75f9c55ac60cee252b8724383e8ec8077b61a8f04254f598004782`, identical Git status, and final `BLOCKED`.
- The post-fix explicit-fix smoke passed in 229.1 seconds with `skillSourceRead=true`, `planBeforeMutation=true`, six mutation events, exactly the four configured Task-owned changed paths, preserved unrelated paths, a passing direct fixture test, and final `PASS`.

## Documentation Impact

- SPEC: Updated because the user-visible bare-audit no-attempt boundary now explicitly covers temporary/control/isolation state and potentially writing reruns must be skipped.
- ARCHITECTURE: Updated for the zero-mutation isolation boundary and the development-only harness's bounded redacted failure diagnostic.
- README: Updated for bare-audit rerun behavior and the smoke's success/failure output contract.
- AGENTS: Unchanged; repository-wide workflow and completion rules remain the same.

## Completed

- Read every user-required source and relevant fixture completely.
- Reconciled the audit contract and isolated the missing diagnostic evidence path.
- Confirmed Task 0018 was absent and created its Task/Test pair together before implementation.
- Implemented reason-bearing ordered mutation diagnostics, credential/path redaction, tree/status invariance output, and error-path sanitization without retaining a failed-run artifact.
- Passed the focused 7/7 and complete deterministic audit 16/16 suites.
- Reproduced the Task 0016 failure under isolated state and classified it from redacted evidence as a real temporary-copy mutation attempt.
- Strengthened only the evidence-authorized Skill/reference boundary, synchronized SPEC/Architecture/README, and added a deterministic contract assertion; detector classification was not whitelisted or relaxed.
- Passed the required post-fix fresh read-only and explicit-fix smokes under the same isolated authentication source.
- Passed the evidence-complete stable sequence with `npm test` 124/124, lint 33 JavaScript modules plus foundation metadata, format 157 UTF-8/LF files, and pack check 29 files/59,847 bytes, all with isolated HOME/Codex/npm/TEMP state.
- Reviewed the Task 0018 audit-specific diff against the initial status. Only the declared harness/tests, Skill/reference, SPEC/Architecture/README, and new Task/Test pair were touched by this Task; every unrelated initial tracked/untracked status entry remains present and no new repository artifact was created.
- Re-ran the final stable sequence after terminal evidence preparation: 124/124 tests, lint 33 modules plus metadata, format 157 files, and pack check 29 files/59,850 bytes. Task validation and `git diff --check` passed before the terminal status update and are rerun afterward.
- Logged out the isolated Codex home, verified zero remaining `auth.json` files, and removed the exact link-free Task isolation root after bounded identity checks. Normal HOME/Codex/npm state was never used as writable state, and no publish, tag, release, or submission command ran.

## Remaining

- None.

## Resume Point

Task 0018 is complete. Use this Task/Test pair as the diagnostic and smoke evidence for the audit read-only release blocker; do not rerun model smoke unless audit inputs or the target CLI/model change.

## Blockers

- None.
