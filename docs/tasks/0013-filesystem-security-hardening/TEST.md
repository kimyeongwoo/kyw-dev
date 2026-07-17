# TEST 0013 — Filesystem Security Hardening

## Status

RUNNING

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
| T-07 | AC-07 applicable tests run on all CI operating systems | Inspect hosted matrix logs and explicit skips | CI | TODO | |
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

## Unverified

- Linux/macOS native directory symlink plus FIFO creation and Windows hosted junction creation remain unverified until the corresponding Task 0010 matrix logs pass and show fixture diagnostics.
- `npm run release:ci`, `npm pack --dry-run --json`, and hosted CI inspection are not yet run for the final implementation.

## Final Coverage Review

Before marking this Test `PASSED`:

- [ ] Review every filesystem mutation call site against at least one normal and one hostile test.
- [ ] Confirm link fixtures actually created links/junctions rather than silently falling back to directories.
- [ ] Confirm force mode never broadens beyond owned files.
- [ ] Confirm doctor changed no bytes or metadata in its inspected tree.
- [ ] Confirm interruption tests cover every transaction phase.
- [ ] Record residual TOCTOU limitations explicitly.
