# TASK 0021 — Audit Redirection Guard

## Status

IN_PROGRESS

## Goal

Make the development-only audit smoke distinguish executable output redirection from quoted or escaped literal `>` text in the supported Codex command-shell paths, while retaining fail-closed mutation enforcement and bounded, redacted, match-local diagnostics.

## Dependencies

- `0020-release-readiness-gate`
- `0018-audit-readonly-diagnostics`
- `0014-audit-readonly-contract`
- `../../../scripts/audit-smoke.mjs`
- `../../../test/audit-smoke.test.mjs`
- `../../../test/kyw-audit.test.mjs`
- `../../../package.json`
- `../../../.github/workflows/ci.yml`

## In Scope

- Preserve Task 0020's immutable candidate, `BLOCKED` result, and original failure evidence while correcting only the interpretation of `[matched=>]` in its post-candidate documentation.
- Replace whole-command regular-expression output-redirection matching with a dependency-free detector aligned to the command shell used by the audit-smoke executor: PowerShell grammar on Windows and POSIX shell grammar on non-Windows hosts.
- Detect executable `>`, `>>`, `1>`, `2>`, and `2>>` output-to-file operators without exempting an operator merely because its preceding character is `2`.
- Treat supported single-quoted, double-quoted, and shell-escaped `>` characters as literals, including JavaScript arrow text passed to `node -e`, while still detecting a later real redirection in the same command.
- Confirm the actual no-file-write behavior and existing intent of `2>&1` through the executor path and regressions, then encode its policy explicitly. Fail closed on unproven descriptor forms rather than broadening an exception.
- Retain the matched operator, exact zero-based command offset, quote/escape state, and bounded local context even when the match lies after the 600-character legacy preview boundary.
- Redact credential-shaped values and known user/temporary paths before diagnostic output and avoid retaining the whole command when match-local evidence is sufficient.
- Preserve the zero-attempt read-only contract, bounded fix-mode scope, fixture tree/Git-status invariants, authentication-source invariance, no-result-artifact failure behavior, and temporary-state cleanup.
- Add deterministic regressions for the complete requested matrix and rely on the existing Node 22/24 Windows, macOS, and Linux CI lanes for host coverage.
- Run one isolated read-only and one isolated fix model smoke with `gpt-5.6-sol` and high reasoning effort, comparing protected auth/config state, fixture tree hash, and Git status before and after each run.

## Out of Scope

- Re-evaluating release readiness, changing Task 0020 to ready, or repairing any new defect discovered by a model smoke.
- Prompt, Skill, rubric, model, or evaluator tuning unrelated to output-redirection classification and diagnostics.
- Weakening the audit read-only/fix mutation model, accepting final tree invariance as a substitute for zero attempts, or allowing file redirection by whitelist.
- Adding a production dependency unless investigation proves the dependency-free approach unsafe; any such discovery must be recorded before a dependency change.
- Rewriting or pushing `task/0020-release-readiness-gate`, amending/rebasing candidate `54b9f8207c51cbc22af2d0a1c3faac1f04b09310`, or performing a release action.
- Direct push to `main`, force-push, tags, npm publication, GitHub releases, or public plugin/marketplace submission.

## Acceptance Criteria

- [x] AC-01: `0021` is proven unused across Task directories and fresh local/remote refs; all initial staged, unstaged, and untracked changes are attributable; the dedicated branch starts at the exact Task 0020 candidate; and the reviewed Task 0020 evidence is preserved first in a documentation-only checkpoint without moving the old branch or SHA.
- [x] AC-02: Output-to-file detection follows the supported host shell's quote/escape rules and blocks real `> file`, `>> file`, `1>file`, `2>file`, and `2>>file` operators without a command-specific whitelist or new dependency.
- [x] AC-03: Quoted/escaped literal `>` text, including `node -e "const f = x => x"`, is not a mutation attempt, while a mixed command with a quoted literal followed by a real redirect is still blocked; supported single quote, double quote, escaped quote, and backslash cases are deterministic.
- [x] AC-04: The `2>&1` policy is grounded in the current executor/shell path and an actual shell regression, explicitly preserved or blocked, and does not create an exemption for `2>file`, `2>>file`, or unproven descriptor syntax.
- [x] AC-05: Each output-redirection reason records the exact operator and zero-based offset plus quote/escape state and bounded redacted local context, including a redirect beyond offset 600; diagnostics do not unnecessarily expose a whole command, credential, or normal user/temporary path.
- [x] AC-06: Read-only mode still fails on every executable file redirect or other mutation attempt, harmless literals no longer cause `READONLY_MUTATION_ATTEMPT`, fix-mode plan/scope checks remain unchanged, and tree/status/auth/no-artifact/cleanup invariants remain enforced.
- [ ] AC-07: Targeted regressions, the combined audit suite, every requested repository command, and supported-platform coverage pass with actual exit-code evidence.
- [ ] AC-08: One isolated read-only and one isolated fix smoke use `gpt-5.6-sol`/high and isolated auth/config; each has before/after fixture tree, Git status, and protected auth/config evidence. A newly discovered defect makes this Task `BLOCKED` without an in-Task chained fix.
- [ ] AC-09: The final diff maps completely to this scope and intent-to-test matrix, affected permanent documents are synchronized, exact commits are recorded and intentionally committed, and the dedicated branch is pushed normally without any release-readiness verdict or forbidden action.

