# TASK 0020 — Release Readiness Gate

## Status

BLOCKED

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

- [x] AC-01: `0020` is proven unused locally and remotely, the initial diff is fully attributable, and no ambiguous user change is committed.
- [x] AC-02: One dedicated branch contains one intentional candidate commit; its exact SHA is recorded, normally pushed, and materialized as a clean detached verification worktree.
- [x] AC-03: All nine required GitHub Actions jobs conclude `success` for the exact candidate SHA.
- [x] AC-04: All six requested source commands pass on the exact candidate SHA with executed command evidence.
- [x] AC-05: One real candidate tarball has a recorded checksum and exact list, and its extracted bytes pass the allowlist, hygiene, legal, CLI, plugin, and four-Skill validators.
- [x] AC-06: The complete pinned grilling parity run uses identical frozen conditions, retains every run, and passes every frozen gate; any failure is recorded without tuning or selective retry.
- [x] AC-07: Filesystem hardening evidence passes locally and in exact-SHA hosted native lanes without hidden capability skips.
- [ ] AC-08: Audit deterministic tests plus fresh read-only and exact-fix smokes pass with source-read, mutation, scope, fixture, authentication, and verdict evidence.
- [x] AC-09: The guarded real-tarball user/project lifecycle and force-preservation branch pass while protected normal state and parent environment remain unchanged.
- [x] AC-10: The isolated local marketplace lifecycle installs the same tarball, exposes exactly four byte-matching Skills, and removes plugin and marketplace state safely.
- [x] AC-11: Fresh sessions for grilling, init, task, and audit read their exact packed Skill bytes, satisfy their bounded behavior predicates, and preserve fixture/authentication state.
- [x] AC-12: Read-only npm probes and current official Codex documentation/validators support the planned package name and packaged plugin/Skill structure; time-sensitive or authentication prerequisites remain explicit.
- [x] AC-13: Exact publish and rollback/deprecation commands are prepared for the candidate but no forbidden external action is executed.
- [x] AC-14: Every evidence item names the exact candidate SHA, the final diff/package coverage is reviewed, permanent-document impact is decided, and the sole final result is `READY_FOR_APPROVAL` or `BLOCKED`.

## Plan

