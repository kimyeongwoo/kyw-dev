# TASK 0078 — Run Release Evidence in an Exact-SHA Hermetic Manual Runner

<!-- kyw-task-contract: 3 -->

## Status

BLOCKED

## Goal

Add and execute one development-only, credential-free manual release-evidence runner that materializes an exact committed SHA in a hermetic checkout and owned profile separate from the interactive Codex home, invokes the existing release check exactly once, and durably preserves fail-closed non-publishing evidence.

## Dependencies

- Task 0052.
- Task 0077.

## In Scope

- Add one narrow `scripts/release-evidence-manual-runner.mjs` entry point around the existing retained-evidence harness instead of duplicating its command planning, npm provenance, redaction, or durable child-evidence engine.
- Require a literal full source commit SHA, a canonical real source repository, an explicit actual-run authorization flag, and caller-owned repository-external parent/evidence roots before any release child can run.
- Prove the source repository is at the requested clean SHA, materialize a physically separate detached checkout from committed objects without source worktree bytes or source Git-worktree metadata mutation, and revalidate exact HEAD, tree, script/package bytes, and clean status before and after execution.
- Create runner-owned `HOME`, `USERPROFILE`, `HOMEDRIVE`/`HOMEPATH` where applicable, `CODEX_HOME`, app-data, XDG, temporary, Git-config, npm-config, and npm-cache roots that are canonical, non-linked, mutually valid, and disjoint from the source, evidence, and interactive user roots.
- Build a bounded child environment that forwards only required platform/runtime values, strips credentials, authentication/proxy values, parent npm/Git/Node overrides, and normal home/cache paths, and makes the harness snapshot only hermetic protected state.
- Require the existing harness actual mode to accept runner-issued exact-SHA/hermetic-root proof; direct unproved actual-mode use must fail before `release:check`, while harmless self-test and dry validation remain available.
- Preserve the exact command graph: one manual invocation, one harness invocation, one composite `npm run release:check` child maximum, zero retries, zero fallback credentials, zero standalone dry-run duplication, and duplicate-invocation rejection.
- Durably retain runner preflight, exact source/tree identity, environment-layout hashes, outer and inner stdout/stderr/exit/runtime, npm provenance, raw hashes, protected-state comparison, and bounded atomically published sanitized summaries on success or failure.
- Keep hermetic state fail-closed: attributed or unattributed drift inside the isolated roots, checkout drift, child failure, parser failure, unsafe cleanup, or evidence loss exits nonzero; concurrent interactive Codex/plugin-cache churn is outside the child environment and is neither scanned nor reclassified.
- After focused and Stable/Release verification, consume exactly one real credential-free manual-runner attempt from the committed correction SHA, preserve its evidence, and perform credential-free before/after registry and GitHub reads proving zero public mutation.
- Synchronize maintainer usage in README and the exact-checkout/hermetic-home/evidence flow in ARCHITECTURE while keeping the runner development-only and outside package bytes.

## Out of Scope

- A mutating npm publish, registry or dist-tag change, publish-workflow dispatch or rerun, Git tag, GitHub Release, public plugin submission, account login/logout/configuration, OTP, security key, token fallback, or trust-list inspection.
- Retrying or replacing the single actual release-evidence attempt, using a prior Task 0076 attempt as PASS, or falling back to the caller worktree, interactive home, another credential, another npm CLI, or an alternate release command.
- Reclassifying or weakening Task 0025 protected-state outcomes, ignoring drift inside the hermetic roots, treating ambient timing as causal proof, or repairing normal user/Codex state.
- A generic sandbox, container framework, process supervisor, Git worktree manager, filesystem provider, daemon, watcher, tracer, background repair service, dependency, lifecycle script, or package-allowlist expansion.
- Implementing the Windows evaluator teardown correction, resuming or editing Task 0076, rewriting Task 0052 or other historical evidence, or beginning ordinary Task 0076 delivery.
- Automatic CI invocation of the manual runner or any change to `ci.yml` or `publish.yml`.

## Acceptance Criteria

