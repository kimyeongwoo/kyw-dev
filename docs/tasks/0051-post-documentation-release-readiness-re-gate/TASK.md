# TASK 0051 — Post-Documentation Release-Readiness Re-Gate

<!-- kyw-task-contract: 2 -->

## Status

READY

## Goal

Build a fresh npm candidate from the exact final `main` bytes delivered by Tasks 0049–0050 and produce an evidence-backed exact-candidate readiness verdict without publication or any public mutation.

## Dependencies

- Task 0050.

## In Scope

- Verify Tasks 0049 and 0050 are `DONE/PASSED` and their `STANDARD` delivery ledgers are satisfied before candidate work begins.
- Prove repository root, branch, HEAD, upstream, local `main`, cached `origin/main`, direct remote `main`, clean status, and the exact execution-time main SHA.
- Form a fresh actual npm candidate from the final delivered package bytes and record package name/version, archive filename, file count, packed/unpacked size, archive SHA-256, npm shasum/integrity when available, and exact source SHA.
- Verify the candidate contains the completed-outcome retention guidance/package changes and the final Task 0050 README bytes while excluding numbered Task artifacts and development-only content as required.
- Run the repository-defined Stable, candidate, release, explicitly approved dry-run, registry/auth observation, and release-isolation boundaries without double-counting one immutable proof.
- Determine from current repository truth whether any model-backed release check is required; run none unless a repository-defined command and separate explicit approval exist.
- Verify release isolation and protected-state preservation.
- Produce exactly `READY_FOR_APPROVAL` or an honest `BLOCKED` verdict bound to the new exact candidate.
- Complete ordinary `STANDARD` delivery with exact-head PR CI and exact post-merge `main` CI, keeping mutable delivery state in the GitHub ledger.
- Record exact commands, non-mutation basis, exit status, runtime, retry count, model calls/cost, credential handling, evidence identity, limitations, and stop conditions for every executed gated boundary.

## Out of Scope

- `npm publish`, registry mutation, package version change, Git tag, GitHub Release, public plugin submission, or public-directory submission.
- Product/runtime fixes or documentation rewrites discovered during the gate; a defect blocks this Task and is reported without implementation.
- Task 0052 creation or any future product Task.
- Reusing Task 0047 readiness as current-byte PASS evidence.
- Guessing PASS for unavailable authentication, registry, isolation, model, hosted-CI, or candidate-identity evidence.
- Automatic retries, CI reruns, bypass, force operations, destructive recovery, or credential disclosure.

## Acceptance Criteria

- [ ] AC-01: Tasks 0049–0050 are terminal and fully delivered, and local HEAD/upstream/local `main`/`origin/main`/direct remote `main` are clean and identical at one recorded exact SHA before candidate formation.
- [ ] AC-02: One fresh candidate is bound to the execution-time exact source SHA with package/version, file count, packed/unpacked size, archive SHA-256, and available npm identity fields recorded from actual output.
- [ ] AC-03: Candidate inspection proves inclusion of the final retention/guidance and README package bytes, required runtime/Skill/legal files, and exclusion of Task artifacts and development-only content.
- [ ] AC-04: Stable, candidate, release/dry-run, registry/auth, and isolation evidence is executed only at the required distinct boundaries, with no duplicate immutable proof and no historical Task 0047 PASS substituted for current bytes.
- [ ] AC-05: Before `npm run release:check`, any standalone `npm publish --dry-run --json`, registry/auth probes, release isolation, or model-backed command, the workflow reports the exact command, purpose, non-mutation basis, retry policy, model call/cost, credential handling, and stop rule, then waits for separate explicit approval.
- [ ] AC-06: Every required boundary either has actual command/manual evidence with provenance or produces an explicit blocker; model-backed necessity is resolved from repository truth and is reasoned `N/A` only when it is genuinely not required.
- [ ] AC-07: The final exact-candidate verdict is only `READY_FOR_APPROVAL` or `BLOCKED`, remains tied to the recorded archive/source identity, and is explicitly not publication approval or publish-permission proof.
- [ ] AC-08: No publish, registry mutation, version change, tag, GitHub Release, public submission, Task 0052, product fix, workflow rerun, force, or destructive action occurs.
- [ ] AC-09: Task 0051 exact-head PR CI and post-merge `main` CI both complete successfully at their expected exact SHAs with every required job successful; mutable delivery evidence remains external.
- [ ] AC-10: Canonical Task/Test validation, final package/source/status comparison, protected-state review, credential-retention review, whitespace review, and complete acceptance-to-test/final-diff review support the terminal repository outcome.

