# TASK 0020 — Release Readiness Gate

## Status

IN_PROGRESS

## Goal

Form one attributable release-candidate commit, verify that exact SHA from a clean detached worktree across hosted CI, packed distribution, behavior, filesystem, audit, lifecycle, Skill-session, registry-name, and current official Codex requirements gates, then record only `READY_FOR_APPROVAL` or `BLOCKED` without publishing.

## Dependencies

- `0016-release-readiness-gate`
- `0017-grilling-cancellation-precedence`
- `0018-audit-readonly-diagnostics`
- `0019-release-gate-isolation`
- `0010-continuous-integration`
- `0012-grilling-parity-and-tuning`
- `0013-filesystem-security-hardening`
- `0014-audit-readonly-contract`
- `0015-release-metadata-and-hygiene`
- `../../../.github/workflows/ci.yml`
- `../../../package.json`
- `../../../scripts/packed-release-check.mjs`
- `../../../scripts/release-gate-isolation.mjs`
- `../../../scripts/audit-smoke.mjs`
- `../../../scripts/grilling-eval.mjs`
- `../../../skills/kyw-grilling/SKILL.md`
- `../../../skills/kyw-audit/SKILL.md`
- `../../../skills/kyw-audit/references/audit.md`

## In Scope

- Confirm that `0020` is the next unused local and remote Task number; stop without choosing another number if it collides.
- Attribute every pre-existing tracked, staged, and untracked change to completed/reviewed Task scope or an explicit user change before staging anything.
- Create one dedicated release-candidate branch, intentionally commit only the reviewed candidate paths, and push that branch normally.
- Record the candidate commit SHA and verify only that immutable SHA from a clean detached worktree.
- Dispatch `.github/workflows/ci.yml` with `workflow_dispatch` for the candidate branch and directly confirm that these exact-SHA jobs all conclude `success`: six Node 22/24 OS lanes, Ubuntu Node 26 compatibility, packed release, and required aggregate.
- Run `npm test`, `npm run lint`, `npm run format:check`, `npm run pack:check`, `npm run check`, and `npm run release:ci` from the clean candidate worktree.
- Create one real npm tarball from the candidate, record its checksum and exact file list, extract it, and run the current package/plugin/Skill validators plus packed-only checks against extracted bytes.
- Re-run the complete pinned grilling parity comparison and deterministic report without changing the scenario, rubric, thresholds, upstream, model, effort, repetitions, grader, or observed candidate bytes.
- Re-run filesystem hardening; audit deterministic plus read-only/fix model smokes; the guarded direct user/project lifecycle; the isolated marketplace/plugin lifecycle; and all four bounded fresh-session Skill smokes.
- Recheck the npm name read-only and current official plugin/Skill requirements with the `openai-docs` Skill and current local validators.
- Keep normal HOME, `.agents`, normal/configured Codex home, npm userconfig/cache, and credentials out of writable verification state and prove relevant protected state unchanged.
- Prepare exact candidate publication and rollback/deprecation commands for later approval without executing them.

## Out of Scope

- New product features, prompt tuning, evaluator tuning, or fixes for any defect discovered by this gate.
- Editing a completed dependency Task to convert old failed evidence into a pass.
- Direct push to `main`, force-push, tag creation or push, npm publication including dry-run publication commands, GitHub release creation, public plugin submission, merge, or branch-protection changes.
- Writing to normal user HOME, `.agents`, normal/configured Codex state, or normal npm configuration as lifecycle/evaluation state.

## Acceptance Criteria

- [ ] AC-01: `0020` is proven unused locally and remotely, the initial diff is fully attributable, and no ambiguous user change is committed.
- [ ] AC-02: One dedicated branch contains one intentional candidate commit; its exact SHA is recorded, normally pushed, and materialized as a clean detached verification worktree.
- [ ] AC-03: All nine required GitHub Actions jobs conclude `success` for the exact candidate SHA.
- [ ] AC-04: All six requested source commands pass on the exact candidate SHA with executed command evidence.
- [ ] AC-05: One real candidate tarball has a recorded checksum and exact list, and its extracted bytes pass the allowlist, hygiene, legal, CLI, plugin, and four-Skill validators.
- [ ] AC-06: The complete pinned grilling parity run uses identical frozen conditions, retains every run, and passes every frozen gate; any failure is recorded without tuning or selective retry.
- [ ] AC-07: Filesystem hardening evidence passes locally and in exact-SHA hosted native lanes without hidden capability skips.
- [ ] AC-08: Audit deterministic tests plus fresh read-only and exact-fix smokes pass with source-read, mutation, scope, fixture, authentication, and verdict evidence.
- [ ] AC-09: The guarded real-tarball user/project lifecycle and force-preservation branch pass while protected normal state and parent environment remain unchanged.
- [ ] AC-10: The isolated local marketplace lifecycle installs the same tarball, exposes exactly four byte-matching Skills, and removes plugin and marketplace state safely.
- [ ] AC-11: Fresh sessions for grilling, init, task, and audit read their exact packed Skill bytes, satisfy their bounded behavior predicates, and preserve fixture/authentication state.
- [ ] AC-12: Read-only npm probes and current official Codex documentation/validators support the planned package name and packaged plugin/Skill structure; time-sensitive or authentication prerequisites remain explicit.
- [ ] AC-13: Exact publish and rollback/deprecation commands are prepared for the candidate but no forbidden external action is executed.
- [ ] AC-14: Every evidence item names the exact candidate SHA, the final diff/package coverage is reviewed, permanent-document impact is decided, and the sole final result is `READY_FOR_APPROVAL` or `BLOCKED`.

