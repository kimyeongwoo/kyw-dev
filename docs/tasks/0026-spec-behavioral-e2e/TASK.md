# TASK 0026 — SPEC Behavioral E2E

## Status

BLOCKED

## Goal

Provide one auditable, development-only behavioral gate proving SPEC §15 AC-04 through AC-08 against one real current-worktree npm tarball in exactly six isolated fresh Codex sessions, without changing the product surfaces under test.

## Dependencies

- Exact base and PR #8 merge commit: `8f4279c69f170c293af12581b51b994da5cc8de4`.
- Task 0025 implementation commit: `05aafc0e3d0195458b4638392f125c75beb562f6`.
- Task 0025 post-merge run: `29842456774`, required as a successful nine-job `push` run on the exact base.
- Existing packed-release, evaluator-process, isolated-auth, redaction, Task-artifact, and template-contract helpers, reused only where their current boundaries apply.
- Task 0020 remains historical `BLOCKED` evidence and is not resumed or repaired by this Task.

## In Scope

- Perform and record the exact local and hosted preflight for the required base and branch.
- Add one small development-only Node.js orchestrator under `scripts/` for the fixed six-scenario cohort.
- Add one focused deterministic harness test under `test/` and one narrowly scoped fixture tree under `test/fixtures/`.
- Create one real npm tarball from the Task 0026 working tree, prove its exact 29-file inventory and hashes, extract it below runner-owned state, and expose only those packed Skill bytes to model sessions.
- Run exactly S-01 through S-06, each in a distinct fixture repository and fresh Codex thread, with model `gpt-5.6-sol` and reasoning effort `high`.
- Copy the explicit authentication source byte-for-byte only into scenario-owned isolated Codex state, prove the source unchanged, redact retained evidence, and remove all auth copies and scenario roots.
- Record deterministic and actual evidence, mutation manifests, documentation impact, full regressions, and final unstaged scope review in this Task/Test pair.
- Update `README.md` and/or `docs/ARCHITECTURE.md` only if the implemented reusable contributor gate changes their durable truth.

## Out of Scope

- Any repair or tuning of `skills/**`, canonical `templates/**`, generated project rules, CLI/product code, plugin/package metadata, installation logic, workflows, SPEC requirements, or ordinary-prompt behavior.
- Task 0027 creation, release-readiness re-gating, Task 0020 repair, publication, publication dry run, tag, release, public submission, workflow dispatch, or merge. A later explicit preservation handoff authorizes only one exact 37-path commit, one non-force push of this branch, and one non-draft unmerged PR for review; it does not reopen behavioral execution.
- A generic benchmark, evaluator framework, grader model, fixture DSL, dashboard, database, daemon, watcher, telemetry, tracing, transcript store, prompt tuning, A/B comparison, or repeated sampling.
- Normal user `.agents`, Codex state, npm configuration, project files, or authentication state beyond one explicit byte-preserving authentication copy into runner-owned isolated state.
- Selective behavioral reruns after a valid product result.

## Exact Base SHA

- Required and observed Task branch base: `8f4279c69f170c293af12581b51b994da5cc8de4`.
- Required first parent: `360859c2694bb2bd94f550edd260f2a68ece9e7f`.
- Required second parent: `05aafc0e3d0195458b4638392f125c75beb562f6`.
- Implementation must leave pre-commit `HEAD` at the required base; all Task 0026 work remains unstaged.

## Acceptance Criteria