- [x] Read the permanent documents, Tasks 0016–0019, their named dependency Tasks, and the explicit implementation dependencies required for attribution and gate design.
- [x] Confirm Task/branch number availability and audit the dirty tree against the Task 0016 snapshot plus Tasks 0017–0019 scopes.
- [x] Create this Task/Test pair together before verification.
- [x] Validate the candidate diff, stage only reviewed paths, commit on the dedicated branch, push normally, and create a clean detached worktree.
- [x] Dispatch and inspect the exact-SHA hosted workflow and all nine job conclusions/logs.
- [x] Run source, real-tarball, extracted-validator, filesystem, lifecycle, marketplace, and audit gates.
- [x] Run the complete pinned grilling comparison and all four fresh-session Skill smokes under isolated state.
- [x] Recheck npm name and official requirements, prepare non-executed publish/recovery commands, review final coverage, and set the terminal result.

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
- The immutable candidate is `54b9f8207c51cbc22af2d0a1c3faac1f04b09310` on `task/0020-release-readiness-gate`. Its 89-path snapshot passed the Task-pair validator, repository format check, and cached-diff whitespace check before commit; local and remote branch refs match exactly.
- Clean verification worktree `C:\1kyw\5.personal\kyw_dev_task0020_verify_54b9f820` is detached at the exact candidate SHA and began with an empty porcelain status.
- Authorized workflow-dispatch run `29636806057` targeted the exact candidate and concluded `success`. Its six Node 22/24 OS jobs, Ubuntu Node 26 compatibility job, packed-release job, and required aggregate all concluded `success`.
- All six requested source commands passed from the clean detached worktree. The direct suite had 130/130 tests, and `release:ci` reproduced packed SHA-256 `cd85d391687a2a69ed6e20c06f645db63e82f0a8150882d3c40e4217691cd121`.
- The retained real `kyw-dev-0.1.0.tgz` has that same SHA-256, npm SHA-1 `a7e73511054a7f936db0bc66b4161856d52634ca`, 60,140 packed bytes, 232,256 unpacked bytes, and exactly 29 allowlisted files. Archive-path safety, npm metadata/list identity, extracted source-byte identity, legal files, CLI help/version, current official plugin validator, and all four current Skill validators passed. One ad hoc hygiene expression initially misclassified the required nested `skills/kyw-task/scripts/`; the corrected top-level rule found zero forbidden entries and changed no candidate bytes.
- Focused filesystem hardening passed 35/35 locally with seven real Windows junction fixtures and zero skips. Each of the seven exact-SHA hosted Stable lanes logged seven real native fixtures (`dir` on Ubuntu/macOS, `junction` on Windows), zero skips, and `success`.
- Audit deterministic tests passed 16/16. The single read-only model smoke failed with `READONLY_MUTATION_ATTEMPT`: its fixture/tree/Git invariants remained true, and the mutation guard diagnostic rendered `[matched=>]` twice. In that rendering, `matched=` is the field label and `>` is the captured operator; the retained 600-character command previews omit the actual match offset and local quoting context, so they do not establish whether the operator was a harmless quoted literal or executable redirection. Per gate policy it was not fixed or retried. The separate exact-fix smoke passed with Skill-source proof, plan-before-mutation, exact four-path repair scope, authentication-source invariance, and `verdict=PASS`.
- The single full config-v10 grilling comparison `20260718090729697-comparison-e718e167` completed 32 runs/128 turns in 2,631 seconds. Two deterministic reports have identical SHA-256 `ddead7bf5dd9c1df61c5c1f8f75c9ee60216d0f1fb7ad56849e2a5cc3697f04e` and `gateResult=pass`. Independent audit found 288/288 artifacts, all run/tree hashes, 128 parseable JSONL files, zero sensitive findings, zero kyw criticals, aggregate quality delta `+5.9767`, worst scenario delta `-8.1132`, and token ratio `1.3246`; manifest root is `414bf70609268039b221af8e3e0c8bdf7ad673258ee24050f9dd3165ad754cea`.
- The guarded release-isolation runner passed all 11 direct user/project/force-preservation steps and all six marketplace/plugin steps. It used a real tarball with the retained artifact's identical SHA-256, exposed exactly the four expected byte-matching Skills under Codex CLI `0.144.5`, removed isolated state, preserved unknown/unrelated content, and proved protected sentinels plus parent environment unchanged.
- Four separate packed-byte fresh sessions passed with `gpt-5.6-sol`, high effort, ignored normal config/rules, repository-local Skills, and read-only fixtures. Grilling asked one highest-impact question with a recommendation; init selected `adopt`; task split independent outcomes and recommended the first Task; audit read both Skill and reference, reported F-01 through F-04, and ended `BLOCKED`. Every fixture, Git status, and auth source remained unchanged. Final-message hashes are grilling `f18bb063...`, init `0a1ebbfc...`, task `5604410e...`, and audit `449dcb64...`.
- At `2026-07-18T09:33:07Z`, isolated npm probes returned ping 0, `npm view kyw-dev` E404, search exit 0 with exact-name count 0, and unauthenticated `npm whoami` (`ENEEDAUTH`). The name is not reserved and must be rechecked under a separately authorized publication identity.
- The `openai-docs` helper reconfirmed its Codex manual was current. Current official [plugin](https://learn.chatgpt.com/docs/build-plugins) and [Skill](https://learn.chatgpt.com/docs/build-skills) requirements still match the candidate: required `.codex-plugin/plugin.json`; plugin-root `skills/`; `SKILL.md` name/description front matter; optional `agents/openai.yaml`; explicit invocation despite `allow_implicit_invocation: false`; repository `.agents/skills` discovery; safe `./`-relative local marketplace sources; and npm acquisition without lifecycle scripts. Current plugin and four Skill validators passed the extracted package.
- A before/after audit of 2,330 protected `.agents`, Codex auth/config/plugin/Skill, and npm-userconfig records is byte/type identical; the explicit auth copy also remained byte-identical. Final safety reads found zero local/remote tags, zero GitHub releases, zero branch PRs, unchanged `main` at `f5e35fe33ffc0316b22791865423232b9f2da463`, exact candidate remote ref, and exact-SHA CI success. The detached candidate remains clean; the source checkout differs from the candidate only in these two post-candidate Task 0020 evidence files.

## Documentation Impact

- SPEC: Unchanged; this gate verified existing requirements and changed no product behavior.
- ARCHITECTURE: Unchanged; this gate verified existing boundaries and changed no component or flow.
- README: Unchanged; no setup, command, usage, or publication state changed.
- AGENTS: Unchanged; repository-wide workflow and completion rules remain accurate.

Update these decisions only if verification discovers that durable truth itself is stale. Do not edit an unaffected permanent document merely to record review.

## Completed

- Read and reconciled the required permanent sources, dependency evidence, current official Codex manual sections, and explicit lifecycle/audit implementation dependencies.
- Proved 0020 availability across local directories, local refs, and remote heads.
- Partitioned the complete dirty tree through the Task 0016 snapshot and Tasks 0017–0019 path sets, with no unexplained user change or staged content.
- Created the dedicated branch and this Task/Test pair before executing release verification.
- Committed the fully reviewed snapshot once, pushed the dedicated branch normally, verified the exact remote ref, and materialized a clean detached candidate worktree.
- Completed exact-SHA hosted CI, all six source commands, real-tarball extraction/validators, and local plus hosted native filesystem hardening.
- Completed audit deterministic/read-only/fix execution and the complete frozen grilling cohort/report/artifact audit; retained the read-only guard failure without retry or candidate change.
- Completed guarded direct and marketplace lifecycles, all four packed-Skill fresh sessions, isolated registry and current official-requirement checks, protected-state comparison, forbidden-state audit, prepared-command review, and final candidate/package coverage reconciliation.

## Remaining

- No in-scope verification remains. AC-08 failed and cannot be repaired or retried inside this release gate.
- A separately authorized follow-on must correct the audit read-only mutation-grammar defect and reconcile Task 0017's retained terminal state before forming and re-gating another immutable candidate.

## Resume Point

Do not publish, tag, release, merge, or submit candidate `54b9f8207c51cbc22af2d0a1c3faac1f04b09310`. Preserve this gate's failed read-only evidence. If the defect is fixed under a separately authorized Task, form a new immutable candidate and repeat the full release-readiness contract rather than retrying only the failed smoke.

## Blockers

- Task 0017's retained terminal state is `BLOCKED/BLOCKED`; the new exact-candidate full parity gate must be evaluated without altering that dependency evidence.
- Exact-candidate audit read-only smoke failed because the mutation guard reported two `OUTPUT_REDIRECTION_GRAMMAR` attempts whose diagnostics rendered `[matched=>]`, even though fixture tree and Git status were unchanged. That rendering is the `matched=` label followed by a captured `>`; without retained match offsets or quoting context, the original evidence cannot classify either operator as a quoted literal or executable redirection. Gate policy forbids repairing or retrying this defect here.

## Final Result

BLOCKED
