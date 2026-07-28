# TEST 0055 — Compact Permanent Documents and Add Growth Guardrails

<!-- kyw-task-contract: 2 -->

## Status

PASSED

## Test Basis

- Task: `./TASK.md`.
- Product requirements: `../../SPEC.md`, especially the four-document ownership, five-Skill behavior, Task/Test lifecycle, safety, compatibility, evidence, distribution, and publication contracts.
- Architecture constraints: `../../ARCHITECTURE.md`, especially canonical authority/dependency direction, the single deterministic Task/runtime/delivery engine, direct/plugin distribution, validation/CI boundaries, and portability/isolation trade-offs.
- Repository rules: `../../../AGENTS.md`.
- Canonical authoring procedure: `../../../skills/kyw-task/SKILL.md`.
- Canonical implementation procedure: `../../../skills/kyw-impl/references/execution.md`.
- Canonical audit procedure: `../../../skills/kyw-audit/references/audit.md`.
- Existing validation owners: `../../../scripts/lib/validate-foundation.mjs`, `../../../test/foundation.test.mjs`, `../../../test/instruction-surfaces.test.mjs`, `../../../scripts/format-check.mjs`, and `../../../scripts/verification-plan.mjs`.
- Fresh authoring baseline: local/cached/direct/GitHub `main` `fc0703db8b81c33ac414805fcb1fff8f5e994246`; document bytes and lines are recorded in the Task Discoveries and T-06.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose an exact configured model identifier)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: the current user requested no model override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose the configured effort)
- Codex surface: `API` (`OBSERVED`: the active system identifies access through an API)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: the active API surface does not expose its Codex version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — exact four-document inventory and role retention | Extend the existing foundation/instruction tests to enumerate the repository permanent-document registry and project templates, require exactly the four established paths, reject a fifth path/generated mirror, and assert each path's owner role and local links. | Static/integration | PASS | Final 80-test focused bundle passed inventory, added/missing/renamed/mirror/duplicate-role, and local-link cases. |
| T-02 | AC-02 — named product, safety, compatibility, delivery, and publication contracts survive compaction | Build an explicit retained-contract table and test each named anchor at its canonical owner plus the permitted projection; mutate or delete one anchor per family, including five Skills/explicit-only, author-versus-executor split, audit, engine/schema/status/dependency/one-active/current-legacy, preservation/evidence, acceptance verification, hardened delivery, install safety, ordinary prompt, version, and authority boundaries. | Static/behavioral/integration | PASS | Focused foundation, instruction, four owning-Skill, template, and behavioral tests passed; `npm run release:ci` also passed 333/333 tests. |
| T-03 | AC-03 — SPEC and ARCHITECTURE own only observable behavior versus stable structure | Parse headings and owner anchors; require SPEC product/acceptance sections and ARCHITECTURE context/component/boundary/flow/trade-off sections, then reject product-only rules moved to ARCHITECTURE and implementation/procedure/catalog content left in either owner. | Static/document contract | PASS | Owner-role and SPEC/ARCHITECTURE crossover mutations passed in `test/foundation.test.mjs`; final headings and diff were reviewed. |
| T-04 | AC-04 — procedure, algorithm, test catalog, and mutable/history evidence return to canonical owners | Scan the four documents with bounded patterns for numbered historical Task/PR/run/full-SHA/candidate verdicts, copied Task/Test evidence headings/results, adapter/internal payload grammar, audit tokenizer grammar, ordered lock/hash/rollback steps, evaluator constants, and exhaustive test/fixture catalogs; verify the canonical Skill/reference or source/test owner retains the needed truth. | Static/document contract | PASS | Chronology, evidence-leakage, detailed-procedure, stale-command, and legitimate-vocabulary cases passed; canonical Skill/reference assertions passed. |
| T-05 | AC-05 — one canonical owner and minimal projections per rule family | Validate one explicit registry of rule family, canonical owner, allowed projection paths/required anchors, and forbidden detailed anchors; reject duplicate owners, missing owners, unlisted projections, copied procedures, and stale projection text. | Unit/static | PASS | Registry positive case and every ownership/projection failure category passed in the final focused bundle. |
| T-06 | AC-06 — measurable safe compaction | Recompute UTF-8 bytes and line counts for every document and combined, compare with the exact baseline `21,605/245`, `4,489/75`, `47,998/616`, `93,002/973`, combined `167,094/1,909`, calculate signed/percentage deltas, enforce targets `18,432`, `4,096`, `34,816`, `49,152`, combined `106,496`, and inspect representative line lengths plus the retained-contract table. | Static/measurement/review | PASS | Exact Results rows bind current bytes/lines; final set is 81,778 bytes/1,354 lines, down 51.06%/555 lines, and every target passes. |
| T-07 | AC-07 — AGENTS target and hard ceiling are distinct | Exercise the pure byte policy at 4,096, 4,097, 8,192, and 8,193 bytes; require compacted repository AGENTS at or below 4,096, warning/evidence behavior above target, and unconditional failure above the unchanged hard ceiling. | Unit/static | PASS | Exact four-boundary unit cases passed and repository AGENTS measures 3,531 bytes. |
| T-08 | AC-08 — all deterministic guardrails are reached by existing CI | Exercise exact path, all per-file/combined warning-hard boundaries, chronology/evidence leakage, owner/projection, detailed-procedure, and stale npm/node command mutations through the existing foundation/instruction test entry; statically prove `npm test` and `.github/workflows/ci.yml` still reach that entry without a model/dependency. | Unit/static/CI contract | PASS | All named guard families passed in ordinary Node test discovery; `npm run release:ci` proved the unfiltered Stable entry and packaging path. |
| T-09 | AC-09 — document delta and growth justification are deterministic | Parse the current TEST delta evidence and test `+2,047/+2,048`, just-below/exact 10% using integer arithmetic, combined `-1/0/+1`, missing before/after/lines, after-byte mismatch, missing durable necessity, missing absorption/replacement evidence, warning crossing, hard crossing, attempted automatic limit bump, and an explicitly approved budget-change fixture. | Unit/integration | PASS | Threshold, malformed-evidence, chained-baseline, terminal-0055, automatic-limit rejection, and explicit-approval fixtures all passed through integrated foundation state. |
| T-10 | AC-10 — progressive loading targets owners and escalates fail-closed | Add scripted/static scenarios for a README-only setup change, SPEC-only behavior change, ARCHITECTURE-only boundary change, implementation change selected through Goal/scope/Documentation Impact/changed code, and absent current pair during new authoring; require full read for `kyw-init`, rebaseline, major redesign, broad cross-owner change, source conflict, ambiguous owner, missing heading, or targeted truth insufficiency. | Static/Skill contract/integration | PASS | Narrow owner-selection, absent authoring pair, every full-read trigger, and unresolved-truth stop cases passed; projections passed across AGENTS and all owning procedures. |
| T-11 | AC-11 — existing readers, Skills, installer, package, behavior, instruction, CI, and delivery do not regress | Run the focused foundation/instruction and affected `kyw-init`/`kyw-task`/`kyw-impl`/`kyw-audit` tests, current/legacy artifact and queue/delivery tests, installer/distribution/package selection, direct SPEC behavioral fixture validation, and the final planner-selected tier; map each retained family to specific evidence. | Unit/integration/behavioral/packaging | PASS | Final focused bundle passed 80/80; direct behavioral acceptance validated six scenarios; planner selected RELEASE; `npm run release:ci` passed 333/333 plus lint, format, pack, and candidate. |
| T-12 | AC-12 — historical and publication state stay untouched | Compare the final path/diff inventory with the authorized Task scope; reject changes under any earlier `docs/tasks/` directory, package/plugin version drift, registry/publication/tag/Release automation or state, model-backed outputs, new dependencies, generated documents, and unrelated cleanup. | Static/diff/package audit | PASS | Final 19-path inventory contains only scoped files and this pair; versions remain 0.1.0, dependency fields remain absent, `git diff --check` passed, and no publication action occurred. |