- [x] AC-01: The manual runner accepts only an explicit full 40-hex source commit, canonical real source/evidence roots, and explicit actual-run authority; symbolic/ref-like, missing, mismatched, dirty, linked, overlapping, or identity-drifted input fails before a harness or release child.
- [x] AC-02: One physically separate detached checkout exactly matches the requested commit and tree, contains the exact runner/harness/package bytes, remains clean, and leaves the source repository HEAD, index, worktree, refs, and worktree metadata unchanged.
- [x] AC-03: Every child-visible home, Codex, app-data, XDG, temporary, Git, npm config, and cache path is an owned canonical hermetic descendant disjoint from interactive/source/evidence roots; no credential, proxy credential, unsafe Node/npm/Git override, or normal-home path reaches the child.
- [x] AC-04: The harness snapshots and requires `CLEAN` only for the hermetic protected roots; any attributed, unattributed, snapshot, or identity drift there fails closed, while concurrent interactive Codex/plugin-cache changes cannot affect the verdict and are not scanned or copied.
- [x] AC-05: The complete actual command graph contains one manual-runner invocation, one harness actual invocation, and one exact `npm run release:check` child maximum with retry maximum zero, duplicate rejection, and no actual publish, standalone duplicate dry run, lifecycle surprise, model command, workflow dispatch, or fallback.
- [x] AC-06: Exact source/tree/environment/provenance and outer/inner raw output/exit/runtime evidence is durable before parsing; bounded redacted summaries publish atomically, and every child, parser, protected-state, or post-processing failure retains safe evidence and exits nonzero.
- [x] AC-07: Checkout/environment/evidence cleanup touches only identity-proved owned roots after sealing; evidence is preserved by default, foreign entries or changed identity block cleanup, and no repository, home, cache, or caller parent becomes a recursive target.
- [x] AC-08: Deterministic tests cover Windows drive/UNC/case/long-short identities, spaces, junction/reparse escapes, POSIX symlink/containment, missing Git/npm capabilities, exact-SHA drift, credential stripping, interactive-state independence, duplicate/no-retry behavior, failure retention, and existing harness compatibility.
- [ ] AC-09: After the correction source is committed, exactly one credential-free actual manual-runner invocation executes `release:check` from that literal SHA, reaches Stable, candidate, and npm dry-run stages, returns clean, and preserves a reproducible external evidence root; failure blocks with no rerun.
- [x] AC-10: Credential-free before/after reads prove unchanged npm versions/latest/target absence, publish-workflow run inventory, remote tags, GitHub Releases, and public-submission state; no publication or account-authentication authority is inferred.
- [x] AC-11: The runner remains development-only with no dependency, lifecycle, package allowlist, package script, workflow, public surface, or Task 0076 change; README and ARCHITECTURE document the exact manual command, isolation, retention, failure, and non-publication boundaries while SPEC and AGENTS remain unchanged.

## Plan

- [x] Reconfirm Task 0052, Task 0025, Tasks 0067–0069, the completed Windows teardown dependency, Task 0076 causal evidence, and the current harness/environment/protected-state call graph.
- [x] Define and test the literal-SHA CLI, source/evidence path roles, owned run layout, detached exact checkout, hermetic environment projection, and runner-to-harness proof.
- [x] Implement the manual runner and the narrow harness gate without duplicating existing evidence, npm provenance, command-plan, redaction, or cleanup owners.
- [x] Add deterministic path, SHA/tree, environment, credential, drift, duplicate, failure-retention, cleanup, Windows/POSIX, and compatibility tests plus Release-tier planner coverage.
- [x] Synchronize README and ARCHITECTURE only, then run focused checks, all Stable commands, package checks, and non-publishing release CI before the actual evidence attempt.
- [x] Commit the exact correction source, capture credential-free public/GitHub baselines, execute the manual runner exactly once from the literal commit, retain its evidence regardless of outcome, and perform matching after-reads without retry.
- [ ] Complete final diff/matrix, package/dependency/workflow, credential, source-state, Task 0076 immutability, pair/transaction, evidence-hash, and no-publication review before STANDARD delivery.

## Decisions

- The existing retained-evidence harness remains the sole owner of the composite release child and durable inner evidence; the manual runner owns only exact-source materialization, hermetic environment, outer one-shot gating, and preservation.
- A full literal commit SHA is required; `HEAD`, a branch, a tag, a short SHA, or a moving remote ref is not an execution identity.
- Interactive Codex state is removed from the child addressable environment rather than tolerated through a wider ambient allowlist. Fail-closed comparison remains mandatory inside the hermetic roots.
- The actual attempt is consumed once after focused and Stable/Release preflight. Any nonzero result is retained and blocks; no retry, second root, backoff, or fallback is permitted.
- This Task hard-depends on the Windows teardown correction because its one real `release:check` necessarily runs the full test suite; the dependency orders verification without combining the two implementation scopes.
- Task 0076 remains immutable causal evidence during this correction and cannot be a hard dependency because its blocked state is not satisfiable.

## Risks

- A local clone optimization, hardlink, or Git worktree can couple supposedly isolated bytes or mutate source metadata unless physical separation and before/after source proofs are explicit.
- Windows home/app-data resolution and Git/npm launcher behavior can escape an incomplete environment projection, especially through case aliases, shims, global config, or inherited overrides.
- Removing interactive state from observation must not become silent trust in the child; the runner must prove disjoint roots and preserve fail-closed hermetic snapshots.
- The single real attempt can expose a new defect or external limitation after consuming its authority; truthful evidence retention and `BLOCKED` are required instead of retry.
- Evidence cleanup or redaction defects can either destroy the only result or retain secrets; raw durability, bounded sanitization, sealing, and ownership checks must remain ordered.

