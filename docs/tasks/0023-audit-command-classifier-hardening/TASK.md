# TASK 0023 — Audit Command Classifier Hardening

## Status

DONE

## Goal

Make the development-only audit smoke classify ordinary local Codex command mutations through one shell-aware recursive parse so command-position mutators, unsupported launchers, unquoted here-document expansions, and real redirects fail closed while quoted output text and quoted here-document bodies remain non-mutating.

## Dependencies

- `../../../AGENTS.md`
- `../../../README.md`
- `../../SPEC.md`
- `../../ARCHITECTURE.md`
- `../0020-release-readiness-gate/TASK.md`
- `../0020-release-readiness-gate/TEST.md`
- `../0021-audit-redirection-guard/TASK.md`
- `../0021-audit-redirection-guard/TEST.md`
- `../0022-permanent-truth-reconciliation/TASK.md`
- `../0022-permanent-truth-reconciliation/TEST.md`
- `../../../scripts/audit-smoke.mjs`
- `../../../test/audit-smoke.test.mjs`
- `../../../test/kyw-audit.test.mjs`
- `../../../skills/kyw-audit/SKILL.md`
- `../../../skills/kyw-audit/references/audit.md`
- `../../../package.json`

## In Scope

- Replace raw whole-command substring matching for general mutators with executable-token classification built on the same PowerShell/POSIX lexical model used for output redirection.
- Classify mutators and supported nested launchers only at executable command positions, including command starts after separators, pipelines, and control operators; normalize quoted POSIX executables, supported PowerShell call-operator targets, and absolute/relative path basenames without treating ordinary arguments as commands.
- Recursively apply the complete mutation grammar to literal scripts supplied to supported POSIX shell `-c` options and PowerShell `-Command`/supported aliases, preserving original-command source mapping.
- Recognize PowerShell encoded-command options without decoding or exposing their payloads, and fail closed when a supported launcher command-mode option is dynamic.
- Detect the required nested commands `bash -lc 'git push origin main'`, `sh -c 'rm -f x'`, and `pwsh -Command 'Set-Content out.txt x'`.
- Keep quoted command-like text non-mutating, including `printf '%s\\n' 'Never run git push origin main'` and benign PowerShell output strings.
- Recognize ordinary POSIX here-documents used to feed Python or Node so quoted-delimiter bodies are literal data; inspect executable command/backtick substitutions in unquoted bodies while ignoring comparison/arrow `>` data and still classifying executable redirects outside the body.
- Preserve detection of `2>file` and `2>>file`; exempt only boundary-valid exact `2>&1`.
- Preserve quoted JavaScript arrows, shell-native escaped literal `>` text, substitutions/subexpressions, arithmetic, and existing file-redirection behavior.
- Emit nested mutation diagnostics whose offsets and bounded context refer to the original command, not a decoded inner-script copy.
- Treat malformed or unsupported explicit nested-command grammar as a mutation-classifier failure reason rather than a false read-only pass.
- Keep existing command-mutation, `file_change`, read-only tree/status/auth, fix plan ordering, repair scope, no-artifact, and cleanup enforcement unchanged.
- Add acceptance-specific regressions that assert observable `analyzeEvents` and diagnostic results rather than reproducing parser internals.

## Out of Scope

- Decoding encoded commands, expanding variables or aliases, resolving sourced scripts, or defending against a hostile command author. Encoded-command and dynamic launcher-option boundaries are recognized only to fail closed.
- General-purpose complete Bash, POSIX shell, or PowerShell parsing beyond ordinary literal commands emitted by local Codex.
- Changing the packaged `kyw-audit` Skill workflow, its read-only/fix authorization model, fixture product behavior, or model prompts.
- Running a model-backed audit smoke or claiming model evidence; deterministic classifier and repository checks are the required evidence for this Task.
- Adding a production or development dependency unless the dependency-free design proves unsafe and the package/distribution boundary is first reconciled in this Task.
- Signal-safe evaluator cleanup, release-isolation attribution, release-readiness re-gating, or any Task 0024-or-later implementation.
- Commit, push, merge, rebase, force operation, tag, npm publish or publish dry-run, GitHub Release, public submission, or manual workflow dispatch.

## Acceptance Criteria

