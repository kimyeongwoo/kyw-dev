# TEST 0020 — Release Readiness Gate

## Status

RUNNING

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Prior gate and remediation evidence: Tasks `0016`, `0017`, `0018`, and `0019`
- CI contract: `../../../.github/workflows/ci.yml`
- Package and lifecycle contracts: `../../../package.json`, `../../../scripts/packed-release-check.mjs`, and `../../../scripts/release-gate-isolation.mjs`
- Behavior contracts: `../../../scripts/grilling-eval.mjs`, `../../../scripts/audit-smoke.mjs`, and the four packaged Skills
- Current official requirements: the current Codex manual sections for plugin structure, marketplaces, and Skill authoring/discovery loaded through the `openai-docs` Skill

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 next number and diff attribution are unambiguous | Compare local Task dirs/refs, remote heads, Git status/index, Task 0016 snapshot, and Tasks 0017–0019 path sets | Audit | PASS | `0020` was absent locally/remotely; `2a90...→c769...` is the recorded 78-path Tasks 0011–0016 snapshot, and current-hash delta from `c769...` contains only Task 0016 final evidence plus declared Tasks 0017–0019 paths. Index was empty. |
| T-02 | AC-02 candidate SHA, dedicated branch, push, and detached cleanliness | Commit reviewed paths, push normally, add detached worktree, and record SHA/status | Release provenance | TODO | Pending candidate commit. |
| T-03 | AC-03 all nine hosted jobs pass for exact SHA | Dispatch CI, inspect run `headSha`, job names/conclusions, and relevant native logs | Hosted CI | TODO | Pending candidate SHA. |
| T-04 | AC-04 requested source commands pass | Execute six named commands in the detached worktree | Regression/Packaging | TODO | Pending candidate SHA. |
| T-05 | AC-05 real tarball identity, exact contents, and extracted validators pass | Pack once, hash/list/extract, run allowlist/hygiene/legal/CLI and current plugin/four-Skill validators | Packaging/Release E2E | TODO | Pending candidate SHA. |
| T-06 | AC-06 full pinned grilling parity passes | Verify frozen config, run all eight scenarios/two variants/two repetitions, report twice, audit artifacts and flags | Model E2E/Eval | TODO | Pending candidate SHA. |
| T-07 | AC-07 filesystem hardening passes locally and in exact-SHA hosted lanes | Run focused suite and inspect native link/type evidence in hosted logs | Security/CI | TODO | Pending candidate SHA. |
| T-08 | AC-08 audit deterministic/read-only/fix contracts pass | Run focused deterministic suite and both isolated model smoke modes | Unit/Model E2E/Security | TODO | Pending candidate SHA. |
| T-09 | AC-09 guarded direct lifecycle passes without protected-state change | Run the standalone required release-isolation runner and inspect all direct steps, sentinels, env, cleanup | Distribution E2E/Security | TODO | Pending candidate SHA/tarball. |
| T-10 | AC-10 marketplace/plugin lifecycle passes on the same tarball | Require Codex, verify add/discover/install/cache byte parity/remove flow | Plugin E2E | TODO | Pending candidate SHA/tarball. |
| T-11 | AC-11 four packed-Skill fresh sessions pass | Run one bounded isolated session per Skill with source-read and fixture/auth invariants | Model E2E | TODO | Pending candidate SHA/tarball. |
| T-12 | AC-12 npm name and official requirements are current | Isolated read-only npm probes; current manual inspection; official/current plugin and Skill validation | Registry/Documentation/Audit | TODO | Manual was current at Task creation; candidate-specific validation and registry probes pending. |
| T-13 | AC-13 no forbidden action and exact later commands are ready | Audit refs/releases/registry and record exact guarded publish plus rollback/deprecation commands without execution | Release safety | TODO | Pending final candidate artifact. |
| T-14 | AC-14 exact-SHA mapping, document impact, diff coverage, and final result are complete | Reconcile every row/result/path/hash and terminal states | Audit | TODO | Pending all gates. |

Every acceptance criterion maps to at least one row. Any required unavailable or failed gate remains `FAIL`/`BLOCKED`; this Task does not repair it.

## Regression Coverage

- [ ] Exact candidate SHA is pushed and cleanly materialized in a detached worktree.
- [ ] Ubuntu/macOS/Windows Node 22 and Node 24 jobs pass for that SHA.
- [ ] Ubuntu Node 26 compatibility, packed release, and required aggregate jobs pass for that SHA.
- [ ] `npm test`, lint, format, pack, check, and release:ci pass.
- [ ] Real tarball checksum, exact list, extracted hygiene/legal/CLI, plugin, and four Skill validators pass.
- [ ] Complete frozen grilling parity passes without selective retry or changed inputs.
- [ ] Filesystem hardening, audit deterministic, audit read-only, and audit fix gates pass.
- [ ] Guarded user/project/force lifecycle and isolated marketplace lifecycle pass from real packed bytes.
- [ ] All four fresh-session Skill smokes pass with exact source-read and state-preservation evidence.
- [ ] Read-only npm name and current official requirement checks pass or record a blocker.
- [ ] Normal protected state, credentials, parent environment, unrelated work, and forbidden release state remain unchanged.
- [ ] Exact publication and recovery commands are prepared but not run.

