# TEST 0029 — Full Release Readiness Re-Gate

## Status

RUNNING

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially §15 AC-01 through AC-12.
- Architecture constraints: `../../ARCHITECTURE.md`.
- Release entry point and status: `../../../README.md`.
- Historical evidence: Tasks 0017 and 0020.
- Remediation and acceptance evidence: Tasks 0021, 0023, 0024, 0025, 0026, 0027, and 0028.
- Candidate basis: the immutable Commit A formed by Task 0029 from `origin/main` at `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`.

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 exact package contents | Inspect one real candidate tarball, exact allowlist, entry safety, metadata, source-byte identity, exclusions, and legal/runtime surfaces. | Package | TODO | Candidate pending. |
| T-02 | AC-02 user-scope installation | Install exact tarball under isolated user state; inspect four Skills, hashes, ownership, and unrelated-file preservation. | Acceptance | TODO | Candidate pending. |
| T-03 | AC-03 project-scope installation | Install exact tarball into a fresh Git repository; prove four project Skills, no user leak, and existing-file preservation. | Acceptance | TODO | Candidate pending. |
| T-04 | AC-04 empty-project initialization carry-forward | Compare candidate packed behavior inputs to Task 0027 bytes and retain its direct sub-verdict only on exact equality. | Identity / acceptance | TODO | Candidate pending. |
| T-05 | AC-05 existing-project adoption carry-forward | Compare candidate packed behavior inputs to Task 0027 bytes and retain its direct sub-verdict only on exact equality. | Identity / acceptance | TODO | Candidate pending. |
| T-06 | AC-06 one-Task authoring/execution carry-forward | Compare candidate packed behavior inputs to Task 0027 bytes and retain its direct sub-verdict only on exact equality. | Identity / acceptance | TODO | Candidate pending. |
| T-07 | AC-07 multi-outcome narrowing carry-forward | Compare candidate packed behavior inputs to Task 0027 bytes and retain its direct sub-verdict only on exact equality. | Identity / acceptance | TODO | Candidate pending. |
| T-08 | AC-08 audit/ordinary-prompt routing carry-forward | Compare candidate packed behavior inputs to Task 0027 bytes and retain its direct sub-verdict only on exact equality. | Identity / acceptance | TODO | Candidate pending. |
| T-09 | AC-09 bare audit | Directly follow the exact packed Skill in a fresh fixture; prove source read, two stable findings, no mutation attempt/write, limitations, and `BLOCKED`. | Direct behavioral | TODO | Candidate pending. |
| T-10 | AC-09 `--fix` audit | In a separate fresh fixture, establish findings, announce a bounded finding/path/check plan before mutation, repair only expected paths, preserve unrelated work, rerun checks, and issue an evidence-based verdict. | Direct behavioral | TODO | Candidate pending. |
| T-11 | AC-10 lifecycle and filesystem safety | Run packed lifecycle, focused deterministic installation/recovery/link tests, and the full stable suite on current and hosted platforms. | Acceptance / regression | TODO | Candidate pending. |
| T-12 | AC-11 packaged Skill loading | Run the canonical isolated local-marketplace add/discover/install/list/remove lifecycle with current Codex CLI and byte-match all four Skills. | Acceptance | TODO | Candidate pending. |
| T-13 | AC-12 licensing | Hash and inspect candidate MIT/third-party bytes; retain published-tarball verification as pending. | Package / manual | TODO | Candidate pending. |
| T-14 | AC-13 stable source verification | Run `npm test`, lint, format check, pack check, aggregate check, `release:ci`, and `git diff --check` at detached candidate SHA. | Regression | TODO | Candidate pending. |
| T-15 | AC-13 fresh exact-candidate hosted CI | Dispatch one new attempt-1 workflow run and inspect all nine jobs/logs for exact SHA, runtimes, native fixtures, packed execution, and credential-free permissions. | Hosted integration | TODO | Candidate pending. |
| T-16 | AC-14 registry and official requirements | Perform fresh read-only npm registry checks and verify current official OpenAI Plugin/Skill requirements plus local validators. | External read-only | TODO | Candidate pending. |
| T-17 | AC-14 protected-state integrity | Compare normal `.agents`, Codex control/auth/config, npm configuration/cache relevance, source/worktree, authentication source, environment, processes, and Task-owned residue before/after. | Safety | TODO | Candidate pending. |
| T-18 | AC-15 terminal two-commit and package identity | Diff Commit A to B, verify exact two-file scope and historical bytes, then repack B and compare all package identities to Commit A. | Identity | TODO | Candidate pending. |
| T-19 | AC-16 PR and merge delivery | Verify non-draft PR scope, exact-head 9/9 CI, review/thread/mergeability state, expected-head merge parents, exact-merge main 9/9 CI, and package identity. | Hosted delivery | TODO | Candidate pending. |
| T-20 | Current grilling contract | Run frozen deterministic checks and directly verify six bounded packed-contract fixtures without a new cohort; reconcile Tasks 0017 and 0020 honestly. | Direct behavioral / regression | TODO | Candidate pending. |
| T-21 | Evaluator and release-isolation guarantees | Run focused/full cleanup, process, platform, isolation-attribution, and audit-classifier checks; use exact-candidate hosted Windows/POSIX evidence for real native fixtures. | Safety regression | TODO | Candidate pending. |