## Discoveries and Changes

- Execution preflight freshly proved Task 0077's complete hardened delivery and advanced the bounded continuity checkpoint through its exact merge while leaving Task 0078 as the sole current outcome.
- The implementation boundary is now fixed: the manual runner owns committed-source materialization, hermetic profile/environment construction, outer one-shot gating, and outer evidence; the retained harness keeps sole ownership of command planning, npm provenance, raw-first child evidence, redaction, protected-state comparison, and the one composite release child.
- Actual harness use will require a consumed exact-SHA/hermetic proof before preparing any evidence child. Direct harmless self-test and dry validation remain compatible, and no proof can widen authority beyond non-publishing `release:check`.
- Verification planning now classifies both release-evidence scripts and their focused tests as Release-sensitive. README absorbs the exact source-maintainer commands and non-publication boundary, while Architecture replaces the stale harness-only flow with the two-layer hermetic boundary; SPEC and AGENTS remain unchanged.
- `scripts/release-evidence-manual-runner.mjs` now validates the literal source SHA and clean repository, records source Git identity, creates a no-local/no-hardlink detached clone plus disjoint hermetic state, projects a whitelist-only environment, builds the exact proof, consumes one retained actual-attempt marker, and invokes the checked-out harness at most once through the existing durable child engine.
- Actual harness mode now requires and durably consumes the runner proof before evidence preparation, rechecks exact detached SHA/tree/files/environment/layout, preserves the runner-owned npm/Git roots, and captures pre/post protected state from the final child environment. Direct self-test and dry validation remain proof-free and harmless.
- Runner state and evidence remain preserved by default. Optional state cleanup now requires the exact sealed full inventory, token, filesystem identity, sibling relationship, and disjoint source/evidence roles before removing only that owned state root.
- Runtime selection binds the exact lexical and canonical Git/npm launcher identities, passes the exact PATH-selected npm launcher to the harness, and rejects either side of a launcher alias that intersects an interactive, source, allowed-parent, or evidence root. Windows uses only PATHEXT-resolved launchers; POSIX accepts a lexical npm link only when its canonical target is a regular file.
- The parent-scoped actual-attempt marker is created before runtime, state, clone, or child work and is revalidated by exact path, filesystem identity, and bytes immediately before the sole harness child and before PASS sealing. A pre-existing state seal, changed marker, failed state/evidence seal, or forged child-success summary is terminal evidence failure rather than PASS.
- Durable state/evidence writes and renames fsync their parent directory on POSIX; Windows records the Node runtime limitation explicitly. Partial state is bound and retained when layout creation fails, and recursive cleanup first quarantines and revalidates the exact owned inventory and identity.
- Before this Task, the harness already fixed `RELEASE_INVOCATION_MAXIMUM` at one, retry maximum at zero, validated the composite dry-run-only command plan, and wrote raw child streams and exit evidence before summary parsing.
- Before this Task, actual mode had no required expected-SHA input and ran in the caller worktree. Its child environment isolated npm config/cache but still inherited normal home, Codex, app-data, temporary, Git, and many other process values.
- Before this Task, harness pre/post protected snapshots resolved from that inherited interactive environment, so unrelated Codex/plugin-cache/WAL changes during the long child were classified fail-closed. Task 0076 observed two such zero-attribution ambient envelopes.
- Task 0052 is the satisfied direct harness owner. Task 0025 supplies protected-state classification compatibility, and Tasks 0067–0069 preserve exact-checkout, credential-free, one-attempt, and non-fallback release boundaries.
- The dependent Windows teardown Task must precede the real attempt because `release:check` runs `npm test`, and the approved Task 0076 rerun was consumed by the known after-hook race before candidate and dry-run stages.
- Exact correction source `7e1a167efef75f1916a810182806c117e08bd447` passed harmless committed-SHA dry validation and had a clean source and detached checkout before the actual attempt.
- The retained parent-scoped marker proves the one permitted runner, harness, and release-child graph was consumed once with retry maximum zero. The sole harness child exited nonzero, and the runner correctly sealed `HARNESS_FAILED` without retry or fallback.
- The actual `release:check` reached Stable only as far as `npm test`: 483 tests produced 451 passes, 26 failures, and six skips. The hermetic Windows path omitted `powershell.exe` for four helper-dependent failures, one deep proof fixture could not spawn its absolute Node path, and the remaining failure groups were dominated by nested runner paths exceeding Windows filename limits; lint, format, pack, candidate, and npm dry-run stages were not reached.
- Failure evidence shows protected state `CLEAN` with zero differences and zero attribution, npm runtime identity `UNCHANGED`, and an exact clean detached/source SHA after the child. Outer and state seals preserve the non-PASS result and raw streams under the caller-owned external root.
- Credential-free public before/after snapshots match on npm latest `0.1.3`, versions `0.1.0`–`0.1.3`, absent target `0.1.4`, empty remote tags and Releases, the same two historical publish-workflow runs, and no public-submission action. No publication or public mutation occurred.