## Regression Coverage

- Five visible packaged Skills and `allow_implicit_invocation: false` metadata for every Skill.
- `$kyw-task` complete author-only `READY/READY` publication and stop; `$kyw-impl` existing-Task execution/resume/delivery only; `$kyw-audit` independent read-only or exact-fix modes.
- Single core artifact/queue/transaction/delivery engine, one active Task, current marker/schema/status/dependency grammar, and immutable legacy readers.
- User-work preservation, evidence honesty, acceptance-specific verification, compaction handoff, final-diff coverage, and ordinary small-prompt documentation routing.
- `HARDENED_EXACT_HEAD` `STANDARD` delivery roles and exact-SHA GitHub ledger boundary, without treating CI success as behavioral or publication approval.
- Direct/project/plugin installation ownership, update/uninstall/doctor safety, zero production dependencies, package selection, version `0.1.0`, and no npm lifecycle installation.
- Current Node/OS compatibility, credential-free CI, immutable Action identity, and separate publication/registry/version/tag/Release authority.
- UTF-8/LF/final-newline/whitespace/local-link validation and readable Markdown structure.

## Commands

Authoring inspection executed:

- `git branch --show-current`; `git rev-parse HEAD`; `git rev-parse '@{upstream}'`; `git rev-parse refs/heads/main`; `git rev-parse refs/remotes/origin/main`; `git ls-remote origin refs/heads/main`; `gh api repos/kimyeongwoo/kyw-dev/commits/main --jq .sha` — exit 0; exact identities recorded in the Task.
- `git status --porcelain=v2 --branch --untracked-files=all`; `git diff --cached --name-status`; `git diff --name-status`; `git ls-files --others --exclude-standard` — exit 0; staged, unstaged, and untracked path sets were empty.
- `git rev-parse 'HEAD^{tree}'`; `git rev-parse 'refs/heads/main^{tree}'`; `git merge-base HEAD refs/heads/main`; `git rev-list --left-right --count HEAD...refs/heads/main` — exit 0; content-equivalent trees and `0 1` divergence observed.
- `node skills/kyw-task/scripts/task-artifacts.mjs inspect-transaction --tasks-root docs/tasks` — exit 0; `NONE/NO_TRANSACTION_EVIDENCE`.
- `gh pr list --repo kimyeongwoo/kyw-dev --base main --state open --json number,title,headRefName,baseRefName,url` — exit 0; empty list.
- PowerShell status parser over every `docs/tasks/NNNN-*/TASK.md` and `TEST.md` — exit 0; 54 pairs, zero active, exact status totals recorded in the Task.
- `[System.IO.File]::ReadAllBytes(...)`, `Get-Content`, and heading parsing for the four permanent paths — exit 0; exact baseline bytes, lines, hashes, and heading counts recorded in the Task.
- `Get-Content -LiteralPath <path> -Raw` or bounded line chunks for all four permanent documents, the canonical authoring/execution/audit owners, generated AGENTS template, Task/Test templates, and existing foundation/instruction/format/planner validation — exit 0; complete current sources inspected.
- `rg -n` bounded searches across permanent documents and canonical Skills/references for rule families, chronology, evidence headings, transaction/evaluator constants, test catalogs, progressive-loading rules, and owner projections — exit 0 where matches existed; locations summarized in the Task.
- PowerShell command-reference scan against `package.json` scripts and repository-relative `node ./...mjs` paths — exit 0; no currently stale npm script or Node script reference found.

