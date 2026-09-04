# TASK 0085 — Add Exact Opt-In Resumable Public Release

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Extend the existing `kyw-deliver` Skill with exact `$kyw-deliver NNNN --public-release` opt-in authority that first completes or revalidates the unchanged `STANDARD` delivery, then safely performs or resumes the fixed npm publication → exact-SHA GitHub tag → GitHub Release sequence, while plain `$kyw-deliver NNNN` remains `STANDARD`-only and implementation or test execution performs no real public mutation.

## Dependencies

- Task 0084.

## In Scope

- Add exactly one allowlisted public-release form, `$kyw-deliver NNNN --public-release`, under the existing explicit-only `kyw-deliver` Skill. Preserve the recognized input and result semantics of plain `$kyw-deliver NNNN`, and keep every other suffix, bare form, Korean alias, natural-language request, implicit invocation, chained call, continuous mode, and background mode non-authoritative.
- Make the opt-in route reuse the sole packaged Task adapter, route-aware dispatcher, production delivery evaluator, hydration, continuity, and command-cache graph. Keep public-release authority distinct from `STANDARD` authority without adding a seventh Skill, second adapter, copied parser/evaluator, alternate `STANDARD` ledger, or production dependency.
- On every fresh or resumed opt-in invocation, reconstruct the selected Task's canonical `STANDARD` state first. Permit no npm, tag, or Release write until the existing graph is `FINAL` at the exact expected-head merge SHA with successful post-main CI; resume unfinished `STANDARD` stages through the existing contract without repeating any completed commit, push, PR creation, CI execution, or merge.
- Freeze and cross-check one exact public-release tuple from repository-owned and canonical remote facts before any public write: Task ID, repository, base branch, target merge SHA and tree, publish workflow ID/name/path/state/ref, package and plugin name/version, package repository, public access, registry URL, expected tarball bytes and digests, derived tag `v<version>`, and deterministic Release metadata.
- Preflight npm registry, matching publication runs, Git tag/ref, and Release-by-tag state together before the first write and immediately before each applicable write. Classify every surface as `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, or `UNKNOWN`; only `ABSENT` may admit its one create action, exact state is read-only satisfied, pending state is observation-only, and conflict or unknown state blocks.
- Reuse the repository-owned manual OIDC `.github/workflows/publish.yml` as the only npm mutation surface. If and only if the exact npm version is absent and no matching, active, completed, failed, or ambiguous prior target run prevents action, dispatch the exact merge SHA/version once, observe that run without rerun, and require its single real-checkout `npm publish . --ignore-scripts` attempt to succeed.
- Treat an already published npm version as satisfied only when cache-bypassed canonical registry data proves the exact package/version/registry, `gitHead` target merge SHA, tarball bytes and integrity/shasum, expected signature and SLSA provenance identity, public access, and `latest` state. Any missing, different, malformed, or unverifiable immutable field is a conflict or unknown state; never republish, unpublish, deprecate, retag, or repair it.
- After npm state is exact, create at most one lightweight `refs/tags/v<version>` ref directly at the target merge SHA. Accept a pre-existing tag only when its direct or peeled target is exactly that SHA; a different object, ambiguous peel, namespace collision, or unreadable state blocks without force, overwrite, delete, or replacement.
- After npm and tag state are exact, create at most one published GitHub Release in the exact repository for that exact tag, with deterministic title `v<version>`, `draft=false`, `prerelease=false`, and no asset upload or later metadata edit. Accept an existing Release only when its repository, tag, tag target, title, flags, and expected asset policy are exact; duplicate, mismatched, draft, prerelease, wrong-target, or unverifiable state blocks.
- Make the public-release state machine monotonic and interruption-safe. On resume, re-read canonical npm and GitHub state, skip every fully proven exact stage, observe any exact in-flight workflow only, and continue at the first absent safe stage. Specifically, npm-success/tag-failure and npm-plus-tag-success/Release-failure states must never repeat npm publication or an exact completed tag creation.
- Limit each externally visible mutator to one request or workflow-contained execution for the authorized attempt: inherited `STANDARD` writes, publication workflow dispatch, workflow-contained npm publish, tag creation, and Release creation. A failed, cancelled, timed-out, lost, or ambiguous response permits only bounded read-only reconciliation; it never grants retry, rerun, fallback, alternate credentials, or a later-stage write.
- Determine terminal success only from fresh cache-bypassed npm registry reads and GitHub API reads of the exact workflow run/attempt, tag ref or peeled commit, and Release-by-tag object. Command exit, dispatch acceptance, workflow prose, CI success, or local state alone cannot prove public completion.
- Keep terminal Task/Test bytes and `STANDARD` continuity state unchanged during public release. Report a failure as a public-release `BLOCKED` disposition with completed stage, exact failed/unknown/conflicting stage, sanitized evidence, recovery condition, and first safe resume point; do not demote an immutable `DONE/PASSED` pair or write mutable public chronology into the pair or permanent documents.
- Never request, print, persist, or include in diagnostics an npm token, GitHub token, OIDC JWT, OTP, authentication URL, cookie, authorization header, credential environment value, or unbounded raw log. Use only the existing noninteractive OIDC and platform-authenticated API boundaries and emit bounded redacted diagnostics.
- Add a separately loadable canonical public-release reference beneath `skills/kyw-deliver/references/` so plain `STANDARD` delivery does not load publication procedure. Synchronize the Skill metadata, plugin prompt, maintainer examples, shared adapter/core contracts, validators, planner, package/direct-install inventory, root/generated instructions, and README/SPEC/ARCHITECTURE ownership projections.
- Add only fixture, mock, injected-client, and owned-loopback tests for public-release behavior. Cover all-absent, all-exact, every partial-success resume, matching active workflow observation, later failed attempt precedence, malformed/ambiguous API data, each npm/tag/Release conflict, out-of-order future state, concurrency/race checks, one-write traces, credential redaction, and zero live npm/GitHub mutations.

## Out of Scope

- Executing a real npm publication, workflow dispatch, tag creation, Release creation or edit, asset upload, dist-tag mutation, public plugin-directory submission, or any other live external write during implementation, tests, verification, or Task completion.
- Selecting or inventing a new package/plugin version, changing `0.1.4` release truth, preparing a release candidate as product state, or authorizing publication of this Task's eventual merge. A later exact public-release invocation may proceed only when its selected Task's delivered merge carries a separately established non-conflicting version.
- Changing plain `$kyw-deliver NNNN` from `STANDARD`-only behavior, adding another public-release spelling, suffix, Skill, alias, provider/backend abstraction, unattended automation, daemon, watcher, generic external-action engine, or another Task delivery-policy value.
- Direct/local token-based `npm publish`, npm login/adduser/whoami/trust or account-settings inspection, interactive OTP/security-key flow, fallback publisher/workflow/registry, reusable credential, or lifecycle-script-dependent publishing.
- Automatic or implicit retry, workflow rerun, second dispatch, second create request, force push, tag force/update, overwrite, Release edit, deletion, unpublish, deprecation, destructive recovery, branch-protection bypass, administrative override, account change, or branch deletion.
- Reopening, editing, renaming, deleting, replacing, reclassifying, or redelivering Task 0084 or another canonically delivered contract-3 pair; changing `STANDARD` evidence schema, dependency satisfaction, continuity checkpoint meaning, contract version 3, or contract-1/2 compatibility.
- Uploading GitHub Release assets, generating or editing release notes after creation, changing unrelated CI behavior, reviving retired release harnesses, making the optional npm dry run mandatory, or unrelated refactoring and cleanup.

## Acceptance Criteria

- [x] AC-01: Exactly `$kyw-deliver NNNN --public-release` activates the new public-release mode; plain `$kyw-deliver NNNN` retains its existing `STANDARD`-only input/result/authority behavior, and every other suffix, alias, implicit, ordinary-language, chained, continuous, or background form grants no public authority.
- [x] AC-02: The public-release mode completes or revalidates the unchanged `STANDARD` lifecycle first and cannot perform any npm, tag, or Release write until the production evaluator proves `FINAL` at the exact expected-head merge SHA with successful post-main CI; completed `STANDARD` stages are never repeated.
- [x] AC-03: Before any public write, one exact tuple binds Task, GitHub repository/base/workflow, package and plugin name/version/repository/access/registry, expected packed bytes and digests, target merge SHA/tree, tag `v<version>`, and deterministic Release metadata; every source and remote mismatch fails closed.
- [x] AC-04: Fresh preflight classifies npm version/run, tag, and Release state as `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, or `UNKNOWN`. Only absent state permits its single create, exact state is skipped, pending state is observed, and conflict/unknown state blocks before avoidable partial publication.
- [x] AC-05: npm mutation uses only one exact manual OIDC workflow dispatch and that workflow's one real-checkout `npm publish . --ignore-scripts` execution. Existing exact or in-flight state is never dispatched/published again; failed or ambiguous runs are not retried, rerun, or replaced, and no token, interactive authentication, fallback, or lifecycle script path exists.
- [x] AC-06: Canonical registry reads after publication or resume prove the exact package/version/registry, target `gitHead`, expected tarball bytes, integrity/shasum, signature and provenance identity, public access, `latest`, and preserved prior-version history; existing conflicting or unverifiable immutable state blocks without republish, unpublish, deprecation, or repair.
- [x] AC-07: Only after exact npm state, the route creates at most one lightweight `v<version>` tag at the target merge SHA. An existing exact direct/peeled target is read-only satisfied, while a different, ambiguous, or unreadable tag blocks without force, overwrite, deletion, or replacement.
- [x] AC-08: Only after exact npm and tag state, the route creates at most one non-draft, non-prerelease GitHub Release titled `v<version>` and attached to that exact tag, with no assets. An existing exact Release is read-only satisfied; duplicate or mismatched repository/tag/target/title/flags/assets state blocks without edit, overwrite, deletion, or alternate Release.
- [x] AC-09: Every invocation and pre-write boundary re-reads canonical remote state and resumes only the first absent safe stage. All-exact is report-only, npm-exact/tag-absent starts at tag, npm-plus-tag-exact/Release-absent starts at Release, and no resume path repeats npm publish, workflow dispatch, tag creation, Release creation, or a completed `STANDARD` write.
- [x] AC-10: Each authorized irreversible mutator executes at most once. Failure, cancellation, timeout, lost response, concurrency, eventual-consistency ambiguity, or malformed evidence permits bounded read-only reconciliation only and returns public-release `BLOCKED` with exact completed stage, blocking classification, sanitized evidence, recovery condition, and resume point while leaving `DONE/PASSED` and `STANDARD` continuity unchanged.
- [x] AC-11: Final success is based on fresh cache-bypassed npm registry state plus GitHub API workflow/run/attempt, tag-ref or peeled SHA, and Release-by-tag state, all bound to the target merge SHA; command success, dispatch acceptance, or logs alone never produce a final claim.
- [x] AC-12: No secret-bearing value or unbounded log can enter prompts, command arguments, fixtures, diagnostics, reports, Task/Test, continuity state, or permanent documents; tests prove redaction for tokens, JWTs, OTPs, auth URLs, cookies, authorization headers, and credential environment data.
- [x] AC-13: One existing Skill, one packaged adapter/dispatcher/evaluator graph, a separate progressively loaded public-release reference, and the canonical npm/GitHub remote ledgers implement the behavior without a seventh Skill, second engine/checkpoint/receipt ledger, new production dependency, delivery-policy/schema change, or Task 0084 mutation; README, SPEC, ARCHITECTURE, AGENTS, generated instructions, plugin/prompts, validators, planner, and package inventory agree.
- [x] AC-14: Fixture/mock/owned-loopback tests cover routing, STANDARD-first gating, every state class and partial-success resume, write-count limits, conflict/ambiguity/failure/concurrency branches, final canonical reads, secret redaction, and the existing `STANDARD`-only regression without any live npm/GitHub write; `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check` all pass.

