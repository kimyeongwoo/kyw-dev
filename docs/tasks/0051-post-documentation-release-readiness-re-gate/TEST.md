# TEST 0051 — Post-Documentation Release-Readiness Re-Gate

<!-- kyw-task-contract: 2 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`.
- Hard dependency: Task 0050 and its Task 0049 chain must be repository-complete and externally delivered.
- Product requirements: `../../SPEC.md`, especially release tiers, candidate identity, distribution, evidence honesty, and separate publication approval.
- Architecture constraints: `../../ARCHITECTURE.md`, especially immutable candidate boundaries, credential-free CI, release isolation, package contents, protected state, and external delivery.
- Repository rules: `../../../AGENTS.md`.
- Historical inputs: Tasks 0047–0050 are evidence and dependency context; no prior candidate verdict is current-byte PASS.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Requested model alias: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: not recorded yet)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — Delivered clean exact-main base | Prove Tasks 0049–0050 terminal pairs and exact-SHA `STANDARD` ledgers, repository root/branch, HEAD/upstream/local/origin/direct `main`, clean worktree, transaction absence, and dependency graph before candidate work. | Integrity/external read-only | TODO | Planned fresh Git/GitHub/validator preflight; no Task 0051 command has run. |
| T-02 | AC-02 — Fresh candidate identity | Create one real npm tarball from the fixed source SHA and record package/version, filename, count, sizes, archive SHA-256, and available shasum/integrity from actual output. | Release/package | TODO | Planned approved repository-defined candidate sequence; identity is intentionally unknown at authoring. |
| T-03 | AC-03 — Final retention and README package bytes | Inspect the extracted archive and source/object mapping for final retention/guidance, README, runtime/Skills/templates/legal files, allowlist identity, and required exclusions. | Package/E2E | TODO | Planned real-archive inventory, extraction, hygiene, legal, CLI, and Skill checks. |
| T-04 | AC-04 — Current-byte Stable/candidate/release evidence without duplication | Run the current repository-defined non-duplicating sequence and bind each distinct boundary to the same candidate; reject reuse of Task 0047 PASS. | Stable/release audit | TODO | Planned planner/script inspection followed by only the approved composite or distinct leaf boundaries. |
| T-05 | AC-05 — Approval boundary | Before each gated command, record exact command, purpose, non-mutation basis, retry, model calls/cost, credential handling, and stop rule; require an explicit user approval matching that set. | Approval/manual | TODO | Approval has not been requested or granted for Task 0051. |
| T-06 | AC-06 — Registry/auth, isolation, and model necessity | Execute approved observation/isolation commands with protected-state evidence; resolve any model-backed requirement from current repository truth and block rather than guess when required evidence is unavailable. | External/security/audit | TODO | Planned registry/auth and isolation observations; model result is not pre-classified. |
| T-07 | AC-07 — Exact verdict semantics | Cross-check all required evidence and derive only `READY_FOR_APPROVAL` or `BLOCKED` tied to exact source/archive identity, with no publication-authority implication. | Audit | TODO | Verdict is intentionally unverified and absent at authoring. |
| T-08 | AC-08 — Forbidden mutation absence | Compare repository/package/version/tags/Releases/registry/public state, commands, Task inventory, external temp cleanup, and credential retention before/after. | Integrity/security | TODO | Planned before/after proof; no forbidden action is authorized. |
| T-09 | AC-09 — Exact-head and post-merge CI | Bind the Task 0051 PR to its expected head, require every exact-head job success, verify the expected merge SHA, and require the exact post-merge `main` push run success. | External delivery | TODO | Future GitHub ledger evidence must be queried after repository completion; never pre-claimed here. |
| T-10 | AC-10 — Canonical and final evidence gate | Validate the pair and every Task, compare final package/source/status identities, inspect protected-state and credential evidence, run whitespace review, and map every final diff effect to a test row. | Integrity/audit | TODO | Planned terminal commands and manual review; no PASS is pre-claimed. |

## Regression Coverage

- Full Stable repository contract and exact hosted Node/OS matrix remain required.
- Actual candidate allowlist, runtime/Skill behavior, licenses/notices, direct install, plugin marketplace lifecycle, and protected-state isolation remain required.
- Task 0049 completed-outcome retention contract and refactor guidance are present in the intended source/package boundary.
- Task 0050 stable README wording is present in the candidate without another mutable-status edit.
- Historical Task 0047 evidence remains immutable but is never reused as current-byte readiness.
- Publication, registry mutation, version/tag/Release/submission changes, Task 0052, and product fixes remain absent.

## Commands

- Planned read-only preflight: `git status --porcelain=v2 --branch --untracked-files=all`; `git rev-parse HEAD`; `git rev-parse @{upstream}`; `git rev-parse refs/heads/main`; `git rev-parse refs/remotes/origin/main`; `git ls-remote origin refs/heads/main`; Task 0049/0050 pair validation; transaction inspection; and fresh GitHub PR/Actions queries for dependency delivery.
- Planned Release-tier classifier: `npm run verify:plan -- --candidate package.json .codex-plugin/plugin.json src skills templates README.md LICENSE THIRD_PARTY_NOTICES.md licenses`.
- Approval-required composite candidate command: `npm run release:check`. At execution, report that it currently expands to Stable, one candidate, and one internal non-publishing dry run; revalidate this before asking approval and do not pre-run duplicate leaf gates.
- Separately approval-required standalone boundary, only with a distinct non-duplicate reason: `npm publish --dry-run --json`. It is never actual publication, but may contact the registry and write local cache/log state.
- Approval-required registry/auth observations: `npm ping --registry=https://registry.npmjs.org/`; `npm view kyw-dev --json --registry=https://registry.npmjs.org/`; `npm search kyw-dev --json --registry=https://registry.npmjs.org/`; `npm whoami --registry=https://registry.npmjs.org/`. Use fresh Task-owned external cache/log/temp state where applicable, keep the normal credential source read-only, and retain no username/token/config contents.
- Approval-required release isolation: `node ./scripts/release-gate-isolation.mjs`.
- Approval-required model command: none is preauthorized or invented. If execution proves a repository-defined required command exists, present its exact model, reasoning effort, authentication source, invocation/call count, estimated cost, retry and stop rule before approval; otherwise record reasoned `N/A` with zero calls/cost/retries.
- Planned canonical/final checks: validate every Task directory with the packaged adapter, run `git diff --check`, confirm exact changed/package paths and external temporary-root cleanup, scan retained evidence for credential markers, and complete AC-to-test/final-diff review.
- Forbidden: `npm publish`, version changes, Git tags, GitHub Releases, public submissions, Task 0052 creation, product fixes, workflow reruns, force/destructive actions, and unapproved gated commands.

## Results

- Not applicable — verification has not run.

## Unverified

- Dependency delivery, exact source/candidate identities, every local/external gate, authentication, isolation, model necessity, readiness verdict, exact-head PR CI, post-merge `main` CI, and publication permission are unverified.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
