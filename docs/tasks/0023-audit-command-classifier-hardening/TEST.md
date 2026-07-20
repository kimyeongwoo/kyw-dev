# TEST 0023 — Audit Command Classifier Hardening

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Repository rules: `../../../AGENTS.md`
- User-facing behavior: `../../../README.md`
- Prior failure/remediation evidence: Tasks `0020`, `0021`, and `0022`
- Classifier implementation: `../../../scripts/audit-smoke.mjs`
- Focused and audit contract tests: `../../../test/audit-smoke.test.mjs` and `../../../test/kyw-audit.test.mjs`
- Package/check boundary: `../../../package.json`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — base, prior merge/CI, number, branch, and atomic pair provenance are valid | Inspect fetched refs, porcelain/index, exact SHAs, Task tree, local/remote branches, all-state PR search, PR #5 merge metadata, exact-merge CI jobs, and Task-helper publication result | Provenance/Audit | PASS | Clean `main=origin/main=611a1d7...`; PR #5 merged; run `29673536817` exact SHA and 9/9 success; no 0023 collision; branch created at that base; helper atomically returned the 0023 pair. |
| T-02 | AC-02 — command-position and supported nested scripts receive the complete mutation grammar | Feed quoted/path executables, starts after separators/pipelines/control operators, POSIX/PowerShell literal launchers, and PowerShell call-operator targets to `analyzeEvents`; require original-position mutator evidence while ignoring launcher text in arguments | Unit/Security | PASS | Repair-focused command-position group passes inside final 5/5; quoted/relative/absolute/path and call-operator commands block, nested depth/offsets are exact, and argument text remains safe. |
| T-03 | AC-03 — quoted command-like output and ordinary arguments remain benign | Feed required POSIX `printf` arguments, nested-launcher argument text, benign PowerShell output arguments/strings, and prior arrow/string cases through `analyzeEvents`; require zero mutation attempts | Unit/Regression | PASS | Repair-focused command-position group plus full 18/18 prove `git push`, `bash -lc`, and `Set-Content` argument text is safe without weakening prior literals. |
| T-04 | AC-04 — quoted here-document data and unquoted executable expansions remain distinct | Feed quoted bodies containing command text; unquoted command/backtick substitutions; Python/Node comparison/arrow source; comment markers; outside redirects; and malformed terminators through `analyzeEvents` | Unit/Security | PASS | Repair-focused here-document group passes: quoted body literal, both unquoted mutators blocked at original offsets, source comparisons/arrows/comment safe, header redirect detected, malformed terminator unsupported. |
| T-05 | AC-05 — descriptor and existing output-redirection behavior remains exact | Observe `analyzeEvents` for `2>file`, `2>>file`, exact `2>&1`, `12>&1`, `2>&10`, `2>&1file`, quoted/embedded/escaped descriptor text, and prior redirect/quote/escape cases | Unit/Regression/Security | PASS | Repair-focused descriptor group and full 18/18 pass; file/near-miss forms block, only boundary-valid exact duplication is exempt, and quoted or escaped argument text remains safe. |
| T-06 | AC-06 — nested and unsupported diagnostics use original coordinates and bounded redacted context | Generate long nested and encoded-option diagnostics; assert exact original offset/slice, shell/depth/outer state, 160-character context bound, total diagnostic bound, and absence of encoded payload/full command | Unit/Security | PASS | Repair-focused launcher/long-diagnostic groups pass; long nested offset equals the original index, context equals the original slice, and encoded evidence contains only the option token. |
| T-07 | AC-07 — encoded, dynamic, malformed, or unsupported explicit nesting fails closed | Feed `pwsh`/`powershell` encoded options, nested encoded commands, dynamic POSIX/PowerShell launcher options, ordinary static options, and prior malformed/depth cases through `analyzeEvents` | Unit/Negative/Security | PASS | Repair-focused launcher group and full 18/18 pass; encoded/dynamic boundaries emit named issues without decode/expansion, ordinary static options stay safe, and prior malformed cases remain fail-closed. |
| T-08 | AC-08 — mutation, file-change, plan, repair scope, and read-only invariants do not weaken | Run the complete event/diagnostic file, combined `kyw-audit` contract suite, and standalone contract suite; statically review unchanged downstream fixture/invariant gates | Unit/Regression/Static | PASS | Final audit-smoke 18/18, combined 27/27, standalone kyw-audit 9/9; downstream read-only/fix fixture, plan, scope, auth, artifact, and cleanup gates are unchanged. |
| T-09 | AC-09 — dependency/package and permanent-document boundaries remain correct | Inspect `package.json`/lockfiles and final changed paths; require no dependency change, no packaged runtime boundary change, and only semantically affected README/Architecture updates | Architecture/Packaging/Audit | PASS | Exact six paths; zero package/lockfile/Skill/runtime/template diff; README/Architecture are the only permanent docs; SPEC/AGENTS unchanged; Task 0024+ count 0. |
| T-10 | AC-09 — focused, full, artifact, whitespace, and final coverage gates pass | Run syntax checks, F-01–F-04 focused tests, full and combined audit tests, standalone kyw-audit, Task validation, `npm run check`, `git diff --check`, exact scope/staged/later-Task inventory, and final diff-to-matrix review | Unit/Regression/Packaging/Audit | PASS | Syntax 2/2; focused 5/5; audit-smoke 18/18; combined 27/27; kyw-audit 9/9; no-edit full-check retry 141/141 plus lint/format/pack; validator/whitespace/six-path scope pass. |