- [x] AC-01: Preflight proves a clean synchronized `origin/main` base, Task 0022 merge plus exact-merge post-merge CI success, unused number `0023`, and no existing 0023 Task/branch/PR; the requested branch and Task/Test pair are created from that base before implementation.
- [x] AC-02: The observable event classifier detects all required command-position and nested mutators, including quoted/path executables and supported PowerShell call-operator targets, while ignoring mutator or launcher text in ordinary arguments; supported literal `-c`/`-Command` scripts receive the same recursive grammar.
- [x] AC-03: Quoted literal command text and ordinary command arguments are not classified as mutators, including the required POSIX `printf` commands, benign PowerShell output strings, and the existing quoted arrow/string regressions.
- [x] AC-04: Quoted-delimiter here-document bodies remain literal, unquoted command/backtick substitutions cannot silently pass, Python/Node comparison or arrow `>` data remains non-mutating, comment text is not a declaration, and a real redirect outside the body is detected at its original command offset.
- [x] AC-05: `2>file` and `2>>file` remain detected, only exact boundary-valid `2>&1` is exempt, near-miss descriptor forms remain blocked, and existing supported output redirect, quote, escape, substitution, arithmetic, and descriptor-like argument behavior does not weaken.
- [x] AC-06: Nested mutator, redirect, and unsupported-grammar diagnostics retain the matched grammar or issue, shell/evaluation state, exact zero-based offset, and bounded context from the original command while preserving payload redaction and bounded-output behavior.
- [x] AC-07: Encoded-command options, dynamic launcher command-mode options, unterminated quotes, a missing nested script, recursion-limit overflow, or another explicitly unsupported bounded form yields a fail-closed classifier reason and cannot leave a read-only event falsely mutation-free.
- [x] AC-08: Existing mutation-event, `file_change`, plan-before-mutation, repair-scope, tree/status/auth, no-artifact, and cleanup checks remain present and the combined audit regressions pass.
- [x] AC-09: No dependency is added; focused acceptance tests, the combined audit suite, full `npm run check`, Task validation, `git diff --check`, and final diff-to-matrix coverage all pass, with only affected README/Architecture truth synchronized and no forbidden external action.

## Plan

- [x] Fetch origin and verify clean state, synchronized main, Task 0022 merge/CI, Task-number availability, and absence of a 0023 branch/Task/PR.
- [x] Read AGENTS, permanent documents, Tasks 0020–0022, the audit Skill/reference, classifier source/tests, Task helper boundary, and package scripts.
- [x] Create this Task/Test pair atomically and complete the acceptance criteria and intent-to-test matrix before implementation.
- [x] Refactor mutation classification around one dependency-free shell-aware parse with source offsets, here-document spans, and recursive literal-script analysis.
- [x] Add observable acceptance-specific nested, literal, here-document, redirect, diagnostic, and fail-closed regressions.
- [x] Run syntax, focused, combined audit, Task validation, full repository, formatting/whitespace, and final scope/coverage checks.
- [x] Synchronize only affected permanent documents, record exact evidence and residual risk, and reconcile terminal Task/Test state.
- [x] Record independent audit F-01 through F-04 and the read-only failing baseline before repair.
- [x] Repair command-position, unsupported-launcher, and here-document execution semantics within the existing dependency-free parser.
- [x] Add durable observable regressions, synchronize README/Architecture, rerun every required gate, and re-audit the final six-path diff.

## Decisions

- General mutators and file redirects will consume one shared shell tokenization/parsing result instead of independently scanning raw substrings.
- Tokens retain original source offsets and quote/escape state. Nested literal scripts retain an index map to the outer command so diagnostics never report inner-copy coordinates as original coordinates.
- Supported recursion is bounded and limited to explicit shell launchers already in scope. A parse ambiguity at that explicit boundary fails closed instead of being ignored.
- POSIX here-document recognition is structural: delimiter declarations and terminator lines delimit data spans; the classifier does not interpret Python or JavaScript syntax inside a body.
- Quoted here-document spans are skipped as literal data. Unquoted spans are not parsed as program source; only executable command/backtick substitutions are recursively analyzed with original offsets, leaving ordinary Python/JavaScript comparison and arrow text alone.
- Encoded PowerShell payloads are never decoded. Their recognized option token produces match-local unsupported-grammar evidence that omits the payload, while a dynamic launcher option fails closed without attempting expansion.
- Exact `2>&1` remains the only descriptor-duplication exception. Similar descriptor syntax stays fail-closed.
- The implementation remains dependency-free; `scripts/` and `test/` are development-only package-excluded surfaces, and no packaged boundary needs a new runtime module.
- The user's detailed invocation supplies the shared-understanding confirmation, so the atomically created `DRAFT` pair moved together into execution state only after this complete contract was written.

## Risks

- Shell quoting, here-document delimiters, and launcher option forms interact; a partial parse could trade a false negative for a false positive.
- PowerShell and POSIX escaping differ, and nested scripts can change dialect independently of the outer command.
- Source mapping through nested quoted tokens can become incorrect when escape sequences collapse multiple source characters.
- Failing closed too broadly could reject benign ordinary Codex commands; the bounded unsupported cases need explicit reasons and regression evidence.
- Model output can contain opaque or dynamic syntax outside this normal-local-command scope; the outer sandbox and final tree/status invariants remain separate backstops but are not substituted for deterministic classifier evidence.