## Documentation Impact

- SPEC: Expected unchanged — evidence honesty, exact-SHA verification, credential-free preflight, and separate publication authority already own the required meaning.
- ARCHITECTURE: Update release verification and security/isolation flow for the manual exact-SHA checkout, hermetic home/config/cache roots, runner-to-harness boundary, one-shot retention, and fail-closed inner state.
- README: Add the exact maintainer manual-runner invocation, required literal SHA/external roots, one-attempt rule, retained evidence behavior, and explicit non-publication warning.
- AGENTS: Expected unchanged — publication authority, stable commands, evidence honesty, and Task execution rules already govern this outcome.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Loaded the managed repository rules, complete `$kyw-impl` execution procedure, Task 0078 pair, hard dependencies, selected permanent-document owner sections, and current repository/delivery state.
- Validated the Task 0078 pair and transaction state, fetched `origin`, and confirmed exact aligned clean tracked `main` at `ae2ca0e23e8bcbf3beb53b9bb659c2358b67d60a`; the only pre-existing work is the selected untracked Task 0078 pair.
- The sole production dispatcher selected `IMPLEMENT / 0078` with ordinary `STANDARD` lifecycle authority and prepared the bounded predecessor-continuity transition.
- Created `task/0078-run-release-evidence-in-an-exact-sha-he-50a73706`, activated the pair as `IN_PROGRESS/RUNNING`, and applied the prepared predecessor-continuity transition exactly once; the checkpoint now covers 45 delivered outcomes through Task 0077 while Task 0078 remains uncovered.
- Implemented the development-only exact-SHA manual runner, narrow proof-gated harness actual mode, Release-tier path selection, focused runner/harness tests, and the README/Architecture projections without changing package scripts, dependencies, workflows, SPEC, AGENTS, or a historical Task.
- Hardened exact tracked-byte cleanliness, cross-process environment equality, lexical/canonical runtime provenance, parent-scoped one-attempt consumption, forged child-result rejection, partial-state retention, state/evidence seal failure classification, POSIX durability, and identity-proved quarantine cleanup through repeated adversarial review.
- Passed the final independent integrated focused suite 85/85 across 36 runner, 30 harness, 9 planner, and 10 instruction-surface tests after the final runtime-provenance audit fixes, plus script syntax, Release-tier planner selection, format, whitespace, lint, pair, and transaction checks before the actual attempt.
- Passed the complete Stable preflight: `npm test` reported 479 pass / 4 host-limited skip / 0 fail across 483 tests; lint, format, pack, and whitespace checks passed. The subsequent non-publishing `npm run release:ci` repeated the same Stable result and produced a verified 43-file, 135,268-byte candidate with SHA-256 `dc7aa85b4402e77097514b1911df92e367d72a19d5588834319959512f567ee4`.
- Committed the exact correction source as `7e1a167efef75f1916a810182806c117e08bd447`, passed harmless dry validation from that literal SHA, and captured the credential-free public baseline outside the repository.
- Consumed exactly one authorized actual manual-runner attempt. Its sole `release:check` child failed in `npm test` with 26 failures before candidate or npm dry-run, and the runner retained sealed fail-closed evidence without retry.
- Captured the matching credential-free after-read and proved all observed npm, Git tag, GitHub workflow/Release, and submission state remained unchanged; the repository, exact checkout, hermetic protected roots, and npm runtime also remained clean or unchanged.
- Completed the blocked-state diff/matrix, package/dependency/workflow, credential, source-state, Task 0076 immutability, evidence-hash, pair/transaction, and no-publication review. The branch still contains exactly the 11 expected paths, while the post-correction evidence update changes only this Task/Test pair.

## Remaining

- Do not rerun Task 0078 actual mode. A new explicit hard-dependent correction Task must address bounded Windows path depth and required PowerShell launcher availability, add deterministic regression coverage, and define any new attempt authority.
- Ordinary `STANDARD` push/PR/CI/merge delivery remains withheld because AC-09 failed; no publication authority is requested or implied.

## Resume Point

- Resume only through a newly authorized hard-dependent correction Task. Preserve the exact external evidence and state roots; never rerun or replace Task 0078's consumed attempt, and do not begin STANDARD delivery from this blocked pair.

## Blockers

- BLOCKED — the sole actual attempt was consumed and failed Stable with 26 Windows environment/path failures before candidate and npm dry-run. Recovery requires a new explicit hard-dependent Task; retry, fallback, publication, and STANDARD delivery are not authorized here.