Implementation preflight executed:

- `node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0055-compact-permanent-documents-and-add-growth-guard` — exit 0; pair valid at `READY/READY`.
- Fresh local/cached/direct/GitHub `main`, branch/upstream/tree/divergence, status, open-PR, and transaction checks — exit 0; `main` was `fc0703db8b81c33ac414805fcb1fff8f5e994246`, the only worktree paths were this untracked pair, no open PR or transaction existed, and the old branch tree equaled current `main`.
- First packaged dispatch without delivery objects — exit 0 with `QUEUE_TRANSITION_BLOCKED`; retained as expected fail-closed evidence that repository-complete `STANDARD` Tasks require their external ledger.
- Fresh GitHub merged-PR and Actions collection plus local `git merge-base --is-ancestor` checks — exit 0; Tasks 0030–0050 and 0052–0053 are before the last pre-hardened `main` anchor and each has one matching successful PR and post-merge `main` run. Task 0054 instead has a complete schema-2 graph from PR 41/run `30313245224`, synthetic merge `f96685c0eb18d74c3ef9d6f11781f7a9e3f7d5e2`, merge `fc0703db8b81c33ac414805fcb1fff8f5e994246`, and post-merge run `30313466031`.
- An initial all-legacy dispatch returned `SELECTED`, but follow-up ancestry review showed Task 0054 introduced the hardened contract and was therefore ineligible for legacy continuity; that selection was discarded as trust evidence.
- A direct corrected dispatch attempt exceeded the Windows child-process command-line limit, and the first environment-backed in-process adapter invocation used an invalid `process.argv[1]` path and exited 1 with `ENOENT`; neither changed repository or external state.
- Corrected packaged dispatch with 23 trusted-local legacy expectations, Task 0054's full `HARDENED_EXACT_HEAD` expectation/FINAL ledger, fresh GitHub identities, and empty checked preflight issue arrays — exit 0; Task 0055 selected with action `RESUME`, authority `STANDARD_LIFECYCLE`, and no ceremonial confirmation.
- `git switch -c task/0055-compact-permanent-documents-and-add-growth-guard main` — exit 0; branch created from exact current `main` while preserving the untracked pair.
- Three read-only subagent analyses independently covered permanent-document contract inventory, validator/test design, and Git/GitHub delivery preflight; their findings were reconciled by the active agent before authorized implementation was delegated.

Implementation and verification executed:

