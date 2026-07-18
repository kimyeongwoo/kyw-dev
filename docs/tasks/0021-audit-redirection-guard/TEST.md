# TEST 0021 — Audit Redirection Guard

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Failure evidence: `../0020-release-readiness-gate/TASK.md` and `TEST.md`
- Prior audit contracts: Tasks `0014` and `0018`
- Implementation: `../../../scripts/audit-smoke.mjs`
- Focused tests: `../../../test/audit-smoke.test.mjs` and `../../../test/kyw-audit.test.mjs`
- Execution/package/CI paths: `../../../package.json` and `../../../.github/workflows/ci.yml`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 number, provenance, branch base, checkpoint, and old-ref immutability | Inspect Task directories, live/refreshed refs/history/default branch, porcelain v2/index/untracked state, branch ancestry, checkpoint diff, and local/remote 0020 refs | Audit/Provenance | PASS | No 0021 collision; exact candidate base; only attributable 0020 evidence; checkpoint `4eaccce3...` contains two documentation paths; old local/remote ref remains `54b9f820...`. |
| T-02 | AC-02 every required file redirect is detected | Feed `> file`, `>> file`, `1>file`, `2>file`, and `2>>file` through the exported detector and event analysis for supported shell modes | Unit/Security | PASS | Focused matrix passes all five forms in both PowerShell/POSIX modes, including exact operator/descriptor/offset assertions. |
| T-03 | AC-03 quoted/escaped literals are safe and mixed commands still block | Cover single/double quotes, native shell escapes, escaped quotes/backslashes, quoted `>`, `node -e "const f = x => x"`, and quoted-literal-plus-real-redirect cases under PowerShell/POSIX modes | Unit/Security | PASS | Focused matrix covers common literals, native escapes, PowerShell backslash difference, escaped quotes, POSIX arithmetic, executable substitutions, nested shell launchers, JS arrow, and mixed redirect. |
| T-04 | AC-04 fd duplication policy matches the executor | Run `2>&1` through detector integration and a host-shell subprocess in an isolated temporary directory; prove combined output/no created file and prove `2>file`/`2>>file` remain blocked | Unit/Integration/Security | PASS | Exact `2>&1` yields no detector reason, native stderr payload is observable, fixture remains empty, and other descriptor/file forms block; Windows PowerShell 5's documented wrapper exit 1 is retained. |
| T-05 | AC-05 match-local diagnostics are exact, bounded, and redacted | Assert operator, original zero-based offset, quote/escape state, context start/length, a match after offset 600, and absence of credentials/full command/user/temp paths | Unit/Security | PASS | Offset >600 case records `>>`, fd 2, exact offset/state, 160-char context, redacted path/credential, and no full/legacy command preview. |
| T-06 | AC-06 mutation and invariant gates remain fail-closed | Analyze safe/mutating/file-change event mixtures; statically retain read-only tree/status, fix plan/scope, auth-source, no-artifact, and cleanup checks | Unit/Static | PASS | Ordered command/file-change reasons and plan checks pass; runner source retains tree/status/auth/no-artifact/cleanup enforcement; model proof completed in T-10/T-11. |
| T-07 | AC-07 targeted and combined audit suites pass | Run focused audit-smoke tests, then `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs` | Unit/Regression | PASS | Final preliminary focused 10/10 and combined audit 19/19; both exit 0. |
| T-08 | AC-07 requested repository and packaging commands pass | Run `npm test`, lint, format, pack, check, and release:ci with isolated npm cache/userconfig | Regression/Packaging | PASS | Exact candidate: final full 133/133; lint/format/pack/check/release:ci exit 0; 29 files/60,362 bytes; packed SHA-256 `fe604863...b56c9`. Initial environment-induced 132/133 failure retained. |
| T-09 | AC-07 supported platform differences are covered | Confirm dialect tests execute in the existing Node 22/24 Linux, macOS, and Windows CI contract, or record equivalent executed native evidence | CI/Compatibility | PASS | Exact-SHA run `29642294609`: all nine jobs success; direct Ubuntu/macOS/Windows logs contain both new regressions and 133/133. |
| T-10 | AC-08 isolated read-only model smoke preserves every protected invariant | Snapshot fixture tree/Git/auth/config, run `gpt-5.6-sol`/high read-only once with explicit isolated auth, and compare before/after plus source-read/attempt/verdict evidence | Model E2E/Security | PASS | Exit 0/242s; source read; zero attempts/changes; tree and Git invariant; final `BLOCKED`; auth/protected state invariant; residue 0. |
| T-11 | AC-08 isolated fix model smoke preserves scope and protected invariants | Under the same isolated conditions run fix once; require plan-before-mutation, exact allowed paths, fixture test, source-read, auth/config preservation, and final `PASS` | Model E2E/Security | PASS | Exit 0/262.6s; source read; plan first; six events/exact four paths; fixture test and `PASS`; auth/protected state invariant; residue 0. |
| T-12 | AC-09 final scope, docs, commits, SHA, and normal push are complete | Compare final diff to every matrix row, validate Task pair, inspect permanent-document routing/status, commit reviewed paths, verify exact SHAs/remote ref, and audit forbidden state | Audit/Release safety | PASS | Candidate `f77c961...`/tree `89b68d1e...` committed and pushed normally; scope/docs mapped; old refs protected; tags/PRs/releases 0; evidence-only final pair follows candidate. |