## Plan

- [x] Verify `0021` availability from Task directories, refreshed local/remote refs, default-branch contents, and reachable history; audit staged, unstaged, and untracked provenance.
- [x] Read the permanent documents, Task 0020 evidence, Tasks 0014/0018 audit contracts, and the explicitly related runner, tests, Skill/reference, package, and CI paths.
- [x] Create `task/0021-audit-redirection-guard` at exact candidate `54b9f8207c51cbc22af2d0a1c3faac1f04b09310` and commit the reviewed Task 0020 post-candidate evidence as a documentation-only checkpoint.
- [x] Create this Task/Test pair together and map every acceptance criterion before implementation changes.
- [x] Implement the smallest dependency-free shell-aware detector and match-local diagnostic changes.
- [x] Add and run the requested deterministic regression matrix and supported-shell execution check.
- [ ] Run the combined audit suite and all repository verification commands under isolated npm/config state.
- [ ] Snapshot protected state, run one read-only and one fix model smoke, and compare every required invariant.
- [ ] Review the final diff against scope/matrix, synchronize affected permanent documents, record exact evidence and commits, commit intentionally, and push the dedicated branch normally.

## Decisions

- Task 0020 remains `BLOCKED`. Its `[matched=>]` string is evidence that the diagnostic label `matched=` was followed by a captured `>`; it is not evidence of a literal `=>` token because the retained preview lacks the match offset and quoting context.
- The smoke analyzes `command_execution.item.command` after Codex execution. The current Windows evidence uses PowerShell commands; non-Windows CI uses the POSIX command path. Detection therefore needs explicit host-shell lexical rules rather than one cross-shell regex.
- Implement a small stateful scanner with Node built-ins rather than adding a parser dependency. If investigation shows that the actual command representation cannot be classified safely this way, stop and record the conflict before implementation broadens.
- Preserve exact `2>&1` as descriptor duplication only after an actual supported-shell regression proves it routes streams without naming a file. Other descriptor forms remain fail-closed unless separately proven inside this Task's tests.
- Diagnostic offsets are zero-based JavaScript string offsets into the original command. Local context is bounded independently of the legacy 600-character preview and redacted before formatting.
- No production or development dependency is planned.

## Risks

- PowerShell and POSIX shells use different escape characters and quote rules; applying one grammar everywhere can either miss a write or recreate the false positive.
- Nested shell evaluation, substitutions, comments, and malformed quoting can make a lightweight scanner unsafe if its supported boundary is implicit. Unsupported or ambiguous syntax must fail closed and receive regression coverage when encountered.
- Redaction can change displayed context length, so offsets must continue to refer explicitly to the original command rather than the rendered diagnostic string.
- Model output is nondeterministic. Deterministic regressions are required even if the original model symptom does not recur, and any new model-smoke defect blocks rather than expanding scope.
- Normal Codex session/log state may change concurrently. Protected evidence must distinguish explicitly snapshotted auth/config inputs from unrelated volatile activity.

## Discoveries and Changes