## Plan

- [x] Freeze Task 0084's canonical pair/delivery identity, current `STANDARD` parser/dispatcher/hydration/continuity behavior, OIDC workflow contract, package inventory, public `0.1.4` state, and permanent-document measurements without mutating them.
- [x] Add failing parser, dispatcher, lifecycle, public-state classifier, ordered-stage, no-repeat, redaction, and fixture/mock cases for the exact opt-in form while pinning plain `$kyw-deliver NNNN` behavior.
- [x] Add the progressively loaded canonical public-release reference and update `kyw-deliver` metadata so the exact route itself supplies the fixed compound authority without a duplicate confirmation or authority leak to other forms.
- [x] Extend the shared parser, queue result contract, adapter, hydration/public-state classifier, and injected npm/GitHub clients to freeze the exact tuple and derive deterministic monotonic stages while keeping `STANDARD` evaluation and continuity independent.
- [x] Reuse and verify the manual OIDC workflow for the one npm stage, then add create-once tag and Release API stages with immediate identity rechecks, bounded reconciliation, no retry/fallback, and sanitized terminal reporting.
- [x] Synchronize README, SPEC, ARCHITECTURE, root/generated AGENTS, `CODEX_PROMPTS.md`, plugin prompt, foundation owner/command/package validators, direct-install inventory, verification planner, and affected behavioral fixtures without changing current public-release facts.
- [x] Run focused fixture/mock suites, pair and transaction validation, the changed-path planner and selected Release-tier checks, then the four required stable commands; retain every failure and later pass honestly.
- [x] Compare the complete final diff with all acceptance rows, verify Task 0084 bytes and `STANDARD` regressions, measure permanent documents, prove zero live external mutation, and terminalize only when scope, evidence, documentation, package inventory, and pair validation agree.