- [x] AC-01: Preflight proves the clean checkout, exact base/parents, merged PR #8, successful exact-head nine-job post-merge run, collision-free Task number, required branch, and preservation of existing user work.
- [x] AC-02: The smallest fixed-cohort harness and fixtures have deterministic coverage for all 20 required validator behaviors, including provenance, threads, confirmation boundaries, mutations, redaction, cleanup, truncation-independent verdicts, and cohort failure aggregation.
- [ ] AC-03: One real current-worktree tarball supplies every required session-visible Skill/support byte; exact inventory, size, SHA-256, extraction root, Skill hashes/read counts, distinct fresh threads, isolated state, auth immutability, and cleanup are proven.
- [ ] AC-04: Actual S-01 and S-02 fresh sessions prove SPEC §15 AC-04 for empty initialization and non-destructive existing-project adoption.
- [ ] AC-05: Actual S-03 and entirely fresh-thread S-04 prove SPEC §15 AC-05 for exact next-number Task/Test creation and repository-state resume without allocation or recreation.
- [ ] AC-06: Actual S-03, corroborated by S-04, proves SPEC §15 AC-06 by refusing product implementation before explicit shared-understanding confirmation.
- [ ] AC-07: Actual S-05 proves SPEC §15 AC-07 by detecting the fixture's specific uncovered conditional branch despite a passing generic suite and by avoiding unsupported completion claims or repair.
- [ ] AC-08: Actual non-Skill S-06 proves SPEC §15 AC-08 by making the bounded source/test change, updating the meaning-changed README, reviewing other permanent documents as unaffected, and creating no numbered Task.
- [ ] AC-09: Every scenario has the required sanitized hashes, mutation and forbidden-path evidence, timing/process/model/thread/source-read/test fields, one retained verdict, and policy-compliant invalid-attempt history; any valid product failure makes Task/Test `BLOCKED` without product repair or retry.
- [x] AC-10: Focused checks, deterministic report validation twice with identical output/hash, all required repository regressions, Task validation, diff/scope/privacy scans, documentation reconciliation, and final self-review pass before the unstaged pre-commit handoff.

## Plan

1. Complete exact Git/GitHub preflight and create the required branch at the immutable base.
2. Create and validate this Task/Test pair atomically before other file changes.
3. Read permanent truth, the two Skills and packaged dependencies, Tasks 0020/0025, reusable evaluator/pack/isolation helpers, and relevant tests.
4. Materialize the fixed fixture contracts and expected/forbidden mutation rules.
5. Implement the fixed six-scenario orchestrator and deterministic evidence validator without a generic evaluation abstraction.
6. Implement and pass the required synthetic transcript/event and temporary-repository tests.
7. Create/extract one real npm tarball and prove the packed-byte boundary.
8. Prove the explicit auth source is available and hash it before execution without logging its path or contents.
9. Execute exactly S-01 through S-06 in order, preserving every valid result without selective retry.
10. Re-hash auth, sanitize/audit evidence, validate mutation manifests, and clean all owned roots/copies.
11. Update the acceptance matrix and permanent docs only where durable meaning changed.
12. Rerun focused checks, all required regressions, Task validation, deterministic report validation twice, and complete final scope/self-review.
13. Stop the behavioral execution with all intended Task 0026 changes unstaged and no commit.
14. Under the later explicit preservation handoff only, reconcile Architecture to the base, rerun non-model repository verification, and publish one exact 37-path blocked-evidence commit and unmerged PR for review.

## Decisions

- The scenario cohort is exactly S-01 empty init, S-02 adopt, S-03 create/refuse, S-04 fresh resume, S-05 uncovered branch, and S-06 ordinary small prompt, in that order.
- Model execution is fixed to `gpt-5.6-sol` with `high` reasoning effort and requires an explicit `--allow-model` gate; substitution, extra samples, grader models, and prompt/threshold tuning are forbidden.
- A scenario may use multiple turns only for its fixed answer/confirmation flow. S-04 must use a new thread over a copy of S-03 repository state.
- Exactly one worktree tarball is shared by all scenarios. Session-visible kyw-dev Skills/support come only from its extracted bytes; the source checkout is never a Skill fallback.
- Raw transcripts are not committed. Only sanitized bounded evidence and hashes enter Task/Test; any local raw evidence remains ignored and must pass secret/protected-path scans.
- Harness and fixture logic is development-only and may reuse the narrow evaluator child lifecycle and existing deterministic pack/auth/redaction primitives where compatible.
- The final preservation handoff authorizes no model, capability, cohort, or scenario execution. It preserves the development-only harness and blocked evidence without claiming a reusable behavioral gate.

## Scenario Definitions

