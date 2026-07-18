# TEST 0013 — Filesystem Security Hardening

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 all paths are normalized and confined | Table-driven path helper and CLI tests | Unit/Security | PASS | `managed paths reject portable absolute, traversal, mixed-separator, and malformed forms`; native user/project lifecycle. |
| T-02 | AC-02 malformed/escaping/colliding paths fail closed | Malicious metadata and cross-platform fixture tests | Security | PASS | Portable path/metadata collision tables plus malicious install metadata and journal tests passed on Windows. |
| T-03 | AC-03 links and unsupported file types cannot redirect mutation | Symlink/junction/FIFO-or-equivalent fixtures | Security/E2E | PASS | Seven required Windows junction fixtures were created and verified; unsupported file-role fixture passed with no skip. Hosted POSIX proof is tracked by T-07. |
| T-04 | AC-04 destructive operations revalidate and remain narrow | Inject target changes and inspect surviving files | Integration/Security | PASS | Commit-start ownership race, linked source-parent race, unknown backup injection, and narrow cleanup tests passed. |
| T-05 | AC-05 force preserves unknown and unrelated files | Lifecycle tests with modified owned plus unknown files | E2E | PASS | Force removed modified owned regular files while preserving unknown files, unrelated Skills, an unknown junction, and its target. |
| T-06 | AC-06 transaction phases remain bounded and recoverable | Failure injection at stage/commit/rollback/recovery | Integration | PASS | All seven hooks from journal creation through commit complete produced the expected rollback/cleanup state; unknown backup content blocked cleanup and survived. |
| T-07 | AC-07 applicable tests run on all CI operating systems | Inspect hosted matrix logs and explicit skips | CI | PASS | Run `29595270211` passed every job for SHA `2a90b17`; logs prove seven native links plus FIFO/equivalent per OS lane. The sole suite skip was optional Codex CLI marketplace coverage, not a security fixture. |
| T-08 | AC-08 doctor is read-only on unsafe state | Hash/status tree before and after doctor | Integration | PASS | Healthy, malicious metadata, linked parent, partial phase, and unknown-backup tests preserved byte/type/mode/size/mtime/ctime snapshots. |
| T-09 | AC-09 valid lifecycle and exit behavior remain compatible | Run existing lifecycle/E2E and CLI error tests | Regression | PASS | `npm run check` passed 111/111 tests, stable exit categories, actual tarball lifecycle, lint, format, and pack checks. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [x] Valid user install, project install, update, doctor, normal uninstall, and force uninstall still work.
- [x] Unknown files and unrelated Skill directories survive every mutation path.
- [x] A failed transaction can be diagnosed and safely retried according to the documented contract.
- [x] No test uses or deletes the developer's real `HOME`, normal `.agents`, or normal Codex configuration.
- [x] Exit codes 4 through 7 remain semantically stable unless durable docs intentionally change.
- [x] `npm run check` and packed-distribution tests remain green.

## Commands

Planned commands; use focused test-file names discovered in the repository.

- `node --test test/skill-installation.test.mjs`
- `npm test`
- `npm run check`
- `npm run release:ci`
- `npm pack --dry-run --json`
- `git status --short`
- Hosted CI inspection for Linux, macOS, and Windows

## Results

Record exact platform, filesystem/link capability, commands, exit status, fixture paths under temporary roots, and concise outcomes. Never record real home-directory contents.

