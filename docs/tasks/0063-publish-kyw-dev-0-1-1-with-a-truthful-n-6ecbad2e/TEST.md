# TEST 0063 — Publish kyw-dev 0.1.1 with a Truthful npm README and Synchronized Publication State

<!-- kyw-task-contract: 3 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Hard dependency: delivered Task `0062`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`
- Setup and package-facing truth: `../../../README.md`
- Release/package owners: `../../../package.json`, `../../../.codex-plugin/plugin.json`, `../../../scripts/lib/validate-foundation.mjs`
- External publication state: the user completed `kyw-dev@0.1.1` publication interactively outside this workflow. The current invocation authorizes read-only verification and ordinary `STANDARD` delivery only; no additional `npm publish`, other version, independent dist-tag mutation, tag, Release, or public submission is authorized.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: no override was requested)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the current system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — `0.1.1` release identity is synchronized while historical `0.1.0` facts remain intentional. | Inspect manifest/plugin/CLI/foundation owners; run focused version assertions and classify repository-wide version searches by current versus historical ownership. | Integration | PASS | Package, plugin, CLI, foundation, installer, and current tests agree on `0.1.1`; no current `0.1.0` remains outside numbered Task history, while the registry retains both public versions. |
| T-02 | AC-02 — Repository and packed npm README truthfully describe the published package and separate publication surfaces. | Assert required `0.1.1`, npm, install, and npx statements; reject stale prepublication claims; extract and inspect README from the exact tarball. | Integration | PASS | Repository, frozen, and registry README bytes agree after newline normalization, state `kyw-dev@0.1.1`/`latest`, contain valid npx commands, reject stale prepublication claims, and do not claim a tag, Release, or public plugin submission. |
| T-03 | AC-03 — README, SPEC, and architecture publication/distribution truth agree without weakening authority boundaries. | Run foundation and instruction-surface owner projections plus targeted cross-document assertions. | Integration | PASS | Focused foundation/instruction checks pass; README, SPEC, and architecture agree on public `0.1.1`, per-version packed-byte verification, and separate authority for later external mutations. |
| T-04 | AC-04 — Exact package contents, parity, licensing, dependencies, and lifecycle constraints remain safe. | Run pack checks and inspect the frozen tarball's 43-file allowlist, manifests, README, exclusions, dependency fields, scripts, and notices. | Distribution | PASS | Frozen archive has exactly 43 allowlisted entries, truthful README and `0.1.1` identities, required legal bytes, no repository-only paths, dependency fields, or lifecycle scripts. |
| T-05 | AC-05 — Known stale-version failures and affected compatibility regressions are resolved. | Run focused CLI, distribution, foundation, instruction-surface, release-harness, and skill-installation test files, then the full stable test suite. | Regression | PASS | Focused rerun passed 103/103; standalone and Release-gate full suites each passed 384/387 with three explicit skips and zero failures. |
| T-06 | AC-06 — Permanent-document continuity and budgets have exact auditable evidence. | Measure all four documents, derive retained-baseline rows, place the required delta marker/table in Results, and run the foundation validator. | Policy | PASS | Exact Task `0061` baseline rows and current measurements are recorded below; foundation and instruction guards passed in the corrected 103/103 focused run. |
| T-07 | AC-07 — Release routing/gates and exact local tarball identity are reproducible before publication. | Run release planning/check gates; capture pack JSON, file count, byte size, SHA-256, integrity, shasum, and content inspection from one owned temporary directory. | Release | PASS | Release plan/check gates passed; frozen `kyw-dev-0.1.1.tgz` metadata and complete inspected inventory are recorded below. |
| T-08 | AC-08 — Registry preflight and every explicit publication authority boundary are safe and auditable. | Retain each identity/ownership/absence preflight and one-command result; require an immediate read-only resolution after ambiguity and no automatic retry; verify any later user-owned publication only by exact idempotent comparison. | External | PASS | Both agent attempts remain recorded as separate explicitly authorized one-command invocations that stopped on `EOTP` and immediate `E404`; the user later published interactively, and this invocation ran no publication command and accepted it only after exact registry/frozen comparison. |
| T-09 | AC-09 — Public npm state and bytes match the final candidate, including README and CLI behavior. | Query version/dist-tag/digests/readme, freshly download the registry tarball, compare SHA-256 and npm digests, and run isolated CLI smoke coverage. | End-to-end | PASS | `0.1.1` and `latest` exist; registry metadata, README, and freshly downloaded bytes match the frozen candidate exactly; an isolated fresh-cache invocation exited zero and printed only `0.1.1`. |
| T-10 | AC-10 — Scope, history, immutable prior artifacts, excluded release surfaces, transaction cleanliness, and the declared `STANDARD` gate are proven. | Compare final diff/inventory and Task `0062` bytes; verify retained `0.1.0`, absent tag/Release/submission mutations, clean Task transaction state, and retain exact-head GitHub delivery as a separate post-terminal gate. | Delivery | PASS | Repository-side scope, history, dependency hashes, excluded surfaces, whitespace, staging, and transaction evidence pass. `STANDARD` remains required and is intentionally not pre-claimed in this terminal pair; the external evaluator must pass before delivery completion. |

## Regression Coverage

- CLI version/help/usage output and selection behavior remain unchanged apart from the authorized patch version.
- Distribution filename, package allowlist, manifest/plugin parity, licensing, dependency, lifecycle, and install-from-tarball coverage remain enforced.
- Plugin installation, doctor output, installed-copy provenance, and no-lifecycle-install behavior remain compatible.
- Foundation owner projection, permanent-document policy, release-plan routing, and release-evidence harness coverage remain authoritative.
- Historical `0.1.0` registry evidence and purpose-built fixtures remain recognizable rather than being globally rewritten.
- Task queue validity, Task `0062` byte immutability, transaction cleanup, and `STANDARD` exact-head delivery remain enforced.
- Registry failure paths cover absent-version preflight, already-present exact match, immutable mismatch, auth/2FA failure, and ambiguous response without automatic retry.

## Commands

- Executed full permanent-document and Task `0062` dependency reads, `git status --short --branch`, worktree/history/remote inspection, complete preserved tracked diff inspection, and `git diff --check`.
- Executed selected/dependency pair validation and `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Executed `git fetch --no-tags origin main`, local/cached/direct-main identity and ancestry checks, `gh auth status`, and read-only GitHub repository identity inspection.
- Executed queue inspection through the packaged core, exact Task `0062` worktree-versus-`HEAD` SHA-256 comparison, npm identity/owner inspection, `kyw-dev@0.1.1` absence check, and current `latest` lookup.
- Executed the sole packaged dispatch for exact invocation `$kyw-impl 0063` with managed routing and empty verified execution-preflight findings; no manual delivery payload or retry was used.
- Executed active-pair validation and one opaque `apply-continuity` call for selected Task `0063`.
- Executed the first active focused regression command; it passed 97/103 tests and retained the six expected stale-version/document-evidence failures before correction.
- Executed the corrected focused regression command; all 103 tests passed.
- Executed fixed-string searches for plain and escaped `0.1.0` outside Task history and for current `0.1.1` owners/assertions, plus a separate historical Task/Test inventory.
- Executed the exact 12-path `npm run verify:plan -- ...`; it selected `RELEASE` and retained hosted exact-SHA PR/main requirements.
- Executed `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Executed `npm run release:check`, including a repeated Stable gate, real candidate verification, and `npm publish --dry-run --json`; no publication mutation ran.
- Executed final tracked/untracked diff, status, whitespace, package metadata, Task `0062` hash, current-pair, and transaction review before packing.
- Executed one final `npm pack --json --pack-destination <Task-owned-OS-temp-directory>`, actual tar listing/stream inspection, allowlist comparison, manual SHA-1/SHA-256/SHA-512 computation, and packed package/plugin/README/dependency/lifecycle assertions.
- Executed immediate mutation preflight: frozen SHA-256, `npm whoami`, `npm owner ls kyw-dev`, full published-version list, and `latest` lookup.
- Executed exactly one `npm publish <frozen-absolute-tarball-path> --access public --registry=https://registry.npmjs.org`; it exited `EOTP`.
- Executed one read-only post-failure `npm view kyw-dev@0.1.1 version dist.integrity dist.shasum --json --registry=https://registry.npmjs.org`; it returned `E404`. No retry or other mutation ran.
- Executed the resumed read-only pair/queue/transaction, Task `0062` hash, Git/GitHub, npm registry configuration, identity/ownership/version, frozen candidate hash/content, and residue preflight on 2026-07-30.
- Executed the sole packaged dispatcher call for the exact resumed invocation with empty verified execution-preflight findings; it returned `SELECTED / RECHECK_BLOCKER / 0063`, preserved the exact override, and returned no continuity transition token.
- Executed the exactly one authorized retry of `npm publish <unchanged-frozen-absolute-tarball-path> --access public --registry=https://registry.npmjs.org`; it exited `EOTP`. Executed one immediate read-only post-retry version/integrity/shasum probe; it returned `E404`. No additional publication command ran.
- Executed cache-bypassed canonical registry metadata and tarball reads after the user's manual publication; compared package/plugin identity, `latest`, versions, publisher/maintainer/source metadata, registry signature, README, byte size, SHA-1, SHA-256, SHA-512 integrity, file count, unpacked size, dependencies, and lifecycle fields to the frozen candidate entirely in memory.
- Executed the sole packaged dispatcher call for the exact current invocation with empty verified execution-preflight findings; it returned `SELECTED / RECHECK_BLOCKER / 0063`, preserved the no-additional-publish override, freshly evaluated Task `0062` as `HARDENED_EXACT_HEAD`, and returned no continuity transition token.
- Executed `npm exec --yes --package=kyw-dev@0.1.1 -- kyw-dev --version` with a fresh owned cache, empty userconfig, canonical registry, disabled lifecycle scripts, and isolated working directory.
- Executed the focused 103-test command and the exact 12-path `npm run verify:plan -- ...`; the planner retained `RELEASE`.
- Executed current `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`. The earlier completed release gate and frozen candidate evidence were reused because package inputs are unchanged and no new archive or publication command is authorized.
- Executed final status/diff/whitespace/version searches, package/plugin identity inspection, exact Task `0062` SHA-256 comparison, transaction inspection, local/remote tag lookup, GitHub Release lookup, and remote Task branch/PR absence check.
- Executed exact-root cleanup for the current invocation's dispatcher, registry-smoke, and Stable log directories; retained the frozen publication candidate.
- Planned scope/version inventory: `git status --short`, `git diff --check`, and owner-aware `rg` searches for `0.1.0`, `0.1.1`, stale prepublication phrases, tag/Release claims, and package/plugin version projections.
- Planned focused regressions: `node --test test/cli.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/release-evidence-harness.test.mjs test/skill-installation.test.mjs`.
- Planned release routing: `npm run verify:plan -- package.json .codex-plugin/plugin.json README.md docs/SPEC.md docs/ARCHITECTURE.md scripts/lib/validate-foundation.mjs test/cli.test.mjs test/distribution.test.mjs test/foundation.test.mjs test/instruction-surfaces.test.mjs test/release-evidence-harness.test.mjs test/skill-installation.test.mjs`.
- Planned stable checks: `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check`.
- Planned release gate: `npm run release:check`.
- Planned Task-pair validation: `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <this-task-directory>`.
- Planned transaction proof: `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks`.
- Planned exact pack: `npm pack --json --pack-destination <task-owned-temporary-directory>`, followed by tarball listing/extraction in that owned directory and `Get-FileHash -Algorithm SHA256`.
- Planned npm preflight: `npm whoami --registry=https://registry.npmjs.org`, package-owner inspection, and `npm view kyw-dev@0.1.1 version --json --registry=https://registry.npmjs.org` with an expected absent-version result immediately before mutation.
- Planned authorized mutation: one `npm publish <absolute-validated-0.1.1-tarball-path> --access public --registry=https://registry.npmjs.org` command only after all local gates pass.
- Planned registry verification: `npm view kyw-dev@0.1.1 version dist.integrity dist.shasum readme --json --registry=https://registry.npmjs.org` and `npm view kyw-dev dist-tags.latest --json --registry=https://registry.npmjs.org`.
- Planned public-byte verification: fetch the registry tarball URL into a fresh owned temporary directory, compute SHA-256, compare integrity/shasum, and run `npm exec --yes --package=kyw-dev@0.1.1 -- kyw-dev --version` in an isolated environment.
- Planned excluded-surface proof: read-only Git/tag/GitHub Release inspection and public-plugin-state checks; no mutating tag, Release, submission, dist-tag, rerun, or branch-deletion command.
- Planned delivery proof: validate the final pair/diff, then capture `STANDARD` exact-head PR checks, merge identity, post-main state, and continuity evidence through the implementation workflow.