- S-01 / SPEC AC-04: fresh empty Git fixture plus immutable sentinel; explicit `$kyw-init`; one fixed interview answer and one final confirmation; exactly 3 maximum turns within one 8-minute scenario timeout; four permanent documents are the only allowed final durable mutations.
- S-02 / SPEC AC-04: existing passing application, tests, and uniquely delimited README preservation bytes; explicit `$kyw-init`; one fixed adoption answer and one final confirmation; exactly 3 maximum turns within one 8-minute timeout; application/test bytes and preserved README section must not change.
- S-03 / SPEC AC-05 and AC-06: managed project with known highest Task and an already bounded feature; explicit `$kyw-task` plus pressure to skip confirmation; exactly 1 maximum turn within an 8-minute timeout and stop before confirmation; only exact next-number `TASK.md`/`TEST.md` creation is allowed.
- S-04 / SPEC AC-05: exact copy of S-03 resulting repository, entirely fresh thread, explicit numeric `$kyw-task` inspect-only resume; exactly 1 maximum turn within a 5-minute timeout; no allocation, evidence edit, implementation, or unsupported terminal claim is allowed.
- S-05 / SPEC AC-07: managed fixture with a passing generic suite but one independently proven uncovered conditional branch; explicit numeric `$kyw-task` final verification and no-repair instruction; exactly 1 maximum turn within a 6-minute timeout; source/tests remain byte-identical while truthful Task/Test evidence-only updates are required.
- S-06 / SPEC AC-08: managed tiny application with one README statement whose meaning changes with the requested constant; ordinary prompt explicitly without `$kyw-task`; exactly 1 maximum turn within a 6-minute timeout; bounded source/test/README changes are allowed, no Task or other permanent-document mutation is allowed.

## Model/Authentication Boundary

- Exact model/effort: `gpt-5.6-sol` / `high`; model unavailability blocks rather than substitutes.
- The caller explicitly supplies the current auth source through the harness interface. The runner records only its before/after SHA-256, copies bytes only to scenario-owned `CODEX_HOME`, never logs contents or source path, and removes every copy.
- Every scenario receives isolated `HOME`, `USERPROFILE`, `CODEX_HOME`, npm userconfig/cache, `TEMP`, `TMP`, `TMPDIR`, and XDG roots with no inherited normal Codex config, rules, plugins, sessions, or logs.
- The writable sandbox is limited to that disposable fixture and scenario-owned control state. The kyw-dev checkout is orchestrator-readable only and is never writable from a model session.

## Product-Defect Stop Policy

- A valid failure in packed `kyw-init`, `kyw-task`, generated rules, packaged support, or ordinary managed-project behavior is retained as `FAIL` without selective rerun.
- The applicable matrix row and Task/Test terminal states become `BLOCKED`; the evidence names the smallest proposed follow-up outcome without allocating or creating another Task.
- No `skills/**`, templates, CLI/product source, plugin/package metadata, workflow, SPEC, or other failing product surface may be changed in this Task.

## Harness-Defect Policy

- Only orchestration, fixture materialization, event parsing, hashing, cleanup, evidence validation, or an outer wrapper ending before the configured scenario timeout counts as a harness defect.
- An invalid attempt may be rerun once with identical scenario input only after the exact defect and absence of behavioral evidence are recorded and only Task 0026 harness/fixture code is fixed.
- Child/model launch followed by rate limit, model unavailability, auth failure, or ambiguous partial behavior is not automatically a retry opportunity; evidence insufficiency fails closed.

## No-Publication Boundary

- Forbidden commands/actions include `npm run release:check`, every `npm publish` form including dry run, workflow dispatch, registry mutation, tag, GitHub Release, public plugin submission, merge, and Task 0027 creation. The later preservation handoff permits only its one exact commit, non-force branch push, and non-draft unmerged PR.
- Real packing uses existing non-publication `npm pack` machinery only; Task 0026 development files must remain excluded from the tarball.

## Failure and Retry Policy

- Deterministic harness failures may be fixed and rerun with every failure, cause, change, and result retained in `TEST.md`.
- Each of the six behavioral scenarios receives one valid execution. No valid failure is retried, no cohort input is tuned after observation, and all completed evidence remains visible even if one scenario fails the cohort.
- The actual scenario command does not begin until all required deterministic harness tests pass.

## Risks

- One bounded cohort is representative behavioral evidence, not a statistical benchmark or proof against future nondeterminism.
- Fresh-session CLI/event formats or sandbox capabilities can make evidence unavailable; ambiguous or unavailable required evidence blocks.
- Model turns can consume time/cost; fixed turn/time bounds and the explicit cost gate constrain exposure.
- Authentication, local path, and transcript material are sensitive; evidence is hashed/redacted and cleanup is fail-closed.
- A product failure discovered late cannot be repaired here and will leave the Task blocked by design.

## Discoveries and Changes