Every acceptance criterion maps to at least one row. The new acceptance regressions assert exported event-analysis and diagnostic outcomes; they must not duplicate the implementation lexer/parser as a test oracle.

## Independent Audit Findings

### Audit chronology

#### First independent audit

- Mode: read-only independent audit.
- Final verdict: `BLOCKED`.
- Reason: four findings were discovered within Task 0023 scope:
  - F-01: executable command position was not distinguished, causing both false positives and missed mutations.
  - F-02: encoded and dynamic launcher grammar did not fail closed.
  - F-03: unquoted here-document expansion and comment-marker handling were incorrect.
  - F-04: durable regression and evidence were insufficient for descriptor boundaries, unsupported grammar, and long diagnostics.
- Repository mutation: none.
- The audit concluded that the Task's existing `DONE`/`PASSED` state was not supported by the evidence then available.

#### Bounded repair

- F-01 through F-04 were repaired within Task 0023.
- During repair, the pair moved to TASK=`IN_PROGRESS` and TEST=`RUNNING`.
- The implementation and durable observable regressions were strengthened without deleting the original failure or success records.

#### Post-repair state

- F-01 through F-04: `RESOLVED`.
- Retained repair evidence, not newly executed for F-05: observable probe succeeded; focused repair 5/5; audit-smoke 18/18; combined audit 27/27; kyw-audit 9/9; `npm run check` 141/141.
- Terminal state after repair: TASK=`DONE`, TEST=`PASSED`.

#### Second independent re-audit

- The implementation and observable regressions for F-01 through F-04 were reverified successfully.
- F-05 was raised because this file did not explicitly preserve the first independent audit's `BLOCKED` verdict.
- Final verdict: `BLOCKED`.
- F-05 was the only finding; no additional implementation finding was reported.
- Repository mutation: none.

#### F-05 disposition

- F-05: `RESOLVED`.
- Resolution: added both the first and second independent audits' `BLOCKED` verdicts to this TEST.md evidence chain.
- No product code, classifier implementation, regression test, or permanent-document meaning changed.

| ID | Category | Severity | Evidence and expected / actual | Scope and action | Status |
|---|---|---|---|---|---|
| F-01 | behavior | ERROR | `analyzeEvents()` silently passed quoted/path executables and a supported PowerShell call target, while ordinary `printf`/`Write-Output` arguments containing mutator or launcher text produced false positives. Expected classification only at executable command positions with quoted/path normalization. | In scope under AC-02/AC-03; implemented command-position tracking and observable regressions without a full shell parser. | RESOLVED |
| F-02 | behavior | ERROR | `pwsh -EncodedCommand`, `pwsh -enc`, nested encoded commands, `bash $flags`, and `pwsh $option` produced no unsupported-grammar reason. Expected recognized encoded/dynamic launcher boundaries to fail closed without decoding or payload disclosure. | In scope under AC-06/AC-07; implemented narrow structural issues and payload-free diagnostic coverage. | RESOLVED |
| F-03 | behavior | ERROR | The classifier skipped every recognized here-document body, so unquoted `$(rm ...)` and backtick `git push` silently passed; `<<EOF` in a comment was also treated as a declaration. Expected quoted bodies to remain literal and unquoted executable expansions to be recursively analyzed or fail closed. | In scope under AC-04/AC-06; delimiter quoting now controls literal-vs-expansion handling with original offsets. | RESOLVED |
| F-04 | test-evidence | ERROR | `test/audit-smoke.test.mjs` lacked the required durable command-position, unsupported-launcher, here-document, complete descriptor-boundary, and long nested-diagnostic observable matrix. | In scope under AC-02–AC-09; added five `analyzeEvents()`/diagnostic regression groups. | RESOLVED |
| F-05 | test-evidence | ERROR | The first independent audit's final `BLOCKED` verdict was recoverable from TASK.md but absent from this file, so TEST.md alone did not preserve the historical evidence chain. Expected both independent audit verdicts and their no-mutation outcomes to remain explicit. | In scope as Task 0023 evidence-only repair; added the chronological audit record without changing implementation or durable behavior. | RESOLVED |