## Results

- PASS — the selected and dependency pairs validated, transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, and corrected queue inspection found 63 valid pairs: 56 `DONE/PASSED`, five historical `BLOCKED/BLOCKED`, one historical `CANCELLED/BLOCKED`, this sole `READY/READY` pair, and no active Task.
- FAIL → PASS — the first direct queue-inspection snippet passed a URL object where a path string was required and raised `ERR_INVALID_ARG_TYPE`; the corrected resolved-path invocation produced the valid queue inventory above.
- PASS — local `HEAD`, local `main`, fetched `origin/main`, direct remote `main`, and GitHub `main` all equal `6554f886469d1f81ef58454bb8c5047399179606`; the preserved nine tracked changes plus this untracked pair are all explicitly in scope, with no conflict or unexplained work.
- PASS — Task `0062` remains byte-identical to `HEAD`: `TASK.md` SHA-256 `39b69fc0b61d28694515dd9486ac5e3a89c95f55aca1a4bde45e14108c1d7ed7` and `TEST.md` SHA-256 `49d6e2841326c67d821191dd1dc89fe7b6f4b6fff28122df1abd412e68c44f8a`.
- PASS — npm authenticated as `kimyw`, package ownership lists `kimyw <qnfdudn1604@gmail.com>`, `kyw-dev@0.1.1` returned the expected `E404`, and `latest` returned `0.1.0`; no registry mutation ran.
- PASS — the one dispatcher call classified Tasks `0030`–`0061` as `DURABLE_STANDARD_CONTINUITY`, freshly evaluated Task `0062` as `HARDENED_EXACT_HEAD`, and returned `SELECTED / IMPLEMENT / 0063` with one prepared opaque transition.
- PASS — the active pair validated and the opaque transition applied once, advancing the fixed-bounded checkpoint through Task `0062` at digest `af45721a5708f25938985dcf2761cd48825aaa3e5d78f9276e9b5d83bb92a79c`.
- FAIL — the first active focused run passed 97/103 tests. The two invalid-CLI usage cases still expected `0.1.0`; distribution still expected `kyw-dev-0.1.0.tgz`; foundation found the stale README `Version \`0.1.0\`` projection plus missing current retained-baseline document deltas; and the isolated install/doctor case still expected installed `0.1.0`.
- PASS — the corrected focused command passed 103/103. CLI usage now derives from `VERSION`, tarball identity from `RELEASE_METADATA`, install/doctor/uninstall output from `VERSION`, the foundation projection names `0.1.1`, and the active Test supplies valid retained-baseline deltas.
- PASS — no plain or escaped `0.1.0` remains outside numbered Task history; current `0.1.1` owners/assertions are synchronized, while 51 historical Task/Test files retain 149 intentional `0.1.0` matching lines.
- PASS — the exact 12-path planner selected `RELEASE`, one ordered local command, and retained hosted exact-SHA PR/main requirements.
- PASS — standalone Stable checks completed 384/387 tests with three explicit skips and zero failures; lint covered 81 JavaScript modules, format covered 330 UTF-8/LF files, and pack selection covered 43 files / 128,771 bytes.
- PASS — `npm run release:check` repeated 384/387 tests with the same three explicit skips and zero failures, passed lint/format/pack, validated a 43-file / 128,771-byte candidate at SHA-256 `fe83330252a44fbea946579a77e76449ebcb071df87299aa74705e818a5dd70f`, and completed the public-registry dry run without publication.
- PASS — final pre-pack review contains only 12 mapped tracked paths plus this new Task/Test pair; whitespace, package metadata, active-pair validation, `NONE / NO_TRANSACTION_EVIDENCE`, and exact Task `0062` hashes all pass.