## Decisions

- Keep one Task/Test pair because the exact route, authority split, state machine, shared adapter changes, documentation, and regression proof are one inseparable repository capability; partial delivery would either expose unsafe authority or leave the opt-in unusable.
- Hard-depend only on canonically delivered Task 0084. Historical Tasks 0066, 0067, 0069, 0079, 0081, and 0082 are regression and evidence precedents, not additional hard dependencies.
- Use the exact spelling `$kyw-deliver NNNN --public-release`. It is one fixed compound opt-in for npm publication, exact tag creation, and Release creation after `STANDARD FINAL`; plain `$kyw-deliver NNNN` remains unchanged and no seventh Skill is introduced.
- Treat the exact opt-in invocation as attempt-specific authority for the fixed ordered public-release stages, so aligned execution needs no duplicate kyw confirmation. Any changed Task, repository, version, registry, tag, Release metadata, target SHA, action set, or attempt follows the existing bounded warning/reconfirmation contract.
- Reuse `.github/workflows/publish.yml` as the sole npm write boundary and keep tag/Release creation as distinct create-once GitHub API stages. Do not add direct npm credentials or move hidden tag/Release mutation into CI.
- Derive the lightweight tag and published Release title as `v<version>`; require the Release to be non-draft, non-prerelease, attached to that exact tag, and asset-free. Optional notes or assets are not inferred or mutated.
- Use npm registry, GitHub workflow runs, refs, and Release-by-tag objects as canonical public state. Do not add a repository receipt ledger, second continuity checkpoint, or mutable chronology to the terminal pair; ambiguous state blocks rather than being guessed.
- Interpret public-release `BLOCKED` as the invocation/dispatch disposition and recovery report. The selected repository pair remains immutable `DONE/PASSED` after `STANDARD` delivery.
- Keep package/plugin version `0.1.4` and existing public objects unchanged during this implementation. A later release-candidate Task must establish a non-conflicting version before its own exact public-release invocation can mutate anything.
- Add no production dependency. Use injected clients, fixtures, and an owned loopback registry only for deterministic test coverage.