## Plan

- [ ] Revalidate Tasks 0049–0050 repository and GitHub delivery, clean exact local/origin/direct `main`, Task transaction absence, tags/Releases/publication state, package scripts, and tool provenance.
- [ ] Inspect the final package-relevant object set and fix the exact source SHA before any candidate command.
- [ ] Inventory repository-defined verification and choose one non-duplicating sequence for Stable, candidate, dry-run, registry/auth, isolation, and any genuinely required model boundary.
- [ ] Present every approval-gated command with exact purpose, non-mutation proof, retry/model/cost/credential handling, and first-failure stop rule; pause until the user explicitly approves the named commands.
- [ ] Execute only approved boundaries, create one identified real tarball, and record exact outputs without retaining credentials or secret-bearing raw logs.
- [ ] Verify final retention/guidance, README, runtime/Skill/legal contents, allowlist exclusions, direct/plugin lifecycle, isolation, and protected-state results against the same candidate identity.
- [ ] Derive `READY_FOR_APPROVAL` or `BLOCKED`, update this pair with only actual evidence, and run final canonical/scope/coverage review without creating Task 0052.
- [ ] Perform ordinary `STANDARD` delivery, require exact-head and post-merge successful CI, and report the final repository and external-ledger state without publication.

## Decisions

- Task 0047 is immutable historical evidence only; Tasks 0049–0050 package changes require a new exact candidate.
- The candidate source is the clean delivered `main` SHA captured at execution, not this pre-authored Task's future branch head. Task-only bytes must be proven package-irrelevant.
- Prefer one approved `npm run release:check` when it remains the repository-defined composite because it owns Stable, candidate, and one internal dry run; do not also run a standalone duplicate dry run without a distinct approved reason.
- Registry/auth probes are observation-only and use the public registry, fresh Task-owned external cache/log/temp state where needed, and the normal credential source read-only; usernames, tokens, config contents, and raw secret-bearing output are never retained.
- Release isolation is a separate candidate lifecycle boundary and requires explicit approval despite being non-publishing.
- No model-backed command is invented. If repository truth defines no required release model gate, record reasoned `N/A` with zero calls, zero cost, and zero retries.
- Readiness never grants publication authority. Actual publish, tag, Release, and public submission remain separate user decisions.

## Risks

- Upstream movement or incomplete dependency delivery invalidates the candidate base and requires a stop before any gate.
- Running composite and leaf release commands indiscriminately can duplicate evidence while creating multiple candidate identities.
- README and packaged Skill guidance are package bytes; checking only runtime source would miss the reason this re-gate exists.
- Registry/auth probes can read credentials and write caches unless isolated; evidence must prove credential/config immutability and avoid secret retention.
- A successful local candidate cannot replace exact-head PR and post-merge `main` CI, and green CI cannot replace a missing registry/auth or isolation boundary.
- A discovered product defect, unexpected public state, or candidate mismatch must yield `BLOCKED`, not an in-scope fix or inferred approval.

## Discoveries and Changes

- This Task is pre-authored before Tasks 0049–0050 execute; no source SHA, archive identity, gate result, authentication result, or readiness verdict exists yet.
- Current repository truth defines `release:check` as `npm run release:ci && npm publish --dry-run --json`, but execution must revalidate that command and obtain approval rather than treating this authoring fact as future evidence.
- No release, registry/auth, isolation, model-backed, publication, or delivery command has run for this Task.

## Documentation Impact

- SPEC: Expected unchanged; current release and publication requirements remain authoritative.
- ARCHITECTURE: Expected unchanged; candidate, isolation, CI, and publication boundaries already own the design.
- README: Expected unchanged; Task 0050 deliberately makes README stable across later re-gates.
- AGENTS: Expected unchanged; repository completion and authority rules remain intact.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Not applicable — implementation has not started.

## Remaining

- Complete dependency/delivery preflight, obtain explicit approvals, execute required candidate boundaries, derive the exact verdict, finish Task/Test evidence, and complete exact-SHA `STANDARD` delivery.

## Resume Point

- Begin only after Task 0050 delivery is satisfied by proving clean exact local/origin/direct `main` identity and presenting the complete approval-gated command set.

## Blockers

- Not applicable — no current blocker is known; unmet dependency or missing approval will become an execution-time blocker rather than inferred authorization.