### Frozen publication candidate

| Field | Exact value |
|---|---|
| Filename | `kyw-dev-0.1.1.tgz` |
| Packed bytes | `128771` |
| Unpacked bytes | `585722` |
| File count | `43` |
| SHA-256 | `fe83330252a44fbea946579a77e76449ebcb071df87299aa74705e818a5dd70f` |
| npm integrity | `sha512-9lxVcV+H2vi4ocVezUo/6nqBVlZZEZ8an8BLMSh6+4VF2HUT4TZIZapteK95AMuupIN3StFijUCiRX4tXp4spw==` |
| npm shasum | `9e6b10f85f34f3d8f5dde8fadcecfa6fa026ae9a` |
| Identity | package and plugin both `kyw-dev@0.1.1` |
| Safety | exact allowlist; truthful README; dependencies, dev dependencies, lifecycle scripts, repository Tasks/tests/evals, credentials, and machine-local configuration absent |

Inspected archive entries:

```text
.codex-plugin/plugin.json
LICENSE
README.md
THIRD_PARTY_NOTICES.md
bin/kyw-dev.mjs
licenses/mattpocock-skills-MIT.txt
package.json
skills/kyw-audit/agents/openai.yaml
skills/kyw-audit/references/audit.md
skills/kyw-audit/SKILL.md
skills/kyw-grilling/agents/openai.yaml
skills/kyw-grilling/SKILL.md
skills/kyw-impl/agents/openai.yaml
skills/kyw-impl/references/execution.md
skills/kyw-impl/SKILL.md
skills/kyw-init/agents/openai.yaml
skills/kyw-init/SKILL.md
skills/kyw-task/agents/openai.yaml
skills/kyw-task/scripts/task-artifacts.mjs
skills/kyw-task/SKILL.md
src/cli/run.mjs
src/core/package-info.mjs
src/core/skill-installation-doctor.mjs
src/core/skill-installation-inventory.mjs
src/core/skill-installation-shared.mjs
src/core/skill-installation-state.mjs
src/core/skill-installation-transaction.mjs
src/core/skill-installation.mjs
src/core/task-artifact-continuity.mjs
src/core/task-artifact-contract.mjs
src/core/task-artifact-creation.mjs
src/core/task-artifact-delivery.mjs
src/core/task-artifact-hydration.mjs
src/core/task-artifact-queue.mjs
src/core/task-artifact-shared.mjs
src/core/task-artifacts.mjs
src/core/template-contracts.mjs
templates/project/AGENTS.md
templates/project/ARCHITECTURE.md
templates/project/README.md
templates/project/SPEC.md
templates/task/TASK.md
templates/task/TEST.md
```