## Regression Coverage

- Stable package, Skill, CLI, installation, Task-artifact, audit, grilling, evaluator, isolation, CI, and legal/foundation suites.
- Native POSIX links and Windows junctions with zero passing capability skips.
- Task 0028 guarantees: owned removal awaited, bounded Node retry, first terminal cause, owned process tree only, listener restoration, no incomplete publication, auth-source immutability, safe diagnostics, and no ambient process scan.
- Exact Task 0027 S-01 through S-06 behavior bytes, without rerunning those model scenarios merely for formality.
- Task 0017 failed cohort and any available Task 0020 complete comparison remain historical/supplementary, never newly executed evidence.

## Commands

- Planned stable commands: `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, `npm run check`, `npm run release:ci`, and `git diff --check`.
- Planned focused deterministic commands cover audit classifier/smoke, grilling unit/frozen input, installation/filesystem, evaluator cleanup/process/platform, and release isolation.
- Planned external commands are read-only registry queries, official-document retrieval, Actions/PR inspection, and exact normal GitHub pushes/merge.
- Prohibited commands remain unexecuted: `npm run release:check`, every `npm publish` form including dry-run, registry mutation, tag/release/public-submission commands, and existing workflow reruns.

## Results

- Exact preflight: PASS; expected state confirmed and no drift/collision/user work found.
- Candidate and release evidence: not run yet.

## Candidate Identity

- Source branch: `task/0029-full-release-readiness-regate`.
- Base commit: `a8c3cef301de6cc4e1d4883ac55f9a9a6fe245dc`.
- Candidate SHA/tree/remote/worktree: pending Commit A.

## Package Identity

- Candidate filename, shasum, integrity, SHA-256, sizes, and exact inventory: pending.
- Evidence-head and merge package identity: pending.

## Hosted Evidence

- Fresh exact-candidate manual run: pending.
- Exact-head PR run: pending.
- Exact-merge main run: pending.

## Behavioral Evidence

- Task 0027 direct evidence carry-forward: pending relevant-byte comparison.
- Audit bare and fix evidence: pending, to be labeled `CURRENT_SESSION_DIRECT`.
- Grilling bounded fixtures: pending, to be labeled `CURRENT_SESSION_DIRECT`.

## Historical Evidence Reuse

- Task 0017 remains immutable `BLOCKED/BLOCKED`; its failed cohort is not replaced or reported as a current PASS.
- Task 0020 remains immutable `BLOCKED/BLOCKED` for candidate `54b9…`; it is not resumable.
- Task 0027's `SPEC_AC04_AC08_DIRECTLY_VERIFIED` sub-verdict may be reused only after exact candidate relevant-byte identity.
- Task 0028 stable and hosted cleanup evidence may support unchanged evaluator bytes; no 20/20 or 10/10 stress repeat is planned absent a current failure or changed byte.

## Registry and Official Requirements

- Fresh npm ping/view/search/whoami state: pending final-verdict window.
- Current official OpenAI documentation identity, access time, requirement comparison, current CLI version, and local validator results: pending.

## Protected-State Evidence

- Before snapshots, release-isolation attribution, authentication-source identity, after snapshots, worktree/source status, process check, and residue cleanup: pending.

## Unverified

- All candidate-specific, hosted, external, terminal, and post-merge checks remain unverified until actually executed.
- The literal actually published-tarball licensing/identity criterion cannot be verified because publication is not authorized.

## Final Coverage Review

- [ ] Compare the final diff against this matrix and the Task acceptance criteria.
- [ ] Resolve every matrix row to PASS, BLOCKED, or explicitly unverified with actual evidence.
- [ ] Record every command actually run, exit status, count, retry, failure, skip, and limitation.
- [ ] Confirm all SPEC §15 criteria are separately evaluated without a generic aggregate PASS.
- [ ] Confirm no unsupported PASS, release defect repair, Task 0030, or publication action occurred.