## Risks

- A parser or authority-shape change could accidentally make plain `$kyw-deliver NNNN` publish, accept arbitrary suffixes, or expose public mutation through implementation aliases.
- Entering publication before the canonical merge and post-main graph is final could publish unmerged or unverified bytes or repeat inherited `STANDARD` writes.
- The current public `kyw-dev@0.1.4`, `v0.1.4` tag, and Release point to an older delivered source. Publishing this feature's later merge without a separately prepared version must be detected as conflict, not treated as resume.
- npm publication can succeed before a GitHub tag or Release fails. Incorrect stage reconstruction could republish an immutable version or create a second tag/Release on resume.
- A lost or ambiguous API response, delayed workflow visibility, registry caching, or concurrent invocation can obscure whether a write occurred. Every uncertain case must stay read-only and blocked until canonical state proves an exact result.
- Existing npm metadata can share a version while differing in `gitHead`, tarball bytes, integrity, signature, provenance, access, or dist-tag state; a shallow version-only check would misclassify conflict as success.
- Annotated/lightweight tag shape, peeling, namespace collisions, or a Release whose tag looks right but resolves elsewhere can hide a wrong target.
- Command output or failure logs can leak tokens, JWTs, OTP/auth URLs, cookies, headers, or credential-bearing environment data unless sanitization happens before diagnostics and fixtures.
- Adding a public-release reference or cohesive core module changes direct-install and packed-file inventories; a stale validator could omit runtime bytes or duplicate the engine.
- SPEC has very little remaining hard-budget headroom and AGENTS must stay thin. Durable wording must replace or absorb existing blanket publication prohibitions, not merely append a duplicate procedure or raise budgets without separately authorized policy change.

