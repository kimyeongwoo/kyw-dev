# TEST 0056 — Internalize and Normalize Task Authoring Keys

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially explicit Skill routing, author-only kyw-task behavior, Task schema/status/dependencies, safety, compatibility, and evidence honesty.
- Architecture constraints: `../../ARCHITECTURE.md`, especially the deterministic creation engine, transaction boundary, current/legacy readers, distribution, and filesystem isolation.
- Repository rules: `../../../AGENTS.md`.
- Authoring procedure and adapter: `../../../skills/kyw-task/SKILL.md` and `../../../skills/kyw-task/scripts/task-artifacts.mjs`.
- Contract and transaction owners: `../../../src/core/task-artifact-contract.mjs`, `../../../src/core/task-artifact-creation.mjs`, and `../../../src/core/task-artifact-shared.mjs`.
- Existing focused regressions: `../../../test/task-artifacts.test.mjs`, `../../../test/kyw-task.test.mjs`, `../../../test/template-contracts.test.mjs`, and `../../../test/instruction-surfaces.test.mjs`.

## Model Provenance

- Model identifier: `gpt-5.6-sol` (`OBSERVED`: exposed by `x-codex-turn-metadata`)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the invocation requested no model override)
- Reasoning effort: `ultra` (`OBSERVED`: exposed by `x-codex-turn-metadata`)
- Codex surface: `Codex` (`OBSERVED`: this invocation is running in the Codex workspace surface)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the authoring surface does not expose an exact version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01, AC-07 — outcome/title-only production surface with isolated compatibility reader | Parse the normal Skill procedure and adapter invocation, exercise the production entry without a key, exercise the explicitly labeled low-level fixture path with a key, and reject any normal instruction that exposes manual shortening or the internal limit. | Static/integration | PASS | Structural instruction checks and keyless file/inline adapter batches passed; the explicit caller-controlled key fixture remained unchanged. |
| T-02 | AC-02, AC-04 — deterministic portable derivation and minimal stable suffix | Table-drive exact normalized values, portability, repeated calls, truncation, suffix stability, suffix budget, and distinct same-prefix titles across fresh processes; reject randomness, registry access, or service lookup. | Unit/property boundary | PASS | Canonical-owner tests passed in-process and across two fresh child processes with an eight-hex SHA-256 suffix and 48-character bound. |
| T-03 | AC-02, AC-03 — complete input-boundary matrix | Cover derived lengths 0/1/47/48/49, very long ASCII, composed/decomposed Unicode, punctuation-only, punctuation-heavy, repeated whitespace/separators, empty normalization, and long shared prefixes on supported platforms. | Unit/boundary | PASS | `test/task-key-derivation.test.mjs` covered every listed boundary, Unicode normalization, numeric-leading titles, portable characters, and same-prefix distinction. |
| T-04 | AC-05 — all batch planning precedes allocation and transaction hooks | Inject allocator, lock, staging, and publication hooks into valid and invalid batches; prove invalid key/slug/dependency/marker/path/payload/pair/graph cases return before any hook is observed. | Unit/failure ordering | PASS | The plan exposed no ID/path; valid ordering was prevalidation → lock → allocator → allocated, while every invalid fixture observed zero hooks. |
| T-05 | AC-05, AC-06 — duplicate and retained in-flight collision rejection | Exercise duplicate derived keys, two titles that normalize alike, dependency ambiguity, an existing queue slug/path collision, and a retained in-flight manifest fixture; require deterministic diagnostics and zero assigned IDs/paths. | Integration/failure | PASS | Derived/explicit duplicates and ambiguous title references failed before root creation; a proven retained manifest collision preserved its marker byte-for-byte and recovery removed it. |
| T-06 | AC-05, AC-06 — invalid complete pair and payload limits are side-effect free | Mutate each required section, marker count, READY pair, AC/T mapping, path component, and journal/payload boundary; snapshot repository plus the exact external transport path before/after every rejection. | Integration/boundary | PASS | Marker, status, required-section, AC/T, dependency, cycle, path-dialect, and 16 MiB payload checks passed with absent roots and byte-identical caller payload. |
| T-07 | AC-06, AC-08 — one-shot transaction rollback and residue proof | Re-run existing lock, release marker, staging, manifest, partial publication, crash-window, race, and rollback fixtures through the planned adapter and assert no unowned path changes or current-invocation scratch remains. | Process/integration | PASS | All existing batch transaction, ownership, race, rollback, committed cleanup, and explicit recovery regressions passed; final repository transaction inspection is `NONE`. |
| T-08 | AC-07, AC-08 — current/legacy reader and five-Skill routing compatibility | Exercise current and legacy pairs, author-only goal and compatible DRAFT routing, kyw-impl separation, audit independence, grilling read-only behavior, one-active dispatch, and user-work preservation. | Integration/regression | PASS | Current/legacy pair, dispatch, kyw-task, kyw-impl, full-suite, and five-Skill foundation regressions passed. |
| T-09 | AC-01, AC-08 — packaged instruction and distribution parity | Inspect the packed candidate and direct/plugin-installed Skill surfaces for the same title-only production contract, immutable ownership, version `0.1.0`, no lifecycle installation, and no production dependency. | Packaging/static | PASS | Direct and actual-tarball installed adapters derived title-only keys; 48 installation/distribution tests and the 41-file candidate passed at version `0.1.0` with no dependencies. |
| T-10 | AC-01–AC-08 — final pair, diff, documentation, and verification-plan audit | Validate the active pair, map every changed branch to this matrix, run the exact changed-path planner and selected non-publishing gates, compare permanent-document projections with their owners, and reject unrelated or historical changes. | Contract/audit | PASS | Exact 20-path planning selected STABLE `npm run check`; 343 tests plus lint/format/pack, growth evidence, all three pairs, diff, scope, and future hashes passed. |