- Initial `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs` — exit 1, 19/25 passed; six retained assertions still expected removed chronology or earlier projections. Those assertions were moved to present owners or canonical procedure tests.
- Initial `node --test test/kyw-init.test.mjs` — exit 1, 6/7 passed; the generated AGENTS line-break-sensitive assertion was synchronized with the compact template, then 7/7 passed.
- Initial affected `kyw-task`/`kyw-impl`/`kyw-audit` aggregate — exit 1 with five assertion failures; compacted projection expectations were restored at canonical owners. Final affected bundle passed.
- `node --test test/template-contracts.test.mjs` — exit 0, 8/8 passed; combined `test/kyw-init.test.mjs test/template-contracts.test.mjs` — exit 0, 15/15 passed.
- `node --check scripts/lib/validate-foundation.mjs` and `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs test/verification-plan.test.mjs test/template-contracts.test.mjs test/kyw-init.test.mjs test/kyw-task.test.mjs test/kyw-impl.test.mjs test/kyw-audit.test.mjs` — exit 0, 80/80 passed.
- `node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures` — exit 0, `CURRENT_SESSION_DIRECT`, six scenarios valid.
- `npm run verify:plan -- <all 19 exact changed paths>` — exit 0; selected `RELEASE` with one ordered non-publishing command, `npm run release:ci`.
- `npm run release:ci` — exit 0; 333/333 tests, lint over 73 JavaScript modules and foundation metadata, format over 305 UTF-8/LF files, pack of 41 files/96,540 bytes, and isolated candidate SHA-256 `40fb0bca9625b2864f16be0ba9c9a2d9169e8154f67d04960bc3c03ada291be4` passed.
- First terminal pair validation — exit 1; it correctly rejected non-`None` Remaining and Resume Point text after `DONE`. Both fields were changed to reasoned `None`, and the exact validator then exited 0 with `valid: true`.
- Terminal `node --test test/foundation.test.mjs test/instruction-surfaces.test.mjs` — exit 0, 29/29 passed, proving the 0055 one-time targets still apply after `DONE/PASSED`; terminal `npm run format:check` passed 305 files.
- Final exact byte/line/maximum-line measurement, 19-path status/diff inventory, `git diff --check`, package/plugin version/dependency inspection, pair validation, retained-contract review, and AC/T mapping review — exit 0.

## Results

- Lifecycle preflight passed and the pair entered `IN_PROGRESS/RUNNING`.
- Deterministic policy, ownership/projection, leakage, stale-command, growth-evidence, and progressive-loading checks passed through the existing foundation/instruction surfaces.
- The final focused, behavioral, planner-selected RELEASE, formatting, packaging, candidate, pair, and diff checks passed with the exact evidence listed above.

### Permanent-document delta

<!-- kyw-permanent-document-delta:v1 -->

| Path | Before bytes | After bytes | Before lines | After lines | Byte delta | Percent | Canonical owner | Durable necessity | Replacement or absorption |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| `README.md` | 21605 | 13721 | 245 | 215 | -7884 | -36.49% | setup, usage, and contributor entry | Not applicable — the document shrank. | Replaced release chronology and procedure detail with current entry-point contracts and canonical links. |
| `AGENTS.md` | 4489 | 3531 | 75 | 48 | -958 | -21.34% | repository-wide Codex rules | Not applicable — the document shrank. | Merged repeated lifecycle prose into thin routing, loading, preservation, documentation, evidence, and completion invariants. |
| `docs/SPEC.md` | 47998 | 34660 | 616 | 431 | -13338 | -27.79% | observable product behavior and acceptance | Not applicable — the document shrank. | Replaced procedural and structural detail with observable contracts and delegated canonical procedure and architecture. |
| `docs/ARCHITECTURE.md` | 93002 | 29866 | 973 | 660 | -63136 | -67.89% | stable components, boundaries, dependencies, flows, and trade-offs | Not applicable — the document shrank. | Replaced exhaustive module, fixture, evaluator, and algorithm catalogs with component groups, invariant flows, and owner links. |
| `Combined` | 167094 | 81778 | 1909 | 1354 | -85316 | -51.06% | all four permanent-document owners | Not applicable — the set shrank. | Absorbed duplicated meaning into one canonical owner per rule family and retained only tested projections. |

## Unverified

- Hosted PR exact-head, synthetic merge-compatibility, protected-merge, and post-main CI remain external `STANDARD` delivery work and are recorded only in GitHub.
- Registry probing, publication, version change, tag creation, GitHub Release creation, public plugin submission, reruns, force operations, and branch deletion were not authorized and were not performed.

## Final Coverage Review

- [x] Compare the final diff to the matrix.
- [x] Map every acceptance criterion to one or more test rows.
- [x] Add coverage for introduced branches, failures, and compatibility behavior.
- [x] Confirm PASS evidence is reproducible.
- [x] Confirm required regressions ran.