Every acceptance criterion maps to at least one row. A model smoke that exposes a new defect makes the applicable row and Task `BLOCKED`; it does not authorize a chained fix.

## Regression Coverage

- [x] Real `> file`, `>> file`, `1>file`, `2>file`, and `2>>file` are classified as output-to-file attempts.
- [x] Quoted `>` and `node -e "const f = x => x"` remain non-mutating.
- [x] A quoted literal `>` followed by an executable redirect is still classified.
- [x] Supported single quote, double quote, escaped quote, native escape, and backslash cases behave per PowerShell/POSIX rules.
- [x] A real match after character 600 retains exact operator, offset, state, and bounded local context.
- [x] The evidence-backed `2>&1` policy is explicit and does not hide stderr file redirection.
- [x] Diagnostic offsets/context are accurate and credentials plus known absolute paths are absent.
- [x] Actual redirects remain blocked while harmless literals do not create `READONLY_MUTATION_ATTEMPT`.
- [x] Existing mutating-command, `file_change`, plan-order, repair-scope, tree/status, auth, no-artifact, and cleanup behavior remains covered.
- [x] Supported platform coverage is exercised by native tests or the existing CI matrix.

## Commands

Planned commands; Results will retain exact commands actually run, exit codes, and concise outcomes. Authentication paths and values must remain redacted.

- `node --test test/audit-smoke.test.mjs`
- `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`
- `node --check scripts/audit-smoke.mjs`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run check`
- `npm run release:ci`
- `npm --silent run eval:audit:smoke -- --allow-model --mode readonly --model gpt-5.6-sol --reasoning-effort high --auth-file <explicit-isolated-auth-source>`
- `npm --silent run eval:audit:smoke -- --allow-model --mode fix --model gpt-5.6-sol --reasoning-effort high --auth-file <explicit-isolated-auth-source>`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0021-audit-redirection-guard`
- `git diff --check`
- Path-scoped status/diff, exact commit/ref, protected-state snapshot, and forbidden-action checks.

## Results