## Discoveries and Changes

- Task 0084 is contract 3 `DONE/PASSED` and canonically `STANDARD`-delivered by PR 71 at merge SHA `dc0f9ffcc69aa143755b69b01ae05b452ac0e4c6` with successful exact-head and post-main CI. Its Task/Test bytes are immutable and this correction therefore requires the explicit hard dependency.
- Local/cached `main` is stale while GitHub `main` contains Task 0084's merge. Authoring must not fetch or rewrite refs; later implementation must use the existing safe alignment and dispatcher preflight.
- The current parser recognizes only exact plain `$kyw-deliver NNNN` and intentionally rejects all suffixes. The queue exposes `STANDARD_DELIVERY` authority, and the Skill/reference/foundation validator explicitly forbid publication.
- The current manual OIDC workflow already verifies exact repository/main SHA/version/registry identity, rejects lifecycle scripts and credentials, and contains exactly one `npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/` command with no retry or fallback.
- Historical Tasks 0066 and 0069 prove that workflow success alone is insufficient: final registry `gitHead`, bytes/digests, signature, provenance, and dist-tag state must be read canonically, and conflicting immutable publication cannot be repaired by repetition.
- Current `kyw-dev@0.1.4` plus `v0.1.4` and its GitHub Release already exist for an older exact source. This implementation keeps them unchanged and supplies behavior for a later selected Task whose delivered merge has a separately established version.
- The smallest conforming design is one new allowlisted mode and a separate progressively loaded publication reference over the existing adapter/core graph; no unresolved user-owned decision or production dependency is known.
- Task transaction inspection reports `NONE / NO_TRANSACTION_EVIDENCE`, and the next allocation is the unreused maximum-plus-one ID.
- The exact implementation baseline is aligned `main` merge `dc0f9ffcc69aa143755b69b01ae05b452ac0e4c6`; Task 0084's canonical pair blobs are `bda9850ab1fb2bc7d0177ad69a32703c366c6251` / `43070fbcd4b18f028027b4e034d7277bd406071d`, the existing parser recognizes only plain delivery, and the workflow remains active as ID `323508270` at `.github/workflows/publish.yml`.
- Cache-bypassed public reads freeze the conflicting `0.1.4` baseline: npm `gitHead` and lightweight `v0.1.4` both target `8e5d1c43c69314e941e35e6835ae36a6cb40c981`; the 135,958-byte tarball has SHA-1 `9b3e2beda81b0ad81c9c72ea94b29520c83216dc`, SHA-256 `c01513dd903ea3254284a1438ecd808d1defe469e1dd61cfa8e3cdacc322c632`, one registry signature, and SLSA provenance for the exact publish workflow, while the asset-free published Release title is `kyw-dev 0.1.4`, not the future deterministic `v0.1.4` contract.
- Baseline permanent documents measure README 17,562 bytes / 223 lines, AGENTS 4,083 / 41, SPEC 49,081 / 476, and ARCHITECTURE 44,568 / 881; combined they are 115,294 bytes / 1,621 lines, so SPEC and AGENTS changes must replace or compact existing wording.
- The trusted workflow now binds ten immutable dispatch inputs and an exact source contract with normalized SHA-256 `0342dd6ce165b80f4dffa343b2e014d10adece67db23c94fbc7be44f507600ee`; exact `publishConfig`, bounded pack/history, canonical signing-key SPKI, first-attempt run, tag, and Release absence are rechecked before its sole publish.
- Production hydration pins GitHub access, archives and packs the delivered tree, freezes terminal pair/continuity blobs and modes, and rejects malformed pagination, IDs, dependency controls, registry signatures, DSSE/SLSA statements, provenance, refs, Releases, and source/workflow drift.
- Create limits are invocation-local rather than a distributed lock. Concurrent or lost responses reconcile read-only and block on ambiguity; a separate trusted writer can still race tag state before Release creation, but fresh final proof detects the drift.