## Discoveries and Changes

- `git fetch origin --prune` succeeded. The starting checkout and index were clean; local `main` fast-forwarded safely from `f5e35fe...` to `origin/main` without a content conflict.
- Task 0022 merged through PR `#5` at merge commit `611a1d73839fe968662677d40ef355478781bc1b`. Exact-merge push CI run `29673536817` completed successfully with all nine required jobs successful.
- Local/remote Task directories and refs end at `0022`; `origin/main` contains no `0023-*` path; exact and general GitHub PR searches found no 0023 PR; local and remote branch searches found no 0023 branch.
- Branch `task/0023-audit-command-classifier-hardening` was created from and initially tracks `origin/main@611a1d73839fe968662677d40ef355478781bc1b`.
- The Task helper rendered both canonical templates into one staging directory and published them with a single directory rename. Its create command returned ID `0023` and slug `audit-command-classifier-hardening`.
- The current output-redirection scanner follows host quote/escape rules and recursively remaps supported quoted scripts, but general mutators still use `MUTATING_COMMAND_PATTERN` against the raw whole command. That split explains both nested false negatives and quoted-literal false positives.
- The current shell scanner treats every executable-looking `>` outside quotes as a redirect and has no here-document body state, so Python/Node body comparisons can be misclassified.
- Replaced both paths with one dependency-free source-mapped lexical classifier. It tokenizes executable PowerShell/POSIX shell regions, records mutator/redirection/unsupported-grammar evidence, recursively analyzes substitutions and supported literal shell scripts, and maps decoded inner characters back to original command offsets.
- POSIX here-document preprocessing now records delimiter/body/terminator spans before lexical classification. Body text is skipped as data; scanning resumes after the terminator. Bash here-strings and POSIX arithmetic left shifts remain separate from here-documents.
- General-mutator diagnostics now carry the same original offset, effective shell, quote/evaluation state, and bounded context model as redirects. Structured mutator/redirect/issue evidence suppresses the legacy whole-command preview when local evidence is sufficient.
- Explicit nested boundaries fail closed for a missing script, unterminated quote/substitution/arithmetic/here-document, source-map failure, or recursion overflow.
- An explicit nested script that depends on outer-shell expansion, such as `bash -lc "$script"`, now yields `NESTED_SCRIPT_DYNAMIC_UNSUPPORTED`; it is not treated as an empty safe literal. Existing wrapper-style `env bash -lc ...` recursion remains covered.
- The first post-refactor focused run passed 9/10. The only failure was the pre-existing exact-object assertion for `MUTATING_COMMAND_GRAMMAR`, which correctly observed the newly added `mutators` evidence field. No behavior case failed; the assertion was changed to validate the stable reason plus observable structured fields.
- Final acceptance-specific classifier tests pass 3/3, the complete focused file passes 13/13, and the combined audit suite passes 22/22. The final full `npm run check` passes 136/136 tests, lint over 35 modules plus metadata, format over 169 files, and pack validation over 29 files/60,748 bytes.
- README and Architecture received targeted classifier/diagnostic updates. SPEC and AGENTS behavior remains unchanged, and no dependency or packaged runtime path changed.
- Final scope review found exactly six paths: README, Architecture, classifier source/test, and this Task/Test pair. The index is empty; package/lockfile/Skill/runtime/template diffs and Task 0024-or-later directories are zero. `git diff --check` passes.
- No model smoke ran, so no model evidence is marked PASS. No commit, push, branch integration, tag, publish/dry-run, Release, submission, or manual workflow dispatch occurred; the only default-branch update was the required pre-Task local fast-forward to fetched `origin/main`.
- A later independent read-only audit returned `BLOCKED` with F-01 through F-04: the parser classified arguments as executables while missing quoted/path command tokens; encoded and dynamic launcher options silently passed; every here-document body was skipped despite unquoted executable expansions; and durable observable regressions did not cover the required boundaries.
- Repair preflight reconfirmed branch `task/0023-audit-command-classifier-hardening`, HEAD `611a1d73839fe968662677d40ef355478781bc1b`, zero staged paths, the exact six authorized changed paths, and zero Task 0024-or-later directories.
- The corrected read-only baseline probe executed 16 observable checks and exited 1 with 15 failures spanning F-01 through F-03. Its first invocation also exited 1 but mislabeled the 16 executed checks as 18; that harness-only count was corrected without changing a repository byte, and both attempts are retained in `TEST.md`.
- F-01 is resolved: a command-position pass now follows separators, pipelines, control/group operators, and redirection operands; mutators and nested launchers consume only those positions. Static quoted POSIX executables, PowerShell `&` targets, and path basenames classify correctly, while ordinary argument keywords are ignored. Existing explicit `env` launcher wrapping remains narrowly supported.
- F-02 is resolved: `-EncodedCommand` and `-enc` on `pwsh`/`powershell` emit `ENCODED_COMMAND_UNSUPPORTED` without decoding or retaining payload context; a dynamic launcher option emits `LAUNCHER_OPTION_DYNAMIC_UNSUPPORTED`. Ordinary static launcher options continue without a blanket failure.
- F-03 is resolved: here-document discovery ignores comment text and preserves delimiter quote state. Quoted bodies remain literal; unquoted bodies recursively analyze only command/backtick substitutions with original source maps, leaving Python/Node comparisons and arrows as data. Malformed terminators still fail closed.
- F-04 is resolved with five durable `audit repair` tests over only `analyzeEvents()` and final diagnostic output: command positions, unsupported launchers, here-documents, descriptor boundaries, and long nested original-offset/context evidence.
- Final syntax checks passed 2/2; focused repair tests passed 5/5; `test/audit-smoke.test.mjs` passed 18/18; combined audit tests passed 27/27; and standalone `test/kyw-audit.test.mjs` passed 9/9.
- The first final `npm run check` reached 140/141 tests and failed only the pre-existing release-isolation ambient-state sentinel with `NORMAL_STATE_CHANGED: normal-codex`. Status immediately afterward still contained exactly the six authorized paths and no staged entry. The no-edit retry passed 141/141, lint over 35 modules plus metadata, format over 169 files, and pack validation over 29 files/61,103 bytes.
- The Task artifact validator returned `valid: true`; `git diff --check` exited 0; final scope inspection found exactly six allowed paths, zero unexpected/missing/staged paths, and zero Task 0024-or-later directories.