- Preflight found no `0021` directory or ref locally or remotely after live lookup/fetch, no `0021` path in reachable history, and no `0021` directory on `origin/main`.
- Initial porcelain v2 showed exact candidate `54b9f8207c51cbc22af2d0a1c3faac1f04b09310`, an empty index/untracked set, and only the two expected Task 0020 post-candidate evidence files modified.
- Branch `task/0021-audit-redirection-guard` was created at that exact SHA. Documentation-only checkpoint `4eaccce3c466f206bbc398958fe7744d5018fe61` contains only the two reviewed Task 0020 evidence paths; local and remote `task/0020-release-readiness-gate` remain at the candidate.
- Task 0020's four literal-arrow claims were corrected to explain `[matched=>]` as label plus captured operator, while retaining its failed AC/T row, attempt count, invariant tree/status evidence, no retry, and `BLOCKED` result.
- Implementation and execution-path inspection found that Codex runs inside the existing outer OS sandbox, emits command events, and the runner subsequently applies a whole-string output-redirection regex. The current local path is Windows/PowerShell under Codex CLI `0.144.5`; CI supplies native Windows, macOS, and Linux Node lanes. No deterministic fd-duplication test existed at Task creation.
- `node --check scripts/audit-smoke.mjs` and `node --check test/audit-smoke.test.mjs`: exit 0.
- First focused run: exit 1, 9/10. Only the native fd probe failed because Windows PowerShell 5 converts redirected native stderr to `NativeCommandError` and returns wrapper exit 1 despite no created file. The policy assertion was narrowed to no launch error, payload evidence, and empty fixture while accepting only the observed PowerShell 0/1 distinction.
- Final preliminary `node --test test/audit-smoke.test.mjs`: exit 0, 10/10. Required redirects, quote/escape cases, nested executable forms, exact `2>&1`, long-offset diagnostic, redaction, and legacy invariants pass.
- Preliminary `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`: exit 0, 19/19. `npm run lint`: exit 0, 35 JavaScript modules plus foundation metadata. `npm run format:check`: exit 0, 165 UTF-8/LF files.
- Preliminary `npm test`: exit 0, 133/133 with zero fail/skip. Preliminary `npm run pack:check`: exit 0, 29 files/60,362 bytes. Task validation returned `valid: true`; `git diff --check` exited 0.
- Immutable implementation candidate: `f77c9612531a926f06a62fe7080ce592b2773817`; tree `89b68d1ef1f3296a650e777d60d7a74c22e3965f`; six reviewed candidate paths. Normal push created remote `task/0021-audit-redirection-guard` at the exact SHA; clean detached verification path used the same SHA.
- Exact-candidate targeted command: exit 0, 10/10. Combined audit command: exit 0, 19/19. `node --check scripts/audit-smoke.mjs`: exit 0.
- First exact-candidate `npm test`: exit 1, 132/133. The only failure was `NORMAL_STATE_CHANGED: configured-codex` because the verification parent set `CODEX_HOME` to an initially empty isolated directory and Codex created temporary `tmp/arg0` wrappers after the release-isolation snapshot. No repository or implementation byte changed. The retry removed only that parent override; the release runner continued to isolate every child HOME/Codex/npm/TEMP path and protect normal control state.
- Final exact-candidate `npm test`: exit 0, 133/133. Separate exact-candidate lint, format, and pack commands each exited 0 (35 modules plus metadata; 165 files; 29 files/60,362 bytes). `npm run check`: exit 0 with 133/133 and all stable gates. `npm run release:ci`: exit 0 with the same stable gates and packed SHA-256 `fe604863d6e137b610ad075045b9ebd50710a7dd1e1ddc88b1bf7ca6c69b56c9`.
- Hosted run `29642294609` has `headSha=f77c961...`, status completed, conclusion success, and all nine required jobs successful. Ubuntu/macOS/Windows Node 24 logs explicitly show `output redirection scanner follows PowerShell and POSIX quote and escape rules`, `fd duplication is narrowly allowed...`, tests 133, pass 133, fail 0. Both Node 22 lanes per OS, Ubuntu Node 26, packed release, and aggregate also succeeded.
- Read-only model command with `gpt-5.6-sol`/high and explicit isolated auth: exit 0 after 242 seconds. Result: Codex `0.144.5`, source read true, mutation attempts 0, changed paths empty, tree before/after `a0776c4eae4d59fbdc52218545bcb002b3cb551ab987fa1adffbc95ccb3c4151`, fixture Git status byte-identical, final `BLOCKED`, final-message SHA-256 `b069ed3e...b6ef`.
- Fix model command under the same inputs: exit 0 after 262.6 seconds. Result: source read true, plan before first mutation, six mutation events, exactly `docs/tasks/0001-greeting-contract/{TASK.md,TEST.md}`, `src/greeting.mjs`, and `test/greeting.test.mjs`, fixture test pass, final `PASS`, final-message SHA-256 `9e3ba9b0...1598`.
- Each smoke preserved the explicit auth copy, source detached Git status, and no-residue condition. The corrected normal protected snapshot was identical before/after and across the complete verification: 2,330 records, SHA-256 `010e55f3d5fc9ed1cf9f9c203f8176640dcde756cb120551bd2da9d3800c2a55`. One wrapper display printed `gitInvariant=False` after read-only because `-join` lacked display parentheses; the actual guarded comparison used parentheses, passed, and the clean detached status was reconfirmed directly.
- Candidate-checkpoint provenance/safety audit: local/remote Task 0020 refs remain `54b9f820...`; the dedicated branch's local/remote refs were exact candidate `f77c961...`; source and detached candidate were clean; local/remote tags, branch PRs, GitHub releases, and smoke residue were all zero. The later terminal-evidence commit advances only the dedicated branch and leaves the candidate immutable. No forbidden release or publication action ran.

## Unverified

- Encoded or other opaque nested-shell payloads are not decoded by this bounded detector. Direct PowerShell/POSIX syntax, executable substitutions, and explicit `sh`-family `-c` plus PowerShell `-Command` arguments are covered; the OS read-only sandbox and final tree/status checks remain independent backstops.
- This Task performed defect verification only. It did not re-run or replace the full release-readiness decision contract, publish, tag, release, merge, or submit the plugin.

## Final Coverage Review

Before terminal status:

- [x] Map every final implementation behavior, branch, and diagnostic field to a matrix row.
- [x] Confirm no redirect form was exempted by command whitelist or by a preceding `2`.
- [x] Confirm diagnostics reveal the match after offset 600 without revealing a whole command or protected value.
- [x] Confirm all requested deterministic, repository, packaging, platform, and model checks actually ran.
- [x] Confirm before/after fixture, Git, auth/config, no-artifact, cleanup, and normal-state evidence for both model modes.
- [x] Confirm permanent-document impact, Task/Test handoff fields, exact commits, remote ref, and forbidden actions.
- [x] Record exactly one final result: `COMPLETED` or `BLOCKED`.

## Final Result

COMPLETED