## Documentation Impact

- SPEC: Replace blanket no-suffix/no-publication behavior with the exact opt-in authority, STANDARD-first gate, remote-state classifications, one-attempt/idempotent resume contract, secret safety, final canonical proof, and updated acceptance while retaining every non-opted-in prohibition.
- ARCHITECTURE: Add the public-release control/data flow, canonical npm/GitHub state boundaries, shared classifier/orchestration dependency direction, progressive reference loading, and failure/resume reporting without changing STANDARD evaluator/continuity semantics.
- README: Document the second exact kyw-deliver form, fixed npm→tag→Release outcome, prerequisites, STANDARD-only compatibility, resume/block behavior, and the fact that implementation/tests never authorize a live release.
- AGENTS: Compactly add the exact public-release route and its separate authority/one-attempt boundaries to root and generated instructions while keeping all other publication, retry, force, destructive, bypass, account, deletion, and unrelated mutations explicit-only or forbidden.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded and reconciled the applicable repository instructions, Task 0085 pair, Task 0084 dependency pair, and all four permanent documents; no unresolved baseline conflict or user-owned decision remains.
- Validated the Task 0085 pair and empty Task transaction state, separated its authored untracked pair from all other work, and safely fast-forwarded local/cached `main` to exact remote merge `dc0f9ffcc69aa143755b69b01ae05b452ac0e4c6`.
- Ran the sole production dispatcher with exact invocation `$kyw-impl 0085` and closed `NO_TASK_OVERRIDE` preflight; it selected `IMPLEMENT` after freshly evaluator-satisfying Task 0084 as `HARDENED_EXACT_HEAD` without retry or external mutation.
- Created `task/0085-add-exact-opt-in-resumable-public-release` from exact aligned `main`; Task 0084 remains the one freshly proven uncovered predecessor and no continuity transition was applied by the implementation route.
- Froze the immutable Task 0084, parser/dispatcher/hydration, workflow, package, public `0.1.4`, and permanent-document baselines before production behavior changes; all reads were bounded and no public mutation occurred.
- Added exact public-release routing, tuple/state classification, create-once orchestration, production npm/GitHub hydration and clients, bounded redaction, and the progressively loaded release procedure without changing plain `STANDARD` delivery or adding a dependency.
- Hardened the manual OIDC workflow to one ten-input, first-attempt, exact-checkout publication boundary and synchronized its byte contract with source, validation, mocks, and mutation guards.
- Synchronized all permanent and generated instruction surfaces, package/direct-install inventory, validators, planner routing, prompts, and regression fixtures; final permanent-document measurements remain within governed hard limits with explicit delta evidence.
- Completed independent fail-closed review and focused public/adapter/workflow verification; all discovered signature, provenance, remote-tree, package-control, ambiguity, and prewrite gaps were fixed with hostile fixtures, and Task 0084 remained byte-identical.
- Completed the final post-hardening Release composite and explicit stable commands: 477 tests with 473 passing, zero failures, and four expected skips; lint passed 85 JavaScript modules, format passed 382 text files, and pack passed 48 files / 197,194 bytes.

## Remaining

- None — implementation, documentation, verification, and terminal evidence are complete.

## Resume Point

- None — implementation, documentation, verification, and terminal evidence are complete. The next separately authorized step is exact STANDARD delivery with `$kyw-deliver 0085`; public release is not inferred, and no live public write was performed.

## Blockers

- Not applicable — no blocker or unresolved user-owned decision is known.