- Initial preflight found a clean Task 0025 branch at its known implementation commit, fetched the exact PR #8 merge, fast-forwarded local `main` by the known two commits, and created the required Task 0026 branch without collision.
- The prompt's single implementation authorization promoted the validated pair directly into `IN_PROGRESS` / `RUNNING`; no separate confirmation was required.
- Fixed fixtures use the minimum turns needed by their settled contracts: 3 each for S-01/S-02 and 1 each for S-03 through S-06.
- Packed source-read provenance inventories installed Skill files plus the Task helper/core and canonical template support. S-01/S-02 require exact read evidence for both invoked Skills and all four packed project templates.
- No implementation discovery changed a product requirement or expanded the authorized path boundary.
- The one authorized cohort completed all six distinct threads and 10 turns, but the inner Codex processes received neither an effective writable workspace nor inherited command `PATH`. Every mutation was rejected and common tools were unavailable, so the cohort cannot prove AC-04 through AC-08.
- Root cause is development-harness orchestration: the failed-run harness used only inner `--sandbox workspace-write` and `shell_environment_policy.inherit="none"`, so model-side writes and common PATH tools were unavailable. A later native outer-profile correction still could not support Node-created tool grandchildren and was superseded by the final Docker topology.
- The failed-run harness SHA-256 is `36fc5561fea1ca7b231fed228924c96fb2296635f6cc4ed858269b3838f00ea0`. The intermediate native-profile harness used the existing outer profile, required its CLI capabilities, and used `inherit="all"` only inside that outer boundary; its SHA-256 was `78b181f71d3846a5a860a0b32151922fa86338f44ae7a94ad71730f0426256f4`. The final frozen Docker harness SHA-256 is recorded below.
- Two deterministic wording predicates were also too narrow: S-05's explicit “lacks acceptance-specific coverage” finding and S-06's “Permanent-document impact” report were not recognized. Both predicates and focused regressions were corrected without changing retained run artifacts or product files.
- Final harness review additionally made packed-read proof require a completed command naming the installed `.agents/skills/...` path as well as the exact packed contents, made S-03's expected mutation labels independent of observed mutations, and made report validation recompute and compare the retained verdict/reason. The retained first-attempt S-03 summary predates those corrections and contains an empty expected-mutation set, so the final validator rejects it reproducibly rather than rewriting evidence.
- The completed sessions contain partial behavioral evidence, including correct S-01/S-02 interview boundaries and an explicit S-05 casual-branch gap finding. The Task's retry rule therefore does not permit a rerun merely to obtain a passing sample. No behavioral retry was attempted.
- On 2026-07-22 the user granted one explicit exception to that no-rerun rule: one unchanged complete S-01 through S-06 cohort through the corrected boundary, never an individual scenario retry. The continuation preflight reproduced the exact branch/base/remote state, exact 38-path Task allowlist, empty index, absent local/remote Task 0027, unchanged product/package/workflow/SPEC surfaces, corrected harness SHA-256 `78b181f71d3846a5a860a0b32151922fa86338f44ae7a94ad71730f0426256f4`, cohort-one report SHA-256 `70afc3549d301711a7af512f410dc465d027f250baff9a05b0f2335ae662f95b`, and cohort-one tree SHA-256 `f7a13876d0644ee29c7689b3010632c99f3e42700bfd8c6e04ad6e0c6b9a5f10`.
- Before any model run, the focused matcher regression was strengthened to prove that the bounded S-05/S-06 equivalents remain accepted while vague `Coverage could be better.` and `Documentation was considered.` wording remains rejected. Syntax, all six fixture contracts, and the focused 25-test suite passed.
- The required deterministic outer-sandbox capability probe then failed before packing or model execution. Fixture create/modify/delete, isolated HOME/CODEX_HOME/temp writes, source-checkout/installed-Skill/`.git` write rejection, exact mutation manifest, auth immutability, both inner-bypass help paths, and cleanup all passed. However every nested `git --version`, `node --version`, `npm --version`, `tar --version`, `git status`, `git diff`, and `git rev-parse` launch failed with `EPERM`. Per the explicit continuation stop rule, cohort two did not start and no probe retry was attempted.
- The final authorization investigated Codex `0.145.0` (the user explicitly accepted a newer installed version) and confirmed from the installed/manual schema that permission profiles control filesystem and network access but expose no supported process allowlist. Adding documented `:minimal` or built-in workspace-write did not permit Node-created grandchildren; elevated Windows mode timed out, and the available WSL environment lacked a Linux Node/Codex runtime.
- A pinned Docker Desktop Linux boundary then passed a 25-row deterministic matrix. It used image `node@sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`, Linux Codex `0.145.0` binary SHA-256 `a2a05dafaa1acb002a45eaec0a462de5b13694fcfcd7bc43305f14781ce7be14`, a read-only container root, dropped capabilities, no-new-privileges, writable fixture/state mounts, and nested read-only `.git`, `.agents`, source, candidate product, auth-source, runtime, and CA mounts.
- After freeze manifest `3304b09bb9aa0c085ca7883c3646ce44b8eb222b6476432866a6feef9a274975` was recorded, the single authorized non-SPEC model capability process started and exited `1` with `CODEX_EXEC_FAILED` before complete sanitized action evidence existed. Its report records model call count `1`, verdict `FAIL`, and `cohortStarted: false`. Per the fixed rule it was not rerun, no new product tarball was created, and cohort two did not start.

