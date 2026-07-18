# TEST 0021 — Audit Redirection Guard

## Status

RUNNING

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
| T-01 | AC-01 number, provenance, branch base, checkpoint, and old-ref immutability | Inspect Task directories, live/refreshed refs/history/default branch, porcelain v2/index/untracked state, branch ancestry, checkpoint diff, and local/remote 0020 refs | Audit/Provenance | TODO | Pending terminal evidence consolidation. |
| T-02 | AC-02 every required file redirect is detected | Feed `> file`, `>> file`, `1>file`, `2>file`, and `2>>file` through the exported detector and event analysis for supported shell modes | Unit/Security | TODO | Pending. |
| T-03 | AC-03 quoted/escaped literals are safe and mixed commands still block | Cover single/double quotes, native shell escapes, escaped quotes/backslashes, quoted `>`, `node -e "const f = x => x"`, and quoted-literal-plus-real-redirect cases under PowerShell/POSIX modes | Unit/Security | TODO | Pending. |
| T-04 | AC-04 fd duplication policy matches the executor | Run `2>&1` through detector integration and a host-shell subprocess in an isolated temporary directory; prove combined output/no created file and prove `2>file`/`2>>file` remain blocked | Unit/Integration/Security | TODO | Pending. |
| T-05 | AC-05 match-local diagnostics are exact, bounded, and redacted | Assert operator, original zero-based offset, quote/escape state, context start/length, a match after offset 600, and absence of credentials/full command/user/temp paths | Unit/Security | TODO | Pending. |
| T-06 | AC-06 mutation and invariant gates remain fail-closed | Analyze safe/mutating/file-change event mixtures; statically retain read-only tree/status, fix plan/scope, auth-source, no-artifact, and cleanup checks | Unit/Static | TODO | Pending. |
| T-07 | AC-07 targeted and combined audit suites pass | Run focused audit-smoke tests, then `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs` | Unit/Regression | TODO | Pending. |
| T-08 | AC-07 requested repository and packaging commands pass | Run `npm test`, lint, format, pack, check, and release:ci with isolated npm cache/userconfig | Regression/Packaging | TODO | Pending. |
| T-09 | AC-07 supported platform differences are covered | Confirm dialect tests execute in the existing Node 22/24 Linux, macOS, and Windows CI contract, or record equivalent executed native evidence | CI/Compatibility | TODO | Pending. |
| T-10 | AC-08 isolated read-only model smoke preserves every protected invariant | Snapshot fixture tree/Git/auth/config, run `gpt-5.6-sol`/high read-only once with explicit isolated auth, and compare before/after plus source-read/attempt/verdict evidence | Model E2E/Security | TODO | Pending. |
| T-11 | AC-08 isolated fix model smoke preserves scope and protected invariants | Under the same isolated conditions run fix once; require plan-before-mutation, exact allowed paths, fixture test, source-read, auth/config preservation, and final `PASS` | Model E2E/Security | TODO | Pending. |
| T-12 | AC-09 final scope, docs, commits, SHA, and normal push are complete | Compare final diff to every matrix row, validate Task pair, inspect permanent-document routing/status, commit reviewed paths, verify exact SHAs/remote ref, and audit forbidden state | Audit/Release safety | TODO | Pending. |

Every acceptance criterion maps to at least one row. A model smoke that exposes a new defect makes the applicable row and Task `BLOCKED`; it does not authorize a chained fix.

## Regression Coverage

- [ ] Real `> file`, `>> file`, `1>file`, `2>file`, and `2>>file` are classified as output-to-file attempts.
- [ ] Quoted `>` and `node -e "const f = x => x"` remain non-mutating.
- [ ] A quoted literal `>` followed by an executable redirect is still classified.
- [ ] Supported single quote, double quote, escaped quote, native escape, and backslash cases behave per PowerShell/POSIX rules.
- [ ] A real match after character 600 retains exact operator, offset, state, and bounded local context.
- [ ] The evidence-backed `2>&1` policy is explicit and does not hide stderr file redirection.
- [ ] Diagnostic offsets/context are accurate and credentials plus known absolute paths are absent.
- [ ] Actual redirects remain blocked while harmless literals do not create `READONLY_MUTATION_ATTEMPT`.
- [ ] Existing mutating-command, `file_change`, plan-order, repair-scope, tree/status, auth, no-artifact, and cleanup behavior remains covered.
- [ ] Supported platform coverage is exercised by native tests or the existing CI matrix.

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

## Unverified

- Detector implementation, deterministic regressions, full repository checks, model smokes, final protected-state comparison, and dedicated-branch push remain unverified at Task creation.
- Exact nested or malformed shell constructs outside the supported grammar remain to be classified during implementation; ambiguity must fail closed rather than be silently allowed.

## Final Coverage Review

Before terminal status:

- [ ] Map every final implementation behavior, branch, and diagnostic field to a matrix row.
- [ ] Confirm no redirect form was exempted by command whitelist or by a preceding `2`.
- [ ] Confirm diagnostics reveal the match after offset 600 without revealing a whole command or protected value.
- [ ] Confirm all requested deterministic, repository, packaging, platform, and model checks actually ran.
- [ ] Confirm before/after fixture, Git, auth/config, no-artifact, cleanup, and normal-state evidence for both model modes.
- [ ] Confirm permanent-document impact, Task/Test handoff fields, exact commits, remote ref, and forbidden actions.
- [ ] Record exactly one final result: `COMPLETED` or `BLOCKED`.