## Commands

Planned commands; Results will retain only commands actually run and their outcomes. Authentication paths and values must remain redacted.

- Provenance: `git status --short --branch`, `git diff`, `git diff --cached`, `git diff --check`, path/hash comparisons against `c769b6f8...`, candidate `git rev-parse HEAD`, `git ls-remote`, and clean detached-worktree status.
- Candidate: intentional `git add` of the reviewed path set, one `git commit`, and normal `git push -u origin task/0020-release-readiness-gate`.
- Hosted: `gh workflow run CI --ref task/0020-release-readiness-gate`, then `gh run list/view` and direct nine-job/log inspection with exact `headSha` matching.
- Source: `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, `npm run check`, and `npm run release:ci`.
- Artifact: isolated `npm pack --ignore-scripts --json --pack-destination <approved-temp-root>`, SHA-256, `tar -tf`, safe extraction, exact-file comparison, and extracted validators.
- Grilling: `npm run eval:grilling:unit`; frozen-input hash/structural checks; `npm --silent run eval:grilling:compare -- --allow-model --scenario all --model gpt-5.6-luna --reasoning-effort high --runs 2 --auth-file <explicit-isolated-auth-source>`; reporter twice; artifact/flag audit.
- Filesystem: `node --test test/skill-installation.test.mjs` plus exact-SHA hosted native-log inspection.
- Audit: `node --test test/kyw-audit.test.mjs test/audit-smoke.test.mjs`; read-only and fix `npm --silent run eval:audit:smoke -- --allow-model --mode <mode> --model gpt-5.6-sol --reasoning-effort high --auth-file <explicit-isolated-auth-source>`.
- Lifecycle: `node ./scripts/release-gate-isolation.mjs` in required-marketplace mode.
- Fresh Skills: four isolated `codex exec` sessions over the extracted packed Skills, each with explicit model/effort/auth source, ignored normal config/rules, bounded fixture, and source-read/state predicates.
- Registry/docs: isolated `npm ping`, `npm view kyw-dev ... --json`, `npm search kyw-dev --json`, read-only `npm whoami`; current Codex manual target sections; current official/local plugin and Skill validators.
- Safety/final: local/remote tags, GitHub releases, package registry state, temporary-root residue, source checkout status, Task validator, and final diff/package coverage review.

`npm run release:check` and every `npm publish` form are prohibited in this Task.

## Results

- Task-number/diff preflight completed before this pair was created. Local Task names ended at `0019`; local and remote refs had no `task/0020-*`. Branch `task/0020-release-readiness-gate` was created without moving or clearing the worktree.
- Initial checkout parent is `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`; Task 0016 snapshot is `c769b6f8ed10f1a4159e468ec1abc97508a50530`. Snapshot diff contains exactly 78 recorded Tasks 0011–0016 paths. A current-file hash comparison to that snapshot contains only Task 0016 final evidence and Tasks 0017–0019 declared changes. No staged or unexplained path existed.
- Task 0017 is not terminally successful: `TASK.md` and `TEST.md` both say `BLOCKED` after one config-v10 kyw CV-06. This is retained as dependency evidence rather than silently reconciled with the request's “completed” label.
- Current official-manual preflight used the `openai-docs` helper, which reported its cached manual already current. Targeted official sections confirm the candidate's required plugin/Skill/marketplace surfaces in principle; exact candidate validation is not yet claimed.

## Unverified

- Candidate SHA, push, detached worktree, hosted CI, source/tarball gates, all model-backed gates, lifecycle gates, registry probes, prepared commands, and final verdict remain unverified at Task creation.
- Task 0017's prior zero-critical gate remains failed until this gate produces independent full-cohort evidence; old failed evidence will not be rewritten.

## Final Coverage Review

Before terminal status:

- [ ] Confirm every result names the candidate SHA and, where applicable, the same tarball SHA-256.
- [ ] Confirm all nine hosted job names and conclusions directly.
- [ ] Confirm all source, extracted-package, model, filesystem, audit, lifecycle, marketplace, and Skill gates actually ran.
- [ ] Confirm no selective retry, tuning, defect fix, normal-state mutation, or forbidden external action occurred.
- [ ] Compare every candidate path and meaningful behavior with this matrix and the permanent-document routing.
- [ ] Validate this Task/Test pair and record every failure, limitation, residual risk, and prepared command.
- [ ] Record exactly one final result: `READY_FOR_APPROVAL` or `BLOCKED`.