## Regression Coverage

- Preserve atomic contiguous allocation, graph validation, one-shot transaction ownership, rollback/recovery proof, and zero unowned mutation under success, rejection, race, and crash fixtures.
- Preserve current/legacy Task readers, canonical marker/schema/status pairs, dependency grammar, one active Task, author-only kyw-task routing, and all other explicit Skill boundaries.
- Preserve filesystem portability, direct/plugin installation ownership, package/plugin version `0.1.0`, absence of production dependencies, and separate publication authority.
- Treat a manual short-key instruction, prevalidation after allocator/lock observation, surviving external payload, or silent normalization collision as a regression even if no Task directory is published.

## Commands

- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0056-internalize-and-normalize-task-authoring-keys`
- `node --test test/task-key-derivation.test.mjs test/task-artifact-prevalidation.test.mjs test/task-artifacts.test.mjs test/kyw-task.test.mjs test/template-contracts.test.mjs test/instruction-surfaces.test.mjs`
- `node --test test/task-dispatch.test.mjs test/kyw-impl.test.mjs`
- `node --test test/skill-installation.test.mjs test/distribution.test.mjs`
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures`
- `npm run release:candidate`
- `npm run verify:plan -- <the exact 20 changed paths recorded below>`
- `npm run check`
- `node --test test/foundation.test.mjs`
- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory <each of Tasks 0056, 0057, and 0058>`
- `git diff --check`

## Results

- PASS — fresh preflight at main `51f45b3baf3db909deae24beb99a0cb67e43bf0d` found local/cached/direct/GitHub main aligned, no tracked work, exactly the six authorized untracked Task 0056/0057/0058 artifacts, no main-target open PR, no active Task, three valid pairs, and `NONE / NO_TRANSACTION_EVIDENCE`.
- PASS — local ancestry and fresh GitHub reads identified exactly 23 eligible `LEGACY_PRE_CONTRACT` outcomes (Tasks 0030–0050 and 0052–0053), excluded blocked Task 0051, and retained Tasks 0054/0055 as full hardened entries.
- PASS — the production delivery evaluator classified all 25 prior STANDARD outcomes `SATISFIED`; Task 0054 and 0055 each proved `VERIFIED` actual head, `VERIFIED_SYNTHETIC` merge compatibility, and `VERIFIED_EXACT_CHECKOUT` post-main identity. Task 0055's accepted ledger uses only run `30322392806` attempt 2 jobs; attempt 1 failure chronology was inspected separately and not mixed into the final graph.
- PASS — the single corrected packaged dispatch returned `SELECTED / IMPLEMENT / 0056`, `authorityScope: STANDARD_LIFECYCLE`, and `ceremonialConfirmationRequired: false`.
- PASS — canonical derivation/prevalidation/authoring/instruction suite: 62/62, exit 0. Boundary lengths, Unicode, punctuation, same-prefix suffixes, collisions, invalid pair/marker/section/status/AC-T/dependency/graph/payload, retained manifest, rollback, and zero-residue branches all passed.
- PASS — current/legacy reader and execution routing suite: 32/32, exit 0.
- PASS — direct/packed installation and distribution suite: 48/48, exit 0; title-only installed adapters derived keys without changing version or dependencies.
- PASS — `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures`, exit 0, returned `valid: true` for six current-session direct scenarios.
- PASS — `npm run release:candidate`, exit 0: 41 files, 98,153 bytes, SHA-256 `3dacfe21f721ebd89bacd6d414cd9c2fcfde1c9385e217104af59c4ae4351da0`.
- FAIL — the first `npm run lint`, exit 1, ran while SPEC/ARCHITECTURE had changed but the active TEST still carried stale permanent-document delta evidence. No production failure occurred.
- CORRECTION — added the exact four-document plus combined before/after rows below with durable-necessity and replacement/absorption evidence; the next `npm run lint` passed.
- PASS — exact changed-path planner classified the 20-path set `STABLE`, ignored only the six Task evidence paths for risk, and selected exactly `npm run check`.
- PASS — planner-selected `npm run check`, exit 0: 343/343 tests, lint passed across 75 JavaScript modules/foundation metadata, format passed across 313 UTF-8/LF files, and pack check passed for 41 files / 98,153 bytes.
- PASS — permanent-document growth validation: 20/20, exit 0; the representative instruction bundle is 36,668 bytes, below the strict 36,864-byte budget.
- PASS — post-review affected suite: 49/49, exit 0 after moving observable allocation hooks behind transaction acquisition and clarifying normal dependency guidance.
- FAIL — the first terminal pair validation, exit 1, rejected `Not applicable — ...` in DONE `Remaining` and `Resume Point`; the current contract requires reasoned `None — ...` entries.
- CORRECTION — changed only those two terminal handoff lines to reasoned `None — ...`; the immediate canonical validation rerun passed.
- PASS — final-state `npm run check`, exit 0: 343/343 tests plus lint, format, and pack; the final pack check measured 41 files / 98,168 bytes.
- PASS — final-state `npm run release:candidate`, exit 0: 41 files, 98,168 bytes, SHA-256 `df24521ce112e2b838bbce15b3bd1dd51521f0cb349299a129ccf9332e6cd923`.
- PASS — all three Task/Test pairs validated canonically; Task 0057 and 0058 remained `READY/READY`, Task 0058 still depends on Task 0057, transaction inspection returned `NONE / NO_TRANSACTION_EVIDENCE`, and `git diff --check` passed.
- PASS — preserved authored hashes: Task 0057 TASK `165a4b0d17073583bca9f616766fadbe39bf8b419b712be0e518de35ebf08856`, TEST `9ccf1475887330a500483872c4a7e4019b3a83fb8b5a55d217b947c6a0718c9c`; Task 0058 TASK `83431f0898b700cb913fea31a93ba9894b79b62228adbf138de6fc800aa0227c`, TEST `9116f2bfcbdb1027ccdf92eec2e32d783d9491cf06612ec99eb93fc948ca2f67`.

### Permanent-document delta

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 13721 | 13721 | 215 | 215 | 0 | 0.00% | setup, usage, and contributor entry | Not applicable — no durable README meaning changed. | Existing outcome-only command guidance already absorbed the product entry point. |
| `AGENTS.md` | 3531 | 3531 | 48 | 48 | 0 | 0.00% | repository-wide Codex rules | Not applicable — no repository-wide invariant changed. | Existing explicit Skill and lifecycle rules remain sufficient. |
| `docs/SPEC.md` | 34660 | 34803 | 431 | 432 | 143 | 0.41% | observable product behavior and acceptance | The product now derives a portable internal key from an outcome title without caller shortening. | Absorbed as one bullet in the existing kyw-task required behavior; no procedure or chronology was added. |
| `docs/ARCHITECTURE.md` | 29866 | 29995 | 660 | 660 | 129 | 0.43% | stable components, boundaries, dependencies, and flows | The stable authoring flow now has a side-effect-free derivation/prevalidation boundary before allocation and transaction work. | Replaced the existing validation/publication flow lines and compacted the owner paragraph around the new boundary. |
| `Combined` | 81778 | 82050 | 1354 | 1355 | 272 | 0.33% | all four permanent-document owners | Product behavior and the matching stable component boundary both changed and require their canonical projections. | Added one SPEC bullet and replaced existing ARCHITECTURE flow prose; README and AGENTS remained unchanged. |

## Unverified

- Hosted PR actual-head, synthetic merge-compatibility, reviewed expected-head merge, and post-main exact-SHA evidence remain external `STANDARD` delivery work until GitHub records them.
- Registry probing, publication, version change, tag creation, GitHub Release creation, public submission, reruns, force operations, and branch deletion were not authorized and were not performed.

## Final Coverage Review

- [x] Map AC-01 through AC-08 to at least one final PASS row and record exact commands/results without replacing failures or retries.
- [x] Review positive, failure, 0/1/47/48/49/very-long, Unicode, punctuation, whitespace, collision, retained-manifest, payload, and zero-residue branches.
- [x] Prove allocator and transaction hooks were never reached for every planned rejection class.
- [x] Compare the final diff with Task scope and permanent-document ownership; confirm no historical pair, unrelated path, dependency, or version drift.
- [x] Validate the pair and execute the planner-selected stable/packaged gates before completion.