## Regression Coverage

- [x] Mutators and nested launchers classify only at command positions, including quoted/path executables and supported PowerShell call-operator targets.
- [x] Required quoted POSIX/PowerShell output literals and ordinary arguments containing mutator or launcher text are allowed.
- [x] Encoded-command and dynamic launcher-option boundaries fail closed without decode, expansion, or payload disclosure; ordinary static launcher options remain allowed.
- [x] Quoted here-document bodies are literal; unquoted command/backtick substitutions are analyzed; Python/Node comparison/arrow data and comment markers remain safe; outside redirects still block.
- [x] `>`, `>>`, `1>`, `2>`, and `2>>` plus descriptor near misses remain blocked; only exact boundary-valid `2>&1` is allowed, while quoted/escaped descriptor-like argument text is safe.
- [x] Quoted JavaScript arrows, shell-native escaped literals, substitutions/subexpressions, POSIX arithmetic, and mixed commands retain existing behavior.
- [x] Nested general-mutator and redirection offsets/context map to the original command.
- [x] Malformed/unsupported explicit nested grammar fails closed.
- [x] Existing raw command mutation types, `file_change`, plan ordering, repair scope, tree/Git/auth, no-artifact, and cleanup enforcement remain covered.
- [x] No package dependency or Task 0024-or-later path is introduced.

## Commands

Planned commands; Results will record only commands actually run, including failures and retries.

```text
node --check scripts/audit-smoke.mjs
node --check test/audit-smoke.test.mjs
node --test --test-name-pattern="audit repair" test/audit-smoke.test.mjs
node --test test/audit-smoke.test.mjs
node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs
node --test test/kyw-audit.test.mjs
npm run check
node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0023-audit-command-classifier-hardening
git diff --check
```

Final read-only evidence commands will inspect `git status --short --branch`, `git diff --name-status`, `git diff --stat`, the complete scoped diff, dependency/lockfile paths, Task 0024-or-later paths, and matrix coverage. No model, commit, push, merge, tag, publish, Release, submission, or workflow-dispatch command is planned.

F-05 evidence-only repair commands actually used:

```text
node --test --test-name-pattern="audit repair" test/audit-smoke.test.mjs
node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0023-audit-command-classifier-hardening
rg -n '#### First independent audit|Final verdict: `BLOCKED`|F-01:|F-02:|F-03:|F-04:|#### Bounded repair|F-01 through F-04: `RESOLVED`|#### Second independent re-audit|F-05: `RESOLVED`' docs/tasks/0023-audit-command-classifier-hardening/TEST.md
npm run format:check
git diff --check
git diff --name-only
git ls-files --others --exclude-standard
git diff --cached --name-only
```

## Results

### Original Task 0023 implementation evidence (retained)

- Preflight and atomic Task-pair evidence is recorded in T-01 and `TASK.md`.
- `node --check scripts/audit-smoke.mjs` and `node --check test/audit-smoke.test.mjs`: exit 0.
- First post-refactor `node --test test/audit-smoke.test.mjs`: exit 1, 9/10. The sole failure was the old deep-equality expectation omitting the intentionally added `mutators` evidence object; all behavior tests passed. The assertion now checks the stable reason and structured observable fields.
- `node --test --test-name-pattern="command mutation classifier" test/audit-smoke.test.mjs`: exit 0, 3/3 after the implementation and again after diagnostic/refinement changes.
- `node --test test/audit-smoke.test.mjs`: exit 0, 13/13 after implementation and diagnostic-preview refinement.
- Preliminary `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`: exit 0, 22/22.
- Preliminary `npm run lint`: exit 0, 35 JavaScript modules plus foundation metadata. Preliminary `npm run format:check`: exit 0, 169 UTF-8/LF files.
- A preliminary full `npm run check` passed 136/136 plus lint/format/pack before the final outer-dynamic nested boundary was added; it is retained as superseded evidence rather than the terminal result.
- Final `node --check scripts/audit-smoke.mjs` and `node --check test/audit-smoke.test.mjs`: exit 0.
- Final `node --test --test-name-pattern="command mutation classifier" test/audit-smoke.test.mjs`: exit 0, 3/3.
- Final `node --test test/audit-smoke.test.mjs`: exit 0, 13/13.
- Final `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`: exit 0, 22/22.
- Final `npm run check`: exit 0 in 30.6 seconds. `npm test` passed 136/136 with zero failures/skips; lint passed 35 JavaScript modules plus foundation metadata; format passed 169 UTF-8/LF files; pack check passed 29 files/60,748 bytes.
- Task validator returned `valid: true` before terminal reconciliation and again afterward. The terminal `npm run format:check` passed 169 files, `git diff --check` exited 0, and exact scope reported six changed, zero unexpected/missing/staged, and zero Task 0024+ paths; no source change followed the final full check.
- `git diff --check`: exit 0 after the final implementation/full check.
- Final path review: README, Architecture, classifier source/test, and this pair only; index empty; base/HEAD/merge-base `611a1d7...`; package/lockfile/Skill/runtime/template diff 0; Task 0024+ count 0.
- Final diff-to-matrix review maps parser/token/redirect/here-document recursion and every diagnostic/error branch to T-02–T-07, unchanged enforcement to T-08, document/package boundaries to T-09, and every executed gate to T-10.