## Documentation Impact

- SPEC: Unchanged; the strict zero-attempt read-only behavior and audit authorization contract do not change.
- ARCHITECTURE: Updated minimally for command-position classification, quoted/path executables, encoded/dynamic launcher fail-closed behavior, quoted/unquoted here-document semantics, deterministic-only evidence, and the unchanged interruption/release-isolation limitations.
- README: Updated with the matching user-facing classifier boundary, no-model-smoke evidence, preserved Task 0020 `BLOCKED` state, and unresolved interruption-cleanup/release-isolation risks.
- AGENTS: Unchanged; repository-wide invariant behavior and completion rules do not change.

## Completed

- Completed every requested preflight condition and recorded the exact base, merge, CI, collision, and clean-state evidence.
- Read and reconciled the authorized permanent, Task, audit, test, helper, and package sources.
- Created the requested branch and atomically published this Task/Test pair.
- Completed the implementation contract and acceptance-to-test mapping before any source, test, or permanent-document implementation change.
- Implemented the shared recursive classifier, here-document spans, fail-closed issues, and original-command diagnostic evidence without a dependency.
- Added the requested observable nested/literal/here-document/redirect/diagnostic/malformed regressions and retained the initial assertion-shape failure.
- Synchronized the affected README and Architecture descriptions.
- Passed final syntax, acceptance-focused, focused audit, combined audit, full stable repository, Task validation, whitespace, dependency/package, later-Task, and changed-path coverage gates.
- Reviewed every changed behavior and path against T-01 through T-10 and confirmed that existing read-only/fix plan, scope, tree/status/auth, artifact, and cleanup enforcement is unchanged.
- Recorded and resolved independent audit F-01 through F-04 without modifying Skills, runtime, templates, package metadata, workflows, prior Tasks, or any later Task path.
- Added command-position/path/call-operator, encoded/dynamic launcher, quoted/unquoted here-document, descriptor-boundary, and long nested diagnostic regressions through exported observable behavior only.
- Retained the failed baseline probes and the first ambient-state `npm run check` failure, then recorded the successful no-edit retry and every requested verification result.

## Remaining

- None.

## Resume Point

Task 0023 is complete on the uncommitted six-path worktree. Preserve the retained baseline failures and ambient-state retry evidence. Task 0020 remains `BLOCKED`; encoded payload decoding, alias/variable expansion, sourced scripts, hostile-parser completeness, model smoke, interruption cleanup, release-isolation attribution, and release re-gating require separate authorization without creating Task 0024 implicitly.

## Blockers

- None for Task 0023. The release-readiness, interruption-cleanup, and release-isolation limitations above remain outside this Task.

## Final Result

COMPLETED