- Pre-change `git status --short`, `git diff`, and `git diff --cached`: exit 0 on Windows before Task 0013 edits. The worktree already contained preserved Task 0011–0016/evaluation/documentation work; the index had no staged diff.
- Static call-site inventory: the runtime has one recursive delete, limited to reserved stage/backup directories; doctor has no direct write primitive; uncovered revalidation, path-identity, unsafe-root, and link-skip risks are recorded in `TASK.md` for targeted tests.
- `node --test test/skill-installation.test.mjs`: latest exit 0 on Windows; 35/35 passed, zero skipped. Tests created and `lstat`-verified seven native junction fixtures, used a directory-at-file-path unsupported-role fixture, exercised portable POSIX/Windows absolute/traversal/mixed/collision tables, revalidated source and target races, preserved unknown/unsafe targets and unjournaled reserved siblings, and covered all seven transaction interruption hooks.
- Latest full `npm test` inside `npm run check`: exit 0 on Windows; 111/111 passed with zero skipped, including actual npm-tarball install/doctor/adapter/uninstall lifecycles.
- `npm run lint` and `npm run format:check`: exit 0; 29 JavaScript modules/foundation metadata and 140 UTF-8/LF text files passed.
- `npm run check`: exit 0 on Windows Node.js v24.11.0/npm 11.18.0; repeated 111/111 tests, lint, format, and the exact 29-file/56,491-byte package allowlist.
- `npm run release:ci`: exit 0 on Windows; repeated the stable gate, then created, extracted, inspected, and smoke-tested the real 29-file/56,491-byte archive with SHA-256 `5902ccb04c59661b1882a03aa9d52a579190007f6fc34ee9f33f8a9100edbc86`. No publication command ran.
- `npm pack --dry-run --json`: exit 0; 29 files, 56,491 packed bytes, 221,057 unpacked bytes, shasum `3e8c9bdb44c4bd48248a6064653410f09d8d9ada`, and no tarball persisted.
- Hosted Task 0010 pull-request run https://github.com/kimyeongwoo/kyw-dev/actions/runs/29595270211 for implementation SHA `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`: all Ubuntu/macOS/Windows Node.js 22/24 stable jobs, Ubuntu Node.js 26 compatibility, packed Ubuntu Node.js 24, and aggregate required jobs passed.
- Each hosted stable lane ran 95 tests: 94 passed, zero failed, one skipped, zero todo. Direct log inspection shows the only skip was the optional isolated Codex marketplace continuation because `codex` was unavailable; all packed direct lifecycles and all filesystem security tests ran first.
- Ubuntu job IDs `87934012433`/`87934012338` and compatibility job `87934012431` each logged seven verified native directory-link fixtures plus a verified FIFO. macOS job IDs `87934012208`/`87934012361` logged the same seven verified native links plus FIFO. Windows job IDs `87934012399`/`87934012236` logged seven verified native junctions plus the verified directory-at-file-path unsupported-role fixture. No capability path called `t.skip` or silently substituted a normal directory for a link.
- Every hosted stable job also passed lint, LF format, and the exact 29-file/53,242-byte package check. Packed job `87934012196` repeated the Linux link/FIFO evidence and passed real-archive inspection with SHA-256 `94924838e93d7dd04e56f1828d16397b0d72804187d2b378adc43c0d6bc71bf5`; aggregate job `87934240296` passed.
- Final scope review: `git diff HEAD^..HEAD --name-status` contains only Task 0013's core module, security test, and Task/Test pair; `git diff HEAD^..HEAD --check` passed. Current working-tree review also verified the localized README/Spec/Architecture safety updates while preserving pre-existing Task 0011/0012 and future-Task changes. Static search confirms the single production `rmSync` call is reached only through validated journal-owned stage/backup cleanup, and `test/skill-installation.test.mjs` contains no skip call.

## Unverified

- No acceptance-critical verification remains. Windows privileged file-symlink creation was not required separately because unprivileged native junctions exercised directory redirection on both LTS lanes; portable path/link logic and unsafe final-file handling ran on every host.
- `npm publish` and `npm publish --dry-run` were not run because publication is out of scope and the user prohibited publish work.
- A continuously privileged same-user attacker can still race the final path check/use boundary because portable Node standard-library APIs do not expose a cross-platform directory-handle-relative transaction. Architecture records this residual risk; deterministic race hooks verify fail-closed behavior at every available transaction boundary.

## Final Coverage Review

Before marking this Test `PASSED`:

- [x] Review every filesystem mutation call site against at least one normal and one hostile test.
- [x] Confirm link fixtures actually created links/junctions rather than silently falling back to directories.
- [x] Confirm force mode never broadens beyond owned files.
- [x] Confirm doctor changed no bytes or metadata in its inspected tree.
- [x] Confirm interruption tests cover every transaction phase.
- [x] Record residual TOCTOU limitations explicitly.