### Independent audit repair baseline

- Repair preflight: exit 0. Branch `task/0023-audit-command-classifier-hardening`; HEAD `611a1d73839fe968662677d40ef355478781bc1b`; staged count 0; changed paths exactly the six authorized files; Task 0024-or-later directory count 0.
- First read-only inline baseline probe: exit 1. It executed 16 assertions but its hard-coded JSON summary incorrectly printed `checks: 18`; 15 named observable failures reproduced F-01 through F-03. The command changed no repository byte.
- Harness-only baseline retry: exit 1 with accurate `checks: 16`, `failureCount: 15`. Failures were four missed quoted/path/call-operator executables, three argument false positives, five missing encoded/dynamic unsupported-grammar issues, two silently passed unquoted here-document expansions, and one false here-document declaration in a comment. The sole passing assertion was that a quoted-delimiter here-document body remained literal.
- F-04 was independently reproduced by direct inspection of `test/audit-smoke.test.mjs`: the required observable matrices and long nested diagnostic boundary were absent. No parser-internal test oracle was added during baseline establishment.

### F-01–F-04 bounded repair verification

- First post-implementation `node --check scripts/audit-smoke.mjs` plus the corrected 16-check inline observable probe: exit 0; all 16 previously probed F-01–F-03 behaviors passed.
- First `node --test --test-name-pattern="audit repair" test/audit-smoke.test.mjs`: exit 0, 5/5. A subsequent small regression-only refinement added relative-path, control-operator, leading-fd-redirection, and embedded descriptor-argument cases; it changed no production scope.
- Preliminary `node --test test/audit-smoke.test.mjs`: exit 0, 18/18 after the initial five repair groups were added.
- Requested final syntax sequence, `node --check scripts/audit-smoke.mjs` followed by `node --check test/audit-smoke.test.mjs`: exit 0, 2/2.
- Requested final `node --test --test-name-pattern="audit repair" test/audit-smoke.test.mjs`: exit 0, 5/5 with zero failures/skips/todos.
- Requested final `node --test test/audit-smoke.test.mjs`: exit 0, 18/18 with zero failures/skips/todos.
- Requested final `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`: exit 0, 27/27 with zero failures/skips/todos.
- Requested final `node --test test/kyw-audit.test.mjs`: exit 0, 9/9 with zero failures/skips/todos.
- First requested `npm run check`: exit 1 after 27 seconds. `npm test` passed 140/141; the sole failure was `actual tarball passes the fail-closed isolated direct and marketplace lifecycles`, raising `NORMAL_STATE_CHANGED: normal-codex`. The chain stopped before lint/format/pack. Immediate status inspection showed exactly the six authorized paths and zero staged entries, and no repository file was changed in response.
- No-edit `npm run check` retry: exit 0 after 30 seconds. `npm test` passed 141/141 with zero failures/skips/todos; lint passed 35 JavaScript modules plus foundation metadata; format passed 169 UTF-8/LF files; pack check passed 29 files/61,103 bytes. The first ambient-state failure remains retained and is not reclassified as a pass.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0023-audit-command-classifier-hardening`: exit 0 with `valid: true` while the pair was `IN_PROGRESS`/`RUNNING`.
- `git diff --check`: exit 0. Exact scope inspection returned six changed, zero unexpected, zero missing, zero staged, and zero Task 0024-or-later paths with `AllowlistValid: true`.
- Final diff-to-matrix review maps command-position and launcher branches to T-02/T-03/T-07, here-document declaration/expansion/error branches to T-04/T-07, descriptor and diagnostic boundaries to T-05/T-06, unchanged downstream enforcement to T-08, and document/package/scope evidence to T-09/T-10.
- Terminal `DONE`/`PASSED` revalidation: syntax exit 0 for both files; repair-focused 5/5; audit-smoke 18/18; combined audit 27/27; standalone kyw-audit 9/9; `npm run check` exit 0 with 141/141, lint 35 modules plus metadata, format 169 files, and pack 29 files/61,103 bytes; Task validator `valid: true`; `git diff --check` exit 0; branch/HEAD unchanged; exact six-path allowlist valid; staged 0; Task 0024+ count 0.
- One post-verification combined read-only status/diff/line-reference helper exited 1 with no output and changed no repository byte. The same evidence was immediately split into a status/diff/stat command and simpler `rg` line-reference commands; both exited 0 and returned the expected six-path status plus implementation/test/document/status locations. This auxiliary display failure is not counted as a required-check pass.
- After recording that auxiliary failure, the Task validator again returned `valid: true`, separate `npm run format:check` passed 169 files, `git diff --check` exited 0, and the exact terminal scope remained branch/HEAD unchanged, six allowed paths, findings 4/4 `RESOLVED`, `DONE`/`PASSED`, staged 0, and Task 0024+ count 0.

### F-05 evidence-only repair verification

- Baseline establishment reconfirmed branch `task/0023-audit-command-classifier-hardening`; HEAD, local `main`, `origin/main`, and both merge bases at `611a1d73839fe968662677d40ef355478781bc1b`; exactly six changed paths; staged count 0; Task 0024-or-later count 0; TASK=`DONE`; TEST=`PASSED`; and F-01 through F-04 `RESOLVED`.
- Fresh pre-edit observable check `node --test --test-name-pattern="audit repair" test/audit-smoke.test.mjs`: exit 0, 5/5 with zero failures/skips/todos. The pre-edit Task artifact validator also exited 0 with `valid: true`.
- One combined pre-edit allowlist summary helper exited 1 without output because the helper composition was invalid; it changed no repository byte and was not treated as a repository-state failure. Direct `git status --short --untracked-files=all`, staged-path inspection, and Task-directory inspection immediately exited 0 and returned the expected six paths, staged 0, and Task 0024+ count 0.
- The F-05 repair added the chronological first audit `BLOCKED`, F-01 through F-04 bounded repair and retained evidence, second re-audit `BLOCKED`, and F-05 `RESOLVED` records without changing existing failure/success history.
- Fresh post-edit `rg` evidence inspection exited 0 and returned the first audit heading/verdict, all four original finding summaries, bounded repair, F-01 through F-04 `RESOLVED`, second re-audit heading/verdict, and F-05 `RESOLVED` at the expected chronological locations.
- Fresh post-edit Task artifact validation exited 0 with `valid: true`; `npm run format:check` exited 0 over 169 UTF-8/LF files; and `git diff --check` exited 0.
- Fresh post-edit allowlist inspection returned `AllowlistValid=True`, changed 6, missing 0, unexpected 0, staged 0, and Task 0024+ count 0. The paths remain exactly README, Architecture, classifier source/test, and this Task/Test pair.
- The full classifier suite, combined audit suite, standalone kyw-audit suite, and `npm run check` were not rerun after this evidence-only repair. Their 18/18, 27/27, 9/9, and 141/141 results above are retained prior repair evidence, not new F-05 PASS evidence.

## Unverified

- Model-backed fresh-session behavior is intentionally outside this deterministic hardening Task and will not be marked PASS without execution.
- Encoded-command decoding, alias/variable resolution, sourced scripts, and hostile-parser completeness remain outside the bounded normal local Codex-command grammar. Recognized encoded/dynamic launcher boundaries fail closed rather than being decoded or expanded.
- The Task does not re-run release readiness, fix interruption cleanup or release-isolation ambient-state attribution, or change the preserved Task 0020 `BLOCKED` verdict.
- The first final `npm run check` ambient-state failure remains a residual release-isolation attribution risk despite the successful no-edit retry; no classifier claim depends on treating that failed attempt as a pass.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
- [x] Confirm permanent-document impact and dependency/package boundaries.
- [x] Confirm no Task 0024-or-later path or forbidden external action occurred.

## Final Result

PASSED