## Plan

- [x] Read the permanent documents, Tasks 0016–0019, their named dependency Tasks, and the explicit implementation dependencies required for attribution and gate design.
- [x] Confirm Task/branch number availability and audit the dirty tree against the Task 0016 snapshot plus Tasks 0017–0019 scopes.
- [x] Create this Task/Test pair together before verification.
- [ ] Validate the candidate diff, stage only reviewed paths, commit on the dedicated branch, push normally, and create a clean detached worktree.
- [ ] Dispatch and inspect the exact-SHA hosted workflow and all nine job conclusions/logs.
- [ ] Run source, real-tarball, extracted-validator, filesystem, lifecycle, marketplace, and audit gates.
- [ ] Run the complete pinned grilling comparison and all four fresh-session Skill smokes under isolated state.
- [ ] Recheck npm name and official requirements, prepare non-executed publish/recovery commands, review final coverage, and set the terminal result.

## Decisions

- This is a verification-only gate. A newly observed defect or failed required check makes the gate `BLOCKED`; it is not repaired or tuned here.
- Task 0017 is currently recorded as `BLOCKED/BLOCKED` despite the request describing Tasks 0017–0019 as completed. Preserve that evidence and treat it as a release risk to be independently rechecked, not as authorization to rewrite Task 0017.
- The candidate commit remains immutable once recorded. Later Task 0020 evidence edits must continue to name that SHA and must never be mistaken for candidate bytes.
- `npm run release:check` is not authorized because it invokes `npm publish --dry-run --json`; `npm run release:ci` plus real pack/extract inspection covers the non-publication gate.
- No production or development dependency is required.

## Risks

- Model-backed parity and Skill behavior are stochastic; the frozen gates, full-cohort rule, retained adverse evidence, and no-selective-retry rule remain authoritative.
- Registry name state and official Codex requirements are time-sensitive and must be rechecked immediately before any later publication.
- Hosted workflow dispatch may target a branch rather than a raw SHA; job evidence must be rejected if `headSha` differs from the recorded candidate.
- Normal Codex sessions/logs can change concurrently; the release-isolation sentinel intentionally distinguishes protected plugin/control state from structural volatile state.
- Final Task evidence necessarily postdates the immutable candidate commit; the clean detached worktree, artifact hashes, and exact-SHA labels are the provenance boundary.

## Discoveries and Changes

- Local Task directories end at `0019`; no `0020-*` directory existed before this pair. Local refs and `git ls-remote --heads origin` contained no `task/0020-*` ref. The dedicated branch is `task/0020-release-readiness-gate`.
- The source branch began at `2a90b1759357d8c42e5e0cc50c212fcca8350a7c` with an empty index and accumulated working-tree work.
- Task 0016's retained local snapshot `c769b6f8ed10f1a4159e468ec1abc97508a50530` contains exactly 78 paths over `2a90b17...`; those paths map to Tasks 0011–0016 and their recorded permanent-document synchronization.
- Comparing actual current file hashes with the `c769b6f...` tree identifies only Task 0016 final evidence plus the declared Tasks 0017–0019 paths. No unexplained tracked, staged, or untracked path remains, so the candidate scope is attributable; the index is still empty.
- Task 0017 remains `BLOCKED/BLOCKED` because config-v10 completed 32 runs/128 turns but retained one kyw CV-06. Tasks 0018 and 0019 are `DONE/PASSED`.
- The `openai-docs` Skill fetched a current Codex manual through its temporary cache. The current manual still requires `.codex-plugin/plugin.json`, keeps `skills/` at plugin root, requires each Skill directory to have `SKILL.md` front matter with `name` and `description`, documents optional `agents/openai.yaml` and `allow_implicit_invocation: false`, repository/user `.agents/skills` discovery, `./`-relative local marketplace paths, and npm plugin acquisition without lifecycle scripts. Candidate validation remains pending.

## Documentation Impact

- SPEC: Expected unchanged; this gate verifies existing requirements and changes no product behavior.
- ARCHITECTURE: Expected unchanged; this gate verifies existing boundaries and changes no component or flow.
- README: Expected unchanged; no setup, command, usage, or publication state changes until an approved publication actually occurs.
- AGENTS: Expected unchanged; repository-wide workflow and completion rules remain accurate.

Update these decisions only if verification discovers that durable truth itself is stale. Do not edit an unaffected permanent document merely to record review.

## Completed

- Read and reconciled the required permanent sources, dependency evidence, current official Codex manual sections, and explicit lifecycle/audit implementation dependencies.
- Proved 0020 availability across local directories, local refs, and remote heads.
- Partitioned the complete dirty tree through the Task 0016 snapshot and Tasks 0017–0019 path sets, with no unexplained user change or staged content.
- Created the dedicated branch and this Task/Test pair before executing release verification.

## Remaining

- Form and push the immutable candidate commit, obtain exact-SHA hosted CI, and run every acceptance gate.
- Record commands, hashes, job identities, model conditions, protected-state evidence, limitations, final coverage, prepared commands, and the terminal result.

## Resume Point

Validate this Task/Test pair and the fully attributed candidate diff, then stage only the reviewed paths. Commit once on `task/0020-release-readiness-gate`, record the resulting SHA, push normally, and perform all checks from a clean detached worktree at that SHA.

## Blockers

- Task 0017's retained terminal state is `BLOCKED/BLOCKED`; the new exact-candidate full parity gate must be evaluated without altering that dependency evidence.