- PASS — immediate preflight authenticated `kimyw`, confirmed `kimyw` package ownership, found only version `0.1.0`, kept `latest` at `0.1.0`, and reproduced the frozen candidate SHA-256.
- BLOCKED — the single authorized publish command exited `EOTP` with an npm interactive web/one-time authentication requirement. The immediate post-failure version probe returned `E404`; `0.1.1` was not published, and no retry was attempted.
- PASS — the resumed preflight found the unchanged candidate at 128,771 bytes / 43 entries / SHA-256 `fe83330252a44fbea946579a77e76449ebcb071df87299aa74705e818a5dd70f`, package/plugin `kyw-dev@0.1.1`, no dependency or lifecycle fields, registry configuration `https://registry.npmjs.org/`, authenticated identity `kimyw`, matching ownership, only public version `0.1.0`, `latest` at `0.1.0`, and `E404` for `0.1.1`.
- PASS — the prior separately authorized retry invocation's sole dispatcher call returned `SELECTED / RECHECK_BLOCKER / 0063` with the exact one-retry override and no continuity transition token; the verified authentication/authority condition cleared the then-current blocker and the pair re-entered `IN_PROGRESS/RUNNING`.
- BLOCKED — the exactly one authorized retry repeated the exact candidate/registry/identity/ownership/version preflight and then exited `EOTP` with another one-time/web-authentication requirement. The immediate post-retry probe returned `E404`, proving `0.1.1` was not published; no additional publication command is authorized or executed.
- PASS — after the user completed the interactive publication, canonical registry metadata serves `kyw-dev@0.1.1` under `latest`; its freshly downloaded 128,771-byte tarball is byte-identical to the frozen candidate at SHA-256 `fe83330252a44fbea946579a77e76449ebcb071df87299aa74705e818a5dd70f`, with matching shasum, integrity, 43-file count, 585,722-byte unpacked size, package/plugin identity, normalized README SHA-256 `2d2d84553ebf0098cff2db887ce7a806394b7825494e1875e2e721deea30b713`, publisher `kimyw`, maintainer/source identity, and npm registry signature. No Sigstore attestation is present or claimed.
- PASS — the current invocation's sole dispatcher call returned `SELECTED / RECHECK_BLOCKER / 0063`, retained the exact override, classified Task `0062` as `HARDENED_EXACT_HEAD`, and returned no continuity transition token. The exact registry match cleared the prior blocker without republishing or rebuilding the candidate.
- PASS — the isolated public-registry CLI smoke used a fresh cache/userconfig, disabled lifecycle scripts, exited zero, and printed exactly `0.1.1`.
- PASS — the current focused command passed 103/103; the exact planner retained `RELEASE`; current Stable verification passed 384/387 with three explicit skips and zero failures, lint over 81 JavaScript modules, format over 330 UTF-8/LF files, and pack selection over 43 files / 128,771 bytes.
- PASS — final scope contains the exact 12 mapped tracked paths plus this Task/Test pair, with no staged path, whitespace error, unexplained work, current `0.1.0` outside Task history, dependency drift, local/remote tag, GitHub Release, public-submission artifact, remote Task branch, PR, or Task transaction residue.
- PASS — Task `0062` remains byte-identical at `TASK.md` SHA-256 `39b69fc0b61d28694515dd9486ac5e3a89c95f55aca1a4bde45e14108c1d7ed7` and `TEST.md` SHA-256 `49d6e2841326c67d821191dd1dc89fe7b6f4b6fff28122df1abd412e68c44f8a`; transaction inspection remains `NONE / NO_TRANSACTION_EVIDENCE`.
- FAIL → PASS — two cleanup attempts rejected the long target paths because Node exposed the same Windows temp root through a short-name alias; both stopped before deletion. A corrected guard rooted at the long `LOCALAPPDATA/Temp` identity removed only the three invocation-owned scratch directories, leaving the frozen candidate as the sole intentional Task 0063 temporary artifact.

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 15189 | 15077 | 229 | 227 | -112 | -0.74% | setup, usage, and contributor entry | Users need truthful public `0.1.1` npm status and working npm/npx commands. | Existing start, release-status, and installation sections replace stale prepublication wording without adding a new section. |
| `AGENTS.md` | 3945 | 3945 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — repository routing, authority, and completion rules remain unchanged. | The existing rule surface remains byte-stable; release-specific evidence stays in this pair. |
| `docs/SPEC.md` | 39176 | 39199 | 447 | 447 | 23 | 0.06% | observable product behavior and acceptance | Current version and npm publication state are durable product truth. | Existing package-boundary and publication-state sections replace `0.1.0` and prepublication projections. |
| `docs/ARCHITECTURE.md` | 34915 | 34944 | 735 | 735 | 29 | 0.08% | stable components, boundaries, dependencies, flows, and distribution | Per-version packed-byte verification before registry mutation is durable distribution flow. | The existing plugin package/cache paragraph absorbs the synchronized release flow without a new component or section. |
| `Combined` | 93225 | 93165 | 1459 | 1457 | -60 | -0.06% | all four permanent-document owners | README, SPEC, and ARCHITECTURE each synchronize one changed release fact while AGENTS remains stable. | Existing owner sections replace stale publication truth and the combined permanent set shrinks relative to the retained Task `0061` baseline. |

## Unverified

- Repository acceptance has no unverified required row.
- This Task's non-draft PR actual-head, synthetic merge compatibility, reviewed expected-head merge, post-main run, and production evaluator result do not exist yet and are not pre-claimed; the separate `STANDARD` gate must establish them before delivery completion.
- No additional npm publication, independent dist-tag mutation, tag, Release, public plugin submission, rerun, or bypass is authorized.

## Final Coverage Review

- [x] Compare the final diff and package payload to the matrix and authorized scope.
- [x] Map every acceptance criterion to one or more completed test rows.
- [x] Add coverage for every introduced branch, failure, idempotency, and compatibility behavior.
- [x] Confirm all permanent-document and publication evidence is exact, current, and reproducible.
- [x] Confirm focused, stable, release, distribution, and external registry checks ran with auditable results.
- [x] Confirm irreversible actions stayed within explicit authority and no retry/bypass/out-of-scope publication occurred.
- [x] Confirm Task `0062` stayed byte-immutable and the separate `STANDARD` exact-head delivery requirement remains explicit without being pre-claimed.
