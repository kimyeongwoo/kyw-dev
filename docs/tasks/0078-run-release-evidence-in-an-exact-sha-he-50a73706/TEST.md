# TEST 0078 — Run Release Evidence in an Exact-SHA Hermetic Manual Runner

<!-- kyw-task-contract: 3 -->

## Status

BLOCKED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`, especially acceptance evidence, fail-closed integrity, exact-SHA verification, credential-free release preflight, and separate publication authority.
- Architecture constraints: `../../ARCHITECTURE.md`, especially package/publication boundaries, release verification, retained evidence, path containment, protected state, and owned cleanup.
- Direct owner: Task 0052 and `../../../scripts/release-evidence-harness.mjs`.
- Compatibility owners: Task 0025 and Tasks 0067–0069.
- Causal evidence: blocked Task 0076, read-only.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured reasoning effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exact immutable input and authority gate | Mutate SHA syntax/resolution, source status/type/identity, root containment, and authorization; assert harness/release child count zero on every rejection. | Unit / security | PASS | Runner tests reject malformed/full-SHA drift, dirty and hidden-dirty source bytes, link/overlap roots, missing authority, duplicate markers, and runtime aliases before a release child. |
| T-02 | AC-02 — exact detached checkout and source immutability | Materialize an owned local checkout, compare commit/tree/script/package identities, require clean before/after state, and hash source HEAD/index/worktree/refs/worktree metadata around the run. | Integration / Git | PASS | Runner integration tests use no-local/no-hardlink detached clones, compare SHA/tree/blob/status and source Git identity before/after, and reject checkout/source drift. |
| T-03 | AC-03 — credential-free hermetic environment | Inject interactive and credential-bearing parent values; inspect the child environment and resolved paths and require only canonical owned home/Codex/app-data/XDG/temp/Git/npm roots with no forbidden value. | Unit / integration / privacy | PASS | Whitelist projection, cross-process proof validation, path aliases, exact npm launcher, credential/proxy stripping, and disjoint owned layouts are covered deterministically. |
| T-04 | AC-04 — hermetic fail-closed state without interactive coupling | Mutate attributed and unattributed isolated entries and separately churn synthetic interactive Codex/plugin-cache state; require isolated drift failure and unchanged verdict/input for interactive churn. | Isolation / failure | PASS | Harness proof/protected-state tests reject proof, config, hidden tracked-byte, and isolated-root drift while the runner excludes interactive roots from the child and verdict inputs. |
| T-05 | AC-05 — one complete command graph and no fallback | Inspect and inject duplicate, retry, lifecycle, actual-publish, standalone-dry-run, model, workflow, alternate npm, and fallback branches; assert at most one release child. | Unit / authority | PASS | Harness plan and runner fake-child tests prove one runner/one harness/one composite child maximum, zero retry, duplicate rejection, exact npm launcher, and no alternate release command. |
| T-06 | AC-06 — durable bounded evidence on every terminal path | Force spawn, child, parser, protected-state, and post-processing failures; verify source/environment provenance, streams, exit/runtime, hashes, and atomic redacted summaries survive. | Integration / durability | PASS | Spawn, exit, parser, forged-success, marker drift, state/evidence seal, postflight, and partial-layout seams retain raw/bounded evidence and never return PASS. |
| T-07 | AC-07 — sealed ownership and preservation | Exercise exact sealed cleanup plus parent, repository, home, evidence, foreign-entry, link, and identity-drift rejections; require evidence retention by default. | Filesystem / security | PASS | State/evidence preservation, pre-existing seal rejection, inventory/identity binding, quarantine recheck, foreign-entry rejection, and exact owned cleanup are covered. |
| T-08 | AC-08 — cross-platform and harness compatibility | Cover Windows aliases/reparse/spaces and POSIX links/containment/capability failures, then run existing harness, provenance, planner, instruction, and release regressions. | Cross-platform / regression | PASS | The final integrated focused suite passed 85/85: runner coverage includes spaces, Windows drive/UNC/extended/case/8.3 and PATHEXT, POSIX links, missing capabilities and inverse aliases; harness coverage includes exact npm runtime/package provenance and internal-only package links. |
| T-09 | AC-09 — one real exact-SHA credential-free release check | After committing the correction and completing all preflight, invoke the manual runner once with the literal SHA, require Stable/candidate/dry-run completion and retained reproducible evidence, and forbid rerun credit. | Manual native / Release | FAIL | The sole exact-SHA attempt was consumed once and retained, but `npm test` reported 451 pass / 26 fail / 6 skip; Stable stopped before lint/format/pack, candidate, and npm dry-run. No rerun is permitted. |
| T-10 | AC-10 — external publication state remains unchanged | Compare credential-free npm latest/version/target reads, publish-workflow runs, remote tags, Releases, and submission evidence immediately before and after the one attempt. | Live read-only / authority | PASS | Credential-free public snapshots match on npm latest/versions/target absence, remote tags, two historical workflow runs, empty Releases, and no submission action. |
| T-11 | AC-11 — development-only scope and durable documentation | Inspect package/dependency/lifecycle/workflow selection, README/ARCHITECTURE projections, unchanged SPEC/AGENTS/Task 0076, complete diff, pair validation, and transaction state. | Package / docs / integrity | PASS | README/Architecture, planner, Stable/package/Release preflight, pair/transaction, unchanged package/workflow/SPEC/AGENTS paths, expected committed scope, and Task 0076 immutability pass. |

## Regression Coverage

- The retained-evidence harness keeps its npm provenance, exact command plan, raw-first durability, redaction, duplicate guard, and ownership-safe cleanup behavior.
- Task 0025 attributed and unattributed drift remains fail-closed inside the hermetic roots; no wider allowlist or ambient success classification is added.
- `release:check` remains `release:ci` plus one npm publish dry run only; no actual publish, lifecycle script, token, retry, or alternate release path is introduced.
- Public `ci.yml` and manual `publish.yml` triggers, permissions, exact-SHA gates, and non-automatic relationship remain unchanged.
- The package keeps no dependencies and excludes scripts, tests, Task artifacts, evidence, credentials, machine paths, and runner state.
- Task 0076 and all terminal historical pairs remain unchanged; prior failed/ambient attempts are not reused as PASS.

## Commands

- `node --check ./scripts/release-evidence-manual-runner.mjs`
- `node --check ./scripts/release-evidence-harness.mjs`
- `node --test ./test/release-evidence-manual-runner.test.mjs ./test/release-evidence-harness.test.mjs ./test/verification-plan.test.mjs ./test/instruction-surfaces.test.mjs`
- Harmless dry validation: `node ./scripts/release-evidence-manual-runner.mjs --dry-validate --repository <source-repository> --source-sha <literal-40-hex-commit> --allowed-parent <caller-owned-external-parent> --evidence-root <caller-owned-external-evidence-root>`
- `npm run verify:plan -- scripts/release-evidence-manual-runner.mjs scripts/release-evidence-harness.mjs test/release-evidence-manual-runner.test.mjs test/release-evidence-harness.test.mjs scripts/verification-plan.mjs test/verification-plan.test.mjs README.md docs/ARCHITECTURE.md`
- `npm test`
- `npm run lint`
- `npm run format:check`
- `npm run pack:check`
- `npm run release:ci`
- Credential-free before/after reads: `npm view kyw-dev dist-tags --json`, `npm view kyw-dev versions --json`, and `npm view kyw-dev@0.1.4 version --json`, with isolated nonexistent npm configs/cache and target absence required.
- Before/after GitHub/public reads: `gh run list --workflow publish.yml`, `git ls-remote --tags origin`, and `gh release list`.
- Exactly once after committing the correction: `node ./scripts/release-evidence-manual-runner.mjs --run --allow-release-command --repository <source-repository> --source-sha <literal-exact-correction-SHA> --allowed-parent <caller-owned-external-parent> --evidence-root <caller-owned-external-evidence-root>`.
- `node ./skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this Task directory>`
- `node ./skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root ./docs/tasks`
- `git diff --check`

## Results

- PASS — entry validation accepted Task 0078, its delivered Task 0052 and Task 0077 hard dependencies, and transaction state `NONE`; fresh fetch kept local and remote `main` aligned at `ae2ca0e23e8bcbf3beb53b9bb659c2358b67d60a`, with only the selected pre-authored pair present as untracked work.
- PASS — the sole production dispatcher freshly evaluated Task 0077 as the one uncovered prior `STANDARD` outcome and selected `IMPLEMENT / 0078`; after the dedicated branch and valid active pair existed, its prepared transition was applied exactly once and advanced the checkpoint to 45 outcomes with digest `755fdc16…`.
- PASS — `node --test ./test/verification-plan.test.mjs` passed 9/9 after the planner classified the runner, harness, and both focused test paths as Release-sensitive; documentation changes remain below each document's material-growth threshold.
- PASS — permanent-document measurement against exact base `main` records README at 16,881→18,313 bytes / 227→243 lines, AGENTS at 3,945 bytes / 48 lines, SPEC at 44,348 bytes / 454 lines, Architecture at 41,756→42,634 bytes / 836→849 lines, and the combined set at 106,930→109,240 bytes / 1,565→1,594 lines. README and Architecture each remain below their material-growth thresholds; no warning or hard budget changes.
- PASS — `node --check` accepted both release-evidence scripts. The focused harness suite passed 24/24 and then 25/25 after explicit final-hermetic-environment baseline coverage was added; it exercised valid/invalid/reused proof, proof-owned npm paths, spawn/parser/raw durability, direct actual gating, and existing self-test/dry compatibility without invoking `release:check`.
- FAIL then PASS — the first `npm run lint` stopped in foundation metadata because the newly required permanent-document table used a bold `Combined` key and reasoned `Not applicable` for the already-over-warning unchanged SPEC. After canonical row/value and meaningful review evidence were recorded, the identical command passed 86 JavaScript modules and foundation metadata.
- PASS — `npm run format:check` passed 364 UTF-8/LF text files after the runner and harness implementation landed; `git diff --check` reported no whitespace error on the harness changes.
- PASS — after the final runner/test additions, `npm run format:check` passed 365 UTF-8/LF text files and `git diff --check` remained clean. The exact changed-path planner command selected `RELEASE`, one local `npm run release:ci`, and the unchanged hosted exact-SHA requirement.
- PASS — an independent current-tree harness run passed 26/26, including hidden tracked-byte drift, proof receipt, proof-owned npm environment, raw-first failure evidence, direct actual gating, harmless dry/self-test compatibility, and development-only package scope. Verification-plan plus instruction-surface regressions passed 19/19.
- PASS — the expanded runner suite passed 36/36 after focused seams proved that a pre-created state seal and an in-run deleted/replaced actual-attempt marker both terminate as `EVIDENCE_FAILED`, preserve their owned roots, and produce no PASS or outer success seal.
- INTERRUPTED / SUPERSEDED — the first independent integrated focused rerun was stopped after the concurrent final audit found the pre-existing state-seal and marker-lifetime false-PASS gaps. Its partial output was green, no actual harness or release command ran, and only the corrected full rerun can receive PASS credit.
- FAIL then PASS — a later `npm run lint` correctly rejected stale README/Combined permanent-document measurements after two README hardening lines were added. After recalculation to README 18,313 bytes / 243 lines and combined 109,240 bytes / 1,594 lines, the identical command passed 87 JavaScript modules and foundation metadata.
- FAIL then PASS — two ad hoc validation probes mistakenly referenced nonexistent root `scripts/task-state.mjs` and `scripts/transaction-state.mjs` and failed with `MODULE_NOT_FOUND`; the canonical packaged adapter commands then validated the active pair and reported transaction state `NONE`.
- PASS — exact Node/requested npm launcher/selected CLI/platform shim evidence and the verified standard npm package tree are now bound before and after the release child. A synthetic package proved copied-runtime drift, trampoline-dependency drift, external links, and dangling links fail as `NPM_PROVENANCE_MISMATCH`; the final harness suite passed 30/30 without a release invocation.
- PASS — the final independent integrated focused command passed 85/85 in 119.49 seconds across the 36 runner, 30 harness, 9 planner, and 10 instruction-surface tests, with zero failure, skip, retry, or actual release child.
- PASS — standalone Stable preflight passed: `npm test` reported 483 tests / 479 pass / 4 host-limited skip / 0 fail; `npm run lint` passed 87 JavaScript modules and foundation metadata; `npm run format:check` passed 365 text files; `npm run pack:check` passed 43 files / 135,268 bytes; and `git diff --check` remained clean.
- PASS — `npm run release:ci` independently repeated 479 pass / 4 skip / 0 fail plus lint, format, and pack, then its credential-free isolated candidate check passed 43 files / 135,268 bytes with SHA-256 `dc7aa85b4402e77097514b1911df92e367d72a19d5588834319959512f567ee4`. It did not run `npm publish --dry-run` or any actual publish.
- FAIL then PASS — final pair validation rejected the noncanonical matrix status `IN PROGRESS` for T-11; changing that still-partial row to the allowed `TODO` state restored a valid `IN_PROGRESS/RUNNING` pair without overstating completion.
- PASS — final pre-commit scope review found only the 11 expected README/Architecture/continuity/Task/runner/harness/planner/test paths. Package manifests, dependencies, lifecycle scripts, workflows, SPEC, and AGENTS have no diff; the separate Task 0076 branch remains at `4e504f75d85155facc195955295e1ae074fd6f00` with `BLOCKED/BLOCKED` pair hashes `dd5a7277…bb7b7` and `435dfb57…a6e2e`.
- FAIL then PASS — the first credential/machine-path scan used Windows-invalid wildcard operands and `rg` rejected them before scanning. The corrected directory-plus-`-g` form found no user path, bearer/token-shaped value, or credential in the changed documentation, Task, runner, harness, or focused tests.
- PASS — the final planner invocation over all 11 changed paths selected `RELEASE`, ignored only the two Task evidence paths for risk classification, and required the already-passed local `npm run release:ci` plus hosted exact-SHA CI. Final script syntax, lint, format, whitespace, pair, and transaction checks pass.
- PASS — exact correction source `7e1a167efef75f1916a810182806c117e08bd447` was clean and passed harmless committed-SHA dry validation at `C:\1kyw\5.personal\kyw-task-0078-release-evidence-7e1a167e\evidence\release-evidence-manual-dry-20260901151748538-eba6570bbe65`; no release child ran during dry validation.
- PASS — the external parent-scoped attempt marker is 882 bytes / SHA-256 `4e234f895336ac2336ca5a7e3a62f07b0eb031ba8358704085454657f66756a9`, records exact source `7e1a167e…`, runner/harness/release maxima `1/1/1`, retry maximum `0`, and is accompanied by exactly one outer harness lock and one inner `release:check` lock.
- FAIL (sole authorized actual attempt; no retry) — the manual runner invoked the harness once and exited `HARNESS_FAILED` after 129937.562 ms because the sole inner `npm run release:check` child exited `1` after 125560.1958 ms. Stable stopped in `npm test`: 483 tests, 451 passes, 26 failures, six skips, and 124659.2631 ms; lint, format, pack, candidate, and `npm publish --dry-run` were not reached.
- FAIL detail — the 26 failures comprise 20 manual-runner failures (14 leaf `Filename too long` errors, four downstream missed-call assertions, and two aggregate failures), one harness proof-baseline `Filename too long`, four PowerShell-dependent failures (three explicit `powershell.exe ENOENT` plus one null spawn status), and one absolute-Node-spawn `ENOENT` in a deep proof fixture. The actual checkout root measured 140 characters versus the 26-character source root, and a representative failed config path measured 298 characters. This native depth/launcher combination requires a new correction Task rather than a Task 0078 rerun.
- PASS (fail-closed retention) — actual evidence is preserved at `C:\1kyw\5.personal\kyw-task-0078-release-evidence-7e1a167e\evidence\release-evidence-manual-run-20260901152349860-7559699db1f3`. Outer summary is 562 bytes / SHA-256 `6f9e1835c1f5497f76a5300f8e4685aa269fa9d649d47835d71867fd42bd8b18`; outer seal is 8732 bytes / `afd1d0e0700d92e1d5d0b48c35104c2a157254fe7ddd7243bee6fb3db02d07da`; state seal is 243805 bytes / `0fd25aaafaa6267f52f1f4e7e315fa08b7a6b1a58200c69a4465b1797daf393d` with inventory SHA-256 `9ac11ccfe5e14795fafe2f6c9373a800074e276d9b54769b02962d03fb622ec6`. Read-only verification found zero missing, extra, hash, size, or type mismatches across all 43 outer and 1,264 state inventory entries.
- PASS (inner evidence) — inner summary is 15344 bytes / SHA-256 `0a39df6e95e4f542421a55c5b1091c8e4e7b27c3276b7833fa52a8171be0a804`; raw stdout is 96550 bytes / `4cdc9ceb5d8ccdcf42cec5c0a3d76ff1fb8e478f38e549cbfb6b445d7fe7a580`; its raw-hash index is 595 bytes / `5259d13533111e74e520c251cf821ef6083e46eead92dea3b94d57ca4ede6069`. Proof digest `8f54174dbdc41cef29e35ea7ce4e0e74e2cfac44b926b85d16799fcbda3eb64c` is bound into the retained state and outer evidence.
- PASS (postflight integrity) — inner protected state remained `CLEAN` with zero differences and zero attribution, npm runtime identity was `UNCHANGED`, and both source and detached checkout remained clean at exact SHA `7e1a167e…` with tree `ec3ed009…`. Runner postflight and failure-postflight hashes are `f9fe2acb512e60833111adbd4d357af183c95e6c4084e7706a3f16404c2f4d86` and `ff591834befe7840671a4cfbc98b0ef05a31297959deabd6c882ae9fc97c3850`.
- PASS (credential-free public non-mutation) — before snapshot SHA-256 `26968cdc4b8ed3b2ab8050a5e1a6f05d6c0404c1c8bcc2056327b8feeb499464` and after snapshot SHA-256 `896519644dc3f5e8f37d9167d446a90ecf042384eaeee9f2bc8d9cd8d912e4ad` differ only in phase/timestamps. Both record npm latest `0.1.3`, versions `0.1.0`–`0.1.3`, target `0.1.4` as `E404`, no remote tags, the same successful workflow run IDs `30592539397` and `30530304990`, no GitHub Releases, and no submission action or endpoint.
- LIMITATION then PASS — isolated credential-free `gh run list` and `gh release list` each exited `4` because GitHub CLI requires authentication even for the public list operations. The external helper instead used public GitHub REST with no Authorization header and received matching `200` responses/content hashes before and after; a separate authenticated read-only CLI check corroborated the same two runs and empty Releases but is not credited as credential-free proof.
- FAIL then PASS (read-only diagnostics only) — the first authenticated Release query requested unsupported `databaseId` output and exited before returning state; the valid-field rerun returned `[]`. An external repository scan also initially used Windows-invalid wildcard operands, and the evidence-stage grep later guessed nonexistent `raw/child-stdout.log`; corrected targeted/glob-safe reads and the actual `raw/stdout.log` produced the recorded results without mutation.
- PASS — final blocked-state review found exactly the expected 11 branch paths and only this Task/Test pair changed after correction commit `7e1a167e…`; Task 0076 still points to `4e504f75d85155facc195955295e1ae074fd6f00`. Canonical pair validation accepted `BLOCKED/BLOCKED`, transaction inspection returned `NONE`, lint passed 87 JavaScript modules and foundation metadata, format checked 365 UTF-8/LF files, and `git diff --check` passed.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 16881 | 18313 | 227 | 243 | +1432 | 8.48% | setup, commands, usage, and contributor entry | Source maintainers need the exact literal-SHA dry and one-shot actual commands plus their non-publication boundary. | The existing Development release-check explanation absorbs the two commands and boundary without a new heading or duplicate release-status history. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex execution and completion rules | Not applicable — existing evidence honesty, separate publication authority, and Task execution rules already govern the runner. | AGENTS remains byte-stable; Task-specific proof and attempt evidence stays in this pair. |
| `docs/SPEC.md` | 44348 | 44348 | 454 | 454 | 0 | 0.00% | product behavior and acceptance | The existing warning-size SPEC was explicitly checked against exact-SHA verification, fail-closed evidence, credential-free release preflight, package exclusion, and separate publication authority; those owners already cover the durable product meaning. | SPEC remains byte-stable; source/test algorithms and current evidence are not copied into permanent product truth. |
| `docs/ARCHITECTURE.md` | 41756 | 42634 | 836 | 849 | +878 | 2.10% | components, isolation boundaries, and release-verification flow | The stable exact-checkout runner-to-harness ownership and hermetic protected-state flow must replace the now-stale harness-alone description. | Section 9.4 replaces one five-line paragraph in place; exact proof fields, path algorithms, and evidence schemas remain in source/tests. |
| `Combined` | 106930 | 109240 | 1565 | 1594 | +2310 | 2.16% | four permanent documents as one governed set | Positive growth is limited to the command owner and architecture owner required by AC-11. | Existing Development and Release verification sections absorb the meaning; AGENTS/SPEC stay unchanged and no fifth permanent document or duplicate chronology is added. |

## Unverified

- A successful actual Stable/candidate/npm-dry-run result is not verified and cannot be retried under Task 0078. Deterministic coverage for the newly exposed deep Windows path plus required PowerShell launcher combination requires a new hard-dependent correction Task.
- No alternate shorter-root or PowerShell-adjusted actual invocation was run; either would be a prohibited replacement attempt rather than Task 0078 evidence.
- Ordinary STANDARD push, PR, exact-head CI, merge, and post-main observation have not started because T-09 failed. No publication or public-distribution mutation is authorized or claimed.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