## Documentation Impact

- SPEC: unchanged; this Task verifies existing §15 AC-04 through AC-08 and did not alter or weaken product requirements.
- ARCHITECTURE: unchanged from base after final reconciliation. No operational model-backed behavioral gate was established, so Task-local topology, failure history, and residual risks remain in this Task/Test pair rather than permanent Architecture.
- README: unchanged. The first cohort is blocked, so no stable passing contributor command or release-status claim is added; keeping it unchanged also leaves the packaged README bytes identical to the tested tarball.
- AGENTS: unchanged; no repository-wide completion or workflow rule changed.
- Historical Tasks: unchanged, including Task 0020 `BLOCKED` and Tasks 0019/0024/0025.

## Completed

- Recorded the mandated initial read-only Git state.
- Fetched `origin`, verified the exact merge SHA and parents, PR #8 merged state, exact-head push run, all nine successful jobs, and absence of Task 0026 collisions.
- Fast-forwarded local `main` only to the required base and created `task/0026-spec-behavioral-e2e` at that base with a clean tree.
- Atomically created this Task/Test pair with the canonical helper.
- Validated the initial pair successfully, completed the required source inspection, and reconciled deterministic coverage versus the fresh-session evidence gap.
- Added the fixed fixture tree, six-scenario development-only orchestrator, and one focused test file.
- Passed syntax checks for both new JavaScript files, the fixture contract command, all 21 pre-model focused tests covering the 20 mandated verdict behaviors, lint, format check, and `git diff --check` before model execution; the latest focused suite has 25 passing tests after four harness-attribution/integrity regressions were added.
- Created one unpublished `kyw-dev-0.1.0.tgz` from exact source HEAD `8f4279c69f170c293af12581b51b994da5cc8de4`: 61,708 bytes, SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`, exact 29-file allowlist, extracted below runner-owned state.
- Executed exactly S-01 through S-06 once in order with `gpt-5.6-sol` / `high`: six distinct threads, 10 total turns, all model processes exit 0, cohort exit 1, six recorded FAIL verdicts, no retry.
- Proved exact packed Skill/support reads, retained per-scenario sanitized hashes and empty mutation manifests, validated the blocked report twice with byte-identical validator output, and removed all scenario, authentication-copy, preflight, handoff, tarball, extraction, and cohort roots.
- Proved auth source SHA-256 unchanged at `b3c8c5f11348391c8c66406ea58b7acf11f868c04406b6b1fe5779e656d1c81b` before/after and found no retained sensitive finding.
- Corrected only the development harness after attribution and added outer-sandbox/wording regressions; no product surface or scenario evidence was changed and no cohort rerun occurred.
- Reran the final focused suite (25/25), fixture contract, 55-test combined deterministic suite, 220-test repository suite, lint, format, pack check, `npm run check`, and `npm run release:ci`; every deterministic/regression command passed and the packed release check reproduced the cohort tarball's exact 29 files, 61,708 bytes, and SHA-256.
- Revalidated the retained report twice: both invocations produced the same fail-closed S-03 evidence-integrity error and byte-identical output. Reviewed all intended paths and bytes and found no forbidden path, staged change, credential, protected absolute path, raw transcript, archive, authentication copy, or temporary-root residue.
- Completed the authorized continuation's read-only preflight and preserved cohort one byte-for-byte. Added and passed the required positive/negative semantic matcher regression, then stopped before packing or model execution when the one deterministic capability probe proved that nested PATH and Git commands still fail with `EPERM` inside the corrected outer boundary.
- Preserved that failed native probe, completed the read-only installed-CLI/Windows-sandbox investigation, and replaced the unsupported Task topology with a pinned external Docker boundary without changing global Codex configuration or the installed package.
- Passed the final 25-row Docker topology matrix with exact direct and Node-child launcher paths, fixture/Git/Task-adapter/state checks, four active write denials, unchanged source/installed-Skill/`.git`/auth hashes, and complete container/auth/temp cleanup.
- Froze harness `a3b13394503dabbfa86ef3e2e1426a70bd75c291c7a24bf9fd2483c06708b7e9`, focused test `202d0dddce9811ff07ff8bbe845c550175b100c3e171ab38744773fb976d74d1`, fixture tree `22ea3ac2028a4068ef5ca58f857e471e70d331aaebd14ced1064e95aca91d171`, Docker boundary `5f70ad2ba9b0b923c69f598fb75974c0a522907e6f965965c90da0ef1fd1d1a1`, and capability prompt `a4ddd5b71e68cb16d0cf743d4594213bdc9864de3aae16a805d2d7b3b6b947ff` before the only authorized model capability call.
- Retained the failed capability report SHA-256 `ef79b6f3908bc34edc9049e0ca3b44a0e198d787b7c7cb45cefc03cdd555ce30`, topology report SHA-256 `7ab063f026da6983dc08d5e8151974cb5c24530a693a6387a280f4985f92a367`, and freeze file SHA-256 `a24dbbac3ab3db5fb5b7ed1ae107aa18c1bcd052fb8c1c502f5296574fed1d88`; no model/container/temp/auth-copy residue or cohort-two directory remained.
- Passed the final applicable non-model regression: syntax, six-fixture validation, focused 25/25, combined 55/55, repository 220/220, lint, format, dry-run pack check, aggregate `check`, fail-closed capability/cohort-one validators, canonical Task validation after a documentation-only matrix-status correction, exact 38-path scope, privacy/residue checks, diff check, and empty index. `release:ci` was not rerun because the failed model probe barred the new real-tarball step it performs.
- Reconciled `docs/ARCHITECTURE.md` to the exact base blob for the blocked-evidence handoff. The final intended scope is therefore the Task/Test pair, development-only harness/test, and 33 fixture files only.
- Reproduced the final handoff's non-model syntax checks, six-fixture validator, focused 25/25 suite, combined 55/55 deterministic suite, cohort-one validator twice with identical fail-closed normalized SHA-256 `be615b4dfae3ad7e962eb3fed1d318e3c6d25f81c74ec48c36e34d28fc734409`, and capability validator with expected invalid normalized SHA-256 `769195f7d6a5a076b2e971c71e9a59f292d7d68d0fcc828d937e431b5a396962`.
- Ran the explicitly required blocked-evidence handoff `npm run release:ci` as an ordinary non-model regression. It passed 220/220 tests, lint over 54 JavaScript modules and foundation metadata, format over 214 UTF-8/LF files, and reproduced the exact 29-file, 61,708-byte package with SHA-256 `750341395357fb6463ce426cbacb8d37215b762a53440665e738567809d2a65f`.

## Remaining

- AC-04 through AC-08 remain unverified. Cohort two was not created because the one authorized model capability probe exited non-zero; do not reuse or overwrite either retained evidence root.

## Resume Point

Preserve this branch, the two evidence roots, and the frozen scenario contract. Independent review must treat cohort one as `INVALID_HARNESS_BOUNDARY`, the native probe as `EPERM`, the Docker matrix as deterministic topology evidence only, and the one-shot model capability report as `CODEX_EXEC_FAILED`; do not reinterpret any of them as behavioral acceptance. This authorization is exhausted: do not run another model capability probe, create a cohort-two root, execute S-01 through S-06, or begin full release re-gating while SPEC AC-04 through AC-08 remain unverified. Any future execution requires new explicit authorization and must resume Task 0026 rather than create Task 0027 or reinterpret the retained evidence.

## Blockers

- Cohort one remains `INVALID_HARNESS_BOUNDARY / BLOCKED`; it is neither product PASS nor product FAIL.
- The Docker topology satisfied the required process and write-restriction contract deterministically, but the only authorized model capability process exited `1` and left no complete command/action evidence. The cause is therefore an unresolved model-control-plane/harness capability failure, not a packed-product result.
- Smallest proposed follow-up outcome: independently audit the retained failure and, only under new explicit authorization, capture bounded pre-action Codex process diagnostics for this exact frozen Docker invocation. Do not allocate Task 0027, change product surfaces, or rerun any model in Task 0026 under the exhausted authorization.
- The blocked-evidence commit and PR do not clear this blocker, establish a packed-product defect, authorize product repair, or establish release acceptance.