- Local Task directories ended at `0020`; live remote refs, refreshed local/remote refs, `origin/main`, and reachable history contained no `0021` Task or ref.
- Initial HEAD was exact Task 0020 candidate `54b9f8207c51cbc22af2d0a1c3faac1f04b09310` on `task/0020-release-readiness-gate`. The only dirty paths were the expected unstaged Task 0020 `TASK.md` and `TEST.md` post-candidate evidence; the index and untracked set were empty.
- The Task 0020 evidence had four statements that treated the diagnostic rendering as a literal arrow. They now preserve the same failure, attempt count, invariants, and `BLOCKED` result while explaining the `matched=` label/captured-operator ambiguity and missing offset/context.
- New branch `task/0021-audit-redirection-guard` was created directly at the candidate. Documentation-only checkpoint `4eaccce3c466f206bbc398958fe7744d5018fe61` contains only the two reviewed Task 0020 evidence files. Local and remote Task 0020 refs remain at the candidate SHA.
- The defect is isolated to `OUTPUT_REDIRECTION_PATTERN` and `commandMutationReasons` in the development-only smoke runner. The model command is executed by Codex inside the existing outer sandbox; the runner then analyzes emitted command events and separately enforces tree, Git-status, plan-order, repair-scope, auth, artifact, and cleanup invariants.
- The old `/(?:^|[^2])(>{1,2})(?!&1)/` pattern neither tracks quotes/escapes nor reports capture offsets. It can misclassify quoted `>` and can miss `2>file`/`2>>file` solely because `2` precedes the operator.
- Existing repository evidence contains no deterministic `2>&1` policy test. Task 0020's prepared read-only registry probe uses `2>&1`, and the old negative lookahead shows an intended `>&1` exception; this Task must verify that intent through the actual host shell before encoding it.
- Replaced the regex with a dependency-free PowerShell/POSIX lexical scanner. It tracks native quotes/escapes, scans executable command substitutions/subexpressions, ignores POSIX arithmetic comparisons, and recursively analyzes quoted scripts passed through supported `sh`-family `-c` or PowerShell `-Command` launchers while mapping every nested match back to the original command offset.
- The scanner exempts only boundary-valid exact `2>&1`. `2>file`, `2>>file`, `2>&2`, and `1>&2` remain fail-closed. A native Windows PowerShell 5 probe proved that `2>&1` creates no file and exposes the stderr payload; PowerShell 5 reports wrapper exit 1 as `NativeCommandError` while newer/native POSIX paths may report 0, so the regression accepts only that documented 0/1 host distinction while still requiring no process-launch error, observable output, and an empty fixture directory.
- Output-redirection diagnostics no longer include the general 600-character command preview when match-local evidence is sufficient. Each match carries operator, original zero-based offset, effective shell, descriptor, quote/escape state, nested evaluation state when applicable, and at most 160 original characters around the match; existing credential/path redaction runs after formatting.
- The first focused run passed 9/10 and exposed only the PowerShell 5 fd-duplication exit-code difference above. After aligning the regression with the no-file-write policy, focused tests passed 10/10; the combined audit suite passed 19/19, lint passed 35 JavaScript modules plus foundation metadata, and format passed 165 UTF-8/LF files.

## Documentation Impact

- SPEC: Expected unchanged. The product's strict read-only and exact-fix behavior does not change.
- ARCHITECTURE: Updated to describe host-shell lexical classification, nested executable shell handling, exact `2>&1` policy, and match-local diagnostic evidence in the development-only audit smoke boundary.
- README: Updated because the documented audit-smoke classification and failure-output fields now name the shell/operator/offset/context behavior precisely.
- AGENTS: Expected unchanged. Repository-wide workflow and completion rules remain accurate.

## Completed

- Completed number/ref/provenance preflight, required source reading, defect-path investigation, branch creation, and the separate Task 0020 documentation-only checkpoint.
- Created this Task/Test contract before changing implementation or tests.
- Implemented the dependency-free shell-aware detector, narrow fd-duplication policy, bounded match-local diagnostics, requested regression matrix, and affected README/Architecture synchronization.
- Passed syntax checks, focused 10/10, combined audit 19/19, preliminary full 133/133, lint, format, pack, Task validation, and diff-whitespace checks.

## Remaining

- Run deterministic, repository-wide, packaging, platform, and isolated model verification.
- Complete final scope/document/evidence review, intentional commits, and normal branch push.

## Resume Point

Review the four-path implementation/permanent-document diff, refresh this pair, form and record the immutable implementation candidate, then verify that exact SHA from an isolated clean worktree. Preserve Task 0020 refs and do not perform any release-readiness action.

## Blockers

- None currently.
