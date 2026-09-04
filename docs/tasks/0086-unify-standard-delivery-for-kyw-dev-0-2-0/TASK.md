# TASK 0086 — Unify STANDARD Delivery for kyw-dev 0.2.0

<!-- kyw-task-contract: 4 -->

## Status

DONE

## Goal

Make exact `$kyw-deliver NNNN` the sole user-authorized `STANDARD` delivery command: it completes or resumes the hardened commit → non-force push → non-draft PR → actual-head and synthetic-merge CI → expected-head merge → post-main CI graph, then continues in the same invocation without a suffix or extra confirmation through npm public publication → exact-merge-SHA Git tag → GitHub Release; retire `--public-release`, establish explicit preterminal release-version contracts, and prepare this Task as `kyw-dev@0.2.0` without any live public write during implementation or verification.

## Dependencies

- Task 0085.

## In Scope

- Recognize only exact `$kyw-deliver NNNN` as the user-facing `STANDARD` delivery route. Make exact `$kyw-deliver NNNN --public-release` and every other suffix, bare form, Korean/managed alias, ordinary-language request, implicit invocation, chained call, continuous mode, and background form unsupported and non-authoritative.
- Preserve the existing `HARDENED_EXACT_HEAD` commit, non-force push, non-draft PR, actual PR-head CI, synthetic merge compatibility, review and mergeability inspection, ordinary expected-head merge, and post-main exact-SHA CI stages. After they become or remain `FINAL`, continue directly into the public stages in the same exact invocation without stopping for another command or confirmation.
- Reconstruct every invocation from canonical local, GitHub, and npm state; resume at the first unfinished safe stage and skip every completed `STANDARD`, npm, tag, and Release stage. A fully completed release is immutable report-only.
- Introduce repository-neutral Task contract 4 as the cutover for release-bearing `STANDARD` work. Its canonical Delivery section must contain exactly one explicit stable SemVer release version, while `NONE` remains reasoned and version-free; migrate only this still-mutable cutover pair to contract 4 before terminal state and keep contract 1–3 readers and all terminal historical bytes compatible.
- Keep versionless contract 1–3 `STANDARD` pairs on their historical plain-command GitHub `STANDARD` delivery/report-only semantics. They must never infer a package-manifest version or enter npm, tag, or Release stages, and the retired suffix remains unsupported for every contract.
- Require newly authored `STANDARD` Tasks to settle a user-selected non-conflicting release version before `READY/READY` publication and require implementation to revalidate the same version before `DONE/PASSED` against canonical npm version/history, matching publication attempts, the tag namespace, Release-by-tag, package/plugin agreement, and duplicate version claims in the current Task queue. If no version is selected, authoring asks one version decision and does not publish a pair; if the fixed version becomes occupied or ambiguous, block instead of inventing, incrementing, or silently replacing it.
- Fix this Task's release version at `0.2.0`. Update `package.json`, `.codex-plugin/plugin.json`, CLI `--version` behavior, foundation constants, direct-install ownership metadata projections, package and plugin assertions, and every other repository version source that derives from package truth; replace pinned public install examples with state-safe canonical `latest`/query guidance, preserve historical release evidence as historical, and advance synthetic installer upgrade fixtures to `0.3.0` when current-version assertions become `0.2.0` rather than collapsing their version transition.
- Make durable version wording distinguish repository-selected version from mutable canonical registry state so README and SPEC remain truthful before and after the later delivery. Preserve verified `0.1.4` history without continuing to present it as immutable current `latest` after `0.2.0` can be published.
- Feed the immutable release version from the terminal Task contract into the existing frozen public tuple and cross-check it against exact delivered-tree package/plugin metadata. Delivery may validate and consume the version but must never select, increment, edit, or commit it.
- Preserve Task 0085's `STANDARD`-first gate, frozen Task/repository/base/workflow/package/plugin/registry/tarball/merge/tag/Release tuple, five-state whole-surface preflight, fresh pre-write rechecks, canonical npm/GitHub final proof, and unchanged terminal pair/continuity boundaries.
- Keep the repository-owned manual OIDC workflow as the sole npm write boundary, with one exact workflow dispatch and one real-checkout `npm publish . --ignore-scripts` execution only after exact `STANDARD FINAL`. Keep direct/token/interactive publication, alternate credentials, and another publisher path absent.
- After exact npm proof, create at most one lightweight `v0.2.0` tag at the exact merge SHA; after exact npm and tag proof, create at most one asset-free, non-draft, non-prerelease GitHub Release for that exact tag. Retain deterministic Release metadata and exact-SHA proof.
- Preserve monotonic interruption-safe resume, completed-stage skip, per-mutator one-request limits, bounded read-only reconciliation after uncertainty, and fail-closed `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, and `UNKNOWN` classifications. No failure grants retry, rerun, fallback, force, edit, delete, repair, or a later-stage write.
- Preserve recursive secret redaction and bounded diagnostics for tokens, JWTs, OTPs, authentication URLs, cookies, authorization headers, credential environment values, API bodies, and logs.
- Reuse the existing six-Skill inventory, sole packaged Task adapter, dispatcher, evaluator, hydration, continuity, command-cache, public classifier/orchestrator, installer runtime projection, and canonical npm/GitHub ledgers. Keep the internal public-release reference progressively loaded after `STANDARD FINAL` without exposing its retired suffix as another user authority.
- Complete the selected `DELIVER` adapter call by passing hydration's prepared predecessor state directly in memory through the existing validated atomic continuity apply path before returning. Invoke the dispatcher exactly once, apply zero or one time, expose no continuity payload or manual apply subcommand, and fail closed before every later mutation if apply fails or is uncertain.
- Exercise that behavior through the actual packed and installed adapter with injected deterministic collaborators, including success, no-preparation, and apply-failure traces that issue zero live GitHub/npm mutations and preserve checkpoint bytes on failure.
- Synchronize README, SPEC, ARCHITECTURE, root and generated AGENTS, `CODEX_PROMPTS.md`, kyw Skill/reference metadata, adapter/core and installer projections, canonical Task/Test templates, validators, planner, package inventory, behavioral fixtures, and focused regressions with the one-command contract.
- Use only deterministic fixtures, injected clients, mocks, and owned loopback endpoints for implementation and test coverage. Prove that authoring, implementation, tests, candidates, CI, and terminalization issue zero live npm publication, workflow dispatch, tag creation, or GitHub Release creation.

## Out of Scope

- Performing the actual npm publication, publication-workflow dispatch, Git tag creation, or GitHub Release creation during Task authoring, implementation, tests, candidate generation, verification, or `DONE/PASSED` terminalization. The first live public mutation remains reserved for the later exact plain `$kyw-deliver NNNN` invocation.
- Keeping `$kyw-deliver NNNN --public-release` as a compatibility alias, deprecation path, hidden authority, or second route; adding another suffix, user-visible Skill, delivery-policy value, provider abstraction, daemon, watcher, automatic chain across invocations, or background worker.
- Selecting a version during delivery, automatically incrementing `0.2.0`, falling back to another version if it conflicts, changing semantic-version policy beyond the explicit `STANDARD` release-version contract, or publishing a prerelease or alternate dist-tag.
- Changing the GitHub repository visibility, npm/package/plugin private or public settings, `publishConfig` access or registry, account ownership, credentials, Trusted Publisher registration, environment permissions, branch protection, rulesets, required reviews, or administrative/bypass configuration.
- Direct or local token-based `npm publish`, npm login/adduser/whoami/trust/account inspection, interactive OTP or security-key flow, reusable credentials, lifecycle-script publication, another registry, plugin-directory submission, or Release asset upload.
- Retrying or rerunning a failed workflow or request; force push; base direct push; squash/rebase/auto-merge; tag force/update/replacement; Release edit/replacement; dist-tag repair; unpublish; deprecation; deletion; branch deletion; destructive recovery; fallback credentials; or protection/admin bypass.
- Reopening, editing, renaming, deleting, replacing, reclassifying, or redelivering Task 0085 or another delivered pair; changing its canonical frozen tuple, delivery graph, continuity meaning, or public proof.
- Replacing canonical npm and GitHub state with a repository receipt ledger, second checkpoint, user-supplied tuple/evidence, mutable public chronology in Task/Test, or CI/command/log success as final proof.
- Adding an abstraction, state store, checkpoint, dependency, alternate apply path, or broader delivery-pipeline redesign for the pre-delivery correction.
- Unrelated CI, installer, Task runtime, documentation, or package refactoring that is not required for the single-command cutover, version contract, `0.2.0` synchronization, or regression coverage.

## Acceptance Criteria

- [x] AC-01: Only exact `$kyw-deliver NNNN` is a recognized delivery route; for an eligible contract-4 `STANDARD` pair it authorizes both delivery and public release, while exact `--public-release` and every suffix, alias, prose, implicit, chained, continuous, or background form are unsupported, authorize no mutation, and report only the supported plain form.
- [x] AC-02: One plain invocation completes or resumes the existing exact-path commit → non-force push → non-draft PR → actual-head/synthetic CI → review/mergeability → expected-head merge → post-main CI sequence and, after exact `FINAL`, continues without another prompt or invocation through npm → exact-merge-SHA tag → GitHub Release.
- [x] AC-03: Contract 4 and the canonical templates require one exact stable SemVer release version for every newly authored `STANDARD` pair before `READY/READY` and `DONE/PASSED`, reject missing/malformed/duplicate/conflicting or package-mismatched versions, keep reasoned `NONE` version-free, preserve immutable-terminal handling for both contracts 3 and 4, and keep versionless contract 1–3 plain delivery GitHub-only/report-only without rewriting history or entering public stages.
- [x] AC-04: This still-mutable pair reaches terminal contract 4 with release version `0.2.0`, and package, plugin, CLI, foundation, installer metadata, package contents, tests, README, and SPEC agree on repository version `0.2.0` while retaining accurate historical `0.1.4` release facts and state-safe public-install guidance.
- [x] AC-05: Authoring and implementation perform fresh read-only non-conflict checks for the fixed version across npm version/history, matching publication attempts, tag namespace, Release-by-tag, package/plugin truth, and current-queue duplicate claims; a missing user-selected version blocks authoring, and delivery freezes and consumes the exact Task-owned version without selecting, incrementing, editing, committing, or substituting it.
- [x] AC-06: The sole plain route preserves `STANDARD FINAL` as a strict public-write gate and retains Task 0085's complete frozen tuple, fresh whole-surface five-state preflight before the first and every later write, ordered prerequisites, canonical ledgers, and unchanged terminal pair and continuity bytes; GitHub exact-SHA state remains the `STANDARD` continuity and hard-dependency ledger, while public completion is a mandatory same-route post-`FINAL` result that is not persisted into the pair, checkpoint, or permanent documents.
- [x] AC-07: npm mutation remains one manual OIDC workflow dispatch and one exact real-checkout directory publish; exact npm proof precedes one lightweight tag at the merge SHA, and exact npm plus tag proof precedes one deterministic asset-free, non-draft, non-prerelease GitHub Release.
- [x] AC-08: Fresh and resumed invocations reconstruct state, skip exact completed stages, observe pending proof, and resume only the first absent safe stage. Each inherited `STANDARD` write, workflow dispatch, workflow-contained publish, tag create, and Release create occurs at most once per authorized attempt.
- [x] AC-09: Failure, cancellation, timeout, lost response, malformed or partial data, concurrency, conflict, or unknown state permits bounded read-only reconciliation only and blocks without retry, rerun, fallback, force, edit, delete, repair, alternate credentials, or a later-stage write.
- [x] AC-10: `COMPLETE` derives only from fresh cache-bypassed canonical npm metadata/tarball/signature/provenance/history plus exact workflow attempt, tag target, Release-by-tag, merge SHA/tree, and unchanged `STANDARD FINAL` proof; command exit, dispatch acceptance, CI prose, cached data, or logs never substitute.
- [x] AC-11: Secret-bearing values and unbounded external output cannot enter arguments, prompts, fixtures, diagnostics, reports, Task/Test, continuity, or permanent documents; all permitted diagnostics are recursively redacted, allowlisted, and bounded.
- [x] AC-12: Task 0085 and every delivered pair remain byte/path/mode/identity immutable, all prior contracts stay readable, and repository visibility, package/plugin public/private settings, registry/access, accounts, permissions, Trusted Publisher configuration, branch protection, rulesets, and review requirements remain unchanged.
- [x] AC-13: One existing `kyw-deliver` Skill, its two progressively loaded references, one packaged adapter/core graph, one continuity checkpoint, existing OIDC workflow, and canonical remote ledgers implement the cutover; README, SPEC, ARCHITECTURE, AGENTS, generated instructions, prompts, installer/package projections, validators, and planner agree without a seventh Skill, duplicate engine, new production dependency, or alternate ledger.
- [x] AC-14: Fixture/mock/owned-loopback coverage proves routing, same-invocation transition, mandatory release-version handling, `0.2.0` truth, all five public states, partial-success resume, completed-stage skip, one-write limits, conflicts/ambiguity, canonical final proof, redaction, immutable history, and zero live public writes; focused checks, `npm run release:ci`, and all four stable commands pass.
- [x] AC-15: Implementation finishes with no live npm/tag/Release mutation and hands off exactly one next public action, `$kyw-deliver 0086`; only that later plain invocation may actually publish `kyw-dev@0.2.0` and create its exact tag and GitHub Release.
- [x] AC-16: One exact delivery adapter execution invokes the dispatcher exactly once and applies hydration's prepared predecessor continuity through the existing atomic path zero or one time before exposing `DELIVER`; result/stdout contains no opaque token, prepared state, or manual apply guidance, and apply failure returns no successful selection while preserving checkpoint bytes and an empty commit/push/PR/merge/npm/tag/Release mutation trace in unit and actual packed-install regressions.

## Plan

- [x] Capture immutable Task 0085 pair/delivery identities, current route/parser/dispatcher/public-core behavior, version projections, workflow bytes, remote `0.2.0` absence, permanent-document measurements, and zero-live-write baselines.
- [x] Add failing route, same-invocation, version-contract, terminal-gate, package-version, compatibility, resume, failure, redaction, configuration-preservation, and no-live-write tests before production behavior changes.
- [x] Add contract 4 support and canonical Task/Test templates, migrate only this still-mutable cutover pair, and update authoring/implementation validation so `STANDARD` Tasks carry a settled non-conflicting release version while prior contracts remain compatible.
- [x] Rewire the existing plain delivery parser, dispatcher, Skill, references, and packaged adapter so one exact invocation crosses `STANDARD FINAL` into the existing public-release core; reject `--public-release` and every alternate user route before mutation.
- [x] Bind the Task-owned release version into hydration and the frozen tuple, preserve five-state classification and canonical proof, and enforce delivery-side read-only version consumption plus all ordered one-write and no-retry boundaries.
- [x] Bump and synchronize package/plugin/current installer and foundation version truth to `0.2.0` without changing public/private, registry, publisher, permission, protection, or dependency boundaries.
- [x] Replace or absorb old two-route and mutable-latest wording across permanent owners, generated instructions, prompts, metadata, validators, planner, and behavioral fixtures while preserving historical facts and document budgets.
- [x] Run focused routing/runtime/public-release/contract/installer/documentation suites, direct behavioral fixtures, the changed-path Release plan, `npm run release:ci`, and the four required stable commands without invoking a live deliver route.
- [x] Compare the complete final diff to every acceptance and regression row, prove Task 0085 and delivered history unchanged, record permanent-document deltas and all failures/limits, validate the migrated pair, and terminalize only with fresh `0.2.0` non-conflict and zero-live-write evidence.
- [x] Correct the still-undelivered Task 0086 adapter handoff in place, add direct-memory and packed-install regressions, rerun all required verification, refresh evidence, and terminalize the same pair before any external write.

## Decisions

- Keep one Task/Test pair because the sole-route cutover, mandatory version contract, `0.2.0` projection, shared runtime change, documentation, and regression evidence must become usable together; splitting them would leave either an unsafe authority gap or an undeliverable intermediate release.
- Hard-depend only on Task 0085. It owns the public-release machinery and canonical safety invariants being corrected; earlier release and STANDARD Tasks remain regression precedents rather than additional hard dependencies.
- Use exact plain `$kyw-deliver NNNN` as the only user authority. The internal `public-release` adapter/core naming and separate reference may remain implementation details, but they cannot parse, advertise, or imply a second user-facing route.
- Introduce contract 4 rather than retroactively requiring a release-version field from contract 3. Migrate this pair only while it is nonterminal; contracts 3 and 4 share immutable-terminal delivery binding, while delivered contract-3 bytes and contract 1–3 compatibility remain untouched.
- Keep versionless contract 1–3 `STANDARD` pairs on their existing plain-command GitHub delivery or immutable report-only path. The new route never infers their manifest version and the unsupported suffix cannot revive their former public opt-in.
- Keep GitHub exact-SHA `STANDARD` state as the rolling continuity and hard-dependency satisfaction boundary. For contract 4, npm/tag/Release is a mandatory same-invocation post-`FINAL` result, but it creates no pair/checkpoint/permanent-document chronology and does not redefine historical dependency satisfaction after `latest` advances.
- Canonical contract 4 `STANDARD` Delivery uses one `Release version` stable-SemVer field in addition to its requirement and external-ledger declaration. Authoring settles it; implementation freshly revalidates it and synchronizes package/plugin truth; delivery consumes it as immutable input.
- Fix the release version at `0.2.0`. If fresh canonical state contradicts its non-conflict status, block and request a separately bounded correction instead of choosing another version.
- Keep `public-release.md` as the progressively loaded internal owner of npm/tag/Release procedure. The plain route loads it only after the shared `STANDARD` graph is final, which retains context separation without retaining the retired suffix.
- Preserve one manual OIDC workflow for npm and the existing create-once GitHub ref/Release clients. Do not move tag or Release mutation into CI and do not add a token or local-publish branch.
- Treat remote registry/run/tag/Release state as canonical mutable publication truth. Permanent documents state stable version ownership and how to query/install current public bytes without requiring a post-release repository edit or embedding mutable delivery chronology.
- Record public failure as a bounded invocation disposition while the repository pair remains immutable `DONE/PASSED`; no public result edits Task/Test or continuity.
- Keep the legacy low-level token parser available only for core compatibility, but remove token construction/output and the manual apply command from the packaged adapter; the adapter passes the prepared object directly into the same validator and atomic writer.

## Risks

- Accepting the old suffix or stopping the plain route at `STANDARD FINAL` would preserve two authority paths or require an unauthorized second invocation.
- Changing current contract 3 in place would invalidate or tempt rewrites of delivered pairs; an incomplete contract-4 compatibility boundary could instead make old queues unreadable.
- A Task release version that is syntactically present but not registry-safe, not newer, or mismatched with package/plugin bytes could publish the wrong version or fail after merge.
- Version truth can be temporarily different in the repository and public registry before delivery. Static `latest` claims or pinned unavailable install examples could become false before or after publication unless wording is state-safe.
- npm publication can succeed before tag or Release failure. Incorrect reconstruction could republish `0.2.0` or recreate an exact completed stage.
- A suffix parser, dispatcher action, or adapter command accidentally left reachable could bypass the single-command rule even if documentation appears correct.
- A lost or concurrent remote response can obscure whether a write happened; treating ambiguity as absence would violate one-write limits.
- Refactoring the public core while changing routing could weaken tuple fields, attempt precedence, provenance verification, or secret redaction inherited from Task 0085.
- Version and contract changes affect package selection, direct-install runtime copies, foundation constants, templates, planner mapping, and many fixture assumptions; one stale projection could produce divergent installed behavior.
- SPEC and AGENTS are near governed growth thresholds, so durable wording must replace obsolete two-route/current-latest text rather than append duplicate procedure or raise budgets.
- Live credentials, authorization, API latency, and eventual consistency cannot be proven by fixtures; unavailable or ambiguous live proof must remain `BLOCKED` without configuration changes or fallback.
- Returning `SELECTED/DELIVER` before continuity apply settles could authorize downstream Git/GitHub/public mutation after a failed local state transition; the adapter must await apply and propagate failure without a success result.

## Discoveries and Changes

- Task 0085 is contract 3 `DONE/PASSED` and canonically delivered, so its pair is immutable and this correction must use a hard-dependent follow-up.
- Current source behavior deliberately splits authority: plain `$kyw-deliver NNNN` stops at `STANDARD`, while exact `--public-release` enters the shared public core after `FINAL`.
- The public core already implements the required frozen tuple, five-state preflight, OIDC-only npm publication, exact-SHA tag and Release, canonical proof, monotonic resume, completed-stage skip, one-write limits, and redaction; the correction should rewire authority without weakening those invariants.
- Current package and plugin truth is `0.1.4`. Read-only inspection found public npm versions `0.1.0` through `0.1.4` with `latest=0.1.4` and no `0.2.0` package, matching publication run, remote `v0.2.0` tag, or GitHub Release.
- The current canonical marker is contract 3 and its Delivery parser has no release-version field. A new contract revision is the repository-neutral way to require versions prospectively without Task-ID exceptions or historical mutation.
- The sole adapter/core and direct-install inventory already project the public-release module and reference; no second engine, seventh Skill, provider layer, or production dependency is needed.
- Task transaction inspection reports no transaction evidence, and no unresolved user-owned decision or blocker remains.
- Fresh pre-delivery inspection confirmed Task 0086 has no remote branch, PR, CI, npm `0.2.0`, `v0.2.0` tag, Release, or matching publication attempt; the local adapter nevertheless exposed a prepared predecessor checkpoint as an opaque token and delegated application to a second manual command.
- The existing apply function already owns queue/terminal-pair/branch/main/ancestry/CAS/locking/idempotence checks, so the correction needs only a direct prepared-state input and one awaited adapter call rather than a new subsystem.

## Documentation Impact

- SPEC: Replace the two-route contract with one plain end-to-end `STANDARD` route, define mandatory prospective release-version behavior and contract compatibility, preserve public safety/proof semantics, state durable version/publication truth without stale mutable `latest` claims, and require the one-call automatic continuity apply to fail closed before selection.
- ARCHITECTURE: Update route, contract-version, Task/Delivery data flow, progressive reference loading, frozen-version input, external ledgers, direct in-memory continuity handoff, and same-invocation control flow while retaining one adapter/core, continuity isolation, and OIDC/tag/Release boundaries.
- README: Show only the plain exact command, its same-invocation GitHub→npm→tag→Release outcome and resume behavior, `0.2.0` source/plugin/install truth, unsupported suffix, no-extra-confirmation rule, and state-safe public installation guidance.
- AGENTS: Compactly project the sole exact route, preterminal release-version requirement, delivery-side version immutability, implementation/test no-write boundary, and unchanged safety/immutability rules into root and generated instructions.

## Delivery

- Requirement: STANDARD
- Release version: 0.2.0
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded and reconciled the Task/Test contract, Task 0085 dependency, all four permanent owners, and the exact user clarification that plain `$kyw-deliver NNNN` is the sole end-to-end release authority.
- Captured and preserved Task 0085's immutable pair blobs/modes, all 169 historical pair paths, the public workflow boundary, version projections, and permanent-document baselines.
- Added contract 4 release-version ownership and compatibility, requiring stable SemVer for prospective `STANDARD` pairs while preserving contract 1–3 readers and versionless historical GitHub-only/report-only delivery.
- Rewired the existing parser, dispatcher, adapter, hydration, and progressive references so exact plain delivery crosses `STANDARD FINAL` into the existing npm → tag → Release state machine; the retired suffix and every alternate form remain unsupported.
- Bound Task-owned release version `0.2.0` into the frozen public tuple and synchronized package, plugin, CLI, foundation, installer, package inventory, templates, validators, planner, prompts, and permanent-document truth without a new Skill, dependency, engine, or ledger.
- Preserved OIDC-only publication, five-state preflight, exact canonical proof, monotonic resume, completed-stage skip, one-request limits, recursive redaction, and no-retry/fallback/force/edit/delete rules with fixture/mock/owned-loopback coverage only.
- Completed focused correction verification with 216 tests / 212 passing / zero failures / four expected environment skips, then completed `npm run release:ci` and standalone stable verification with 490 tests / 486 passing / zero failures / four expected environment skips; lint passed 85 modules, format passed 384 files, and pack passed 48 files / 200,256 bytes with candidate SHA-256 `235d882dd97972441db4aa0bfbb366c64cef28d42368331d3767bbb312e33073`.
- Fresh read-only proof at `2026-09-04T09:45:19Z` found npm versions `0.1.0`–`0.1.4` with `latest=0.1.4` and no `0.2.0` package, `v0.2.0` tag, or GitHub Release; the only three publication runs remain exact historical `0.1.2`–`0.1.4` attempts and no `0.2.0` attempt exists. No live dispatch, publish, tag, Release, or ref mutation occurred.
- Reopened the still-undelivered pair as `IN_PROGRESS/RUNNING`, removed the adapter's token/manual-command handoff, passed the in-memory prepared state directly into the existing atomic apply path, and added unit plus actual npm-pack/install regression coverage for prepared `1/1`, no-preparation `1/0`, mismatched selection `1/0`, and default installed-core failure with no result, exact checkpoint preservation, and zero downstream mutation trace.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no blocker or unresolved user-owned decision is known.
