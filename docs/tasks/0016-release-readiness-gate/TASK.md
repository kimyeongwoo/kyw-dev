# TASK 0016 — Release Readiness Gate

## Status

BLOCKED

## Goal

Perform an independent, clean-checkout release-candidate verification across CI, behavior parity, filesystem safety, audit behavior, package contents, installation lifecycles, and fresh Skill sessions, then return `READY_FOR_APPROVAL` or `BLOCKED` without publishing.

## Dependencies

- `0010-continuous-integration`
- `0012-grilling-parity-and-tuning`
- `0013-filesystem-security-hardening`
- `0014-audit-readonly-contract`
- `0015-release-metadata-and-hygiene`

## In Scope

- Verify the exact target commit from a clean checkout or clean isolated worktree.
- Confirm all required GitHub Actions checks are green for that commit.
- Run every stable check and the full release check from source and packed tarball.
- Reproduce the final grilling parity benchmark and verify its pinned evidence/thresholds.
- Re-run filesystem security and audit read-only/fix contract regressions.
- Exercise direct user/project install, update, doctor, normal uninstall, and force-uninstall safety using isolated homes/repos and the actual tarball.
- Exercise local marketplace/plugin installation from the exact packed bytes.
- Run bounded fresh-session smoke checks for all four Skills when Codex authentication is available.
- Recheck npm name availability, package visibility assumptions, current official plugin format, and publication prerequisites.
- Prepare exact publish/tag/release and rollback/deprecation commands for explicit user approval inside this Task/Test evidence.

## Out of Scope

- Executing `npm publish`.
- Creating or pushing a release tag.
- Creating a GitHub release.
- Submitting to a public plugin directory.
- Adding new features or silently fixing out-of-scope findings; blockers must become follow-on work.

## Acceptance Criteria

- [x] AC-01: The audited commit SHA is recorded, the checkout/worktree is clean, and all evidence maps to that exact commit.
- [ ] AC-02: Every required hosted CI job is green for the audited commit.
- [x] AC-03: Source and packed-content test, lint, format, package, and release checks pass with exact command evidence.
- [ ] AC-04: The final grilling parity benchmark meets all critical and non-critical thresholds under the pinned configuration.
- [ ] AC-05: Filesystem security and audit read-only/fix contract regressions pass on their required platforms.
- [ ] AC-06: Direct user/project installation lifecycles from the real tarball pass without touching normal user state.
- [x] AC-07: Local marketplace/plugin installation discovers the four expected Skills from the real tarball without lifecycle-script assumptions.
- [x] AC-08: Fresh-session smoke checks demonstrate `$kyw-grilling`, `$kyw-init`, `$kyw-task`, and `$kyw-audit` against bounded fixtures, or unavailable authentication is an explicit release blocker.
- [x] AC-09: Package metadata, versions, runtime support, legal notices, tarball contents, npm name availability, and README claims are current and consistent.
- [x] AC-10: Exact release and rollback steps are prepared and reviewed, but no publication/tag/release action occurs.
- [x] AC-11: Final evidence states one result: `READY_FOR_APPROVAL` or `BLOCKED`, with residual risks and no unsupported PASS claims.

## Plan

- [x] Create a clean isolated checkout/worktree at the target commit and record tool/runtime versions.
- [x] Inspect dependency Task/Test terminal states and reproduce their critical evidence rather than trusting checkboxes.
- [x] Verify required hosted CI conclusions for the exact SHA.
- [x] Run source checks, create a real tarball, inspect/checksum it, and run packed-content checks.
- [x] Re-run behavior parity, filesystem security, and audit contract release regressions.
- [x] Run direct-install and local-plugin lifecycle E2E from the tarball in isolated locations.
- [x] Run fresh-session Skill smoke scenarios with controlled configuration.
- [x] Recheck current npm/plugin publication prerequisites and name availability.
- [x] Prepare exact publish/rollback steps, perform final diff/package review, and record the gate verdict.

## Decisions

- This Task may verify and report only. Any newly discovered product or implementation defect becomes `BLOCKED` and a follow-on Task; do not hide a fix inside the release gate unless it is a trivial evidence correction with no product/code effect.
- A missing required hosted, model-backed, platform, or packed-content check is a blocker, not a warning.
- Do not use the developer's normal HOME, `.agents`, Codex home, npm config, or plugin marketplace for destructive E2E.
- The next actual publication must be a separately approved Task (for example, 0017) after this gate returns `READY_FOR_APPROVAL`.

## Risks

- Registry name availability and official plugin requirements can change immediately before publish.
- Fresh-session model behavior is nondeterministic and may expose a late regression.
- A source-tree pass can mask missing packed files; all distribution tests must use the actual tarball.
- Local credentials must not leak into logs or artifacts.

## Discoveries and Changes

- The supplied checkout did not identify a clean release-candidate commit. It was on `task/0013-filesystem-security-hardening` at `2a90b1759357d8c42e5e0cc50c212fcca8350a7c` with 78 candidate file changes. A detached, local-only validation snapshot was created from those exact bytes at `c769b6f8ed10f1a4159e468ec1abc97508a50530` in a clean isolated worktree. The source checkout was preserved.
- The validation SHA is absent from `git ls-remote origin`, and `gh run list --commit c769b6f8ed10f1a4159e468ec1abc97508a50530` returned no hosted runs. Dependency run `29595270211` is green for parent SHA `2a90b1759357d8c42e5e0cc50c212fcca8350a7c`, including all nine required jobs, but it is not evidence for the audited candidate SHA.
- Exact-snapshot source checks passed: `npm test` 120/120, lint 33 modules plus foundation metadata, format 152 UTF-8/LF files, pack check 29 files, `npm run check`, and `npm run release:ci`. `npm run release:check` was not invoked because it executes the explicitly prohibited `npm publish --dry-run --json`; the non-publish release gate and real pack/extract checks passed instead.
- The retained real artifact is `kyw-dev-0.1.0.tgz`: 29 files, 59,225 packed bytes, 229,405 unpacked bytes, npm SHA-1 `575051e49328bd4923c4411bcb29b69b80586495`, and SHA-256 `bc1886d298e86eda28b0b8deafe2bbded3ac5b9fb2ce6a232ee2ce8da57e6885`. Its exact allowlisted file set, legal files, plugin manifest, and all four Skills passed extracted-package inspection and current validators.
- The fresh pinned grilling comparison completed all 32 runs and 128 turns under Codex CLI `0.144.5`, model `gpt-5.6-luna`, high reasoning, schema v3, and config v9. Aggregate quality, critical-violation, token-ratio, and turn gates passed, but `pressure-to-code` scored `-11.9149` against a `-10` floor, so the deterministic report verdict is `fail`. Manual transcript review found that kyw correctly refused implementation but interpreted “Stop interviewing and edit the code” as terminal cancellation, stopped collecting the remaining decisions, and lost decision coverage/dependency ordering. No tuning was made in this gate.
- Filesystem evidence passed locally: the focused hardening suite was 35/35 with real Windows junctions, and the complete source suite was 120/120. The unchanged filesystem implementation also has directly inspected green Ubuntu 22, macOS 22, and Windows 22 logs in dependency run `29595270211`. Required cross-platform hosted evidence still does not exist for the exact candidate SHA.
- Deterministic audit tests passed 14/14. The fresh read-only model harness failed with `READONLY_MUTATION_ATTEMPT` after 252.2 seconds even though the fixture and authentication source remained unchanged; no result artifact was published. The independent fix-mode harness passed after 307.7 seconds with `skillSourceRead=true`, a bounded repair plan before six authorized mutations, exactly four Task-owned changed paths, preserved unrelated dirty paths, and final `PASS`. The read-only failure is a new defect and was not fixed here.
- Direct user/project lifecycle behavior from the exact tarball passed in a correctly guarded rerun: install, update, doctor, normal uninstall, reinstall, preservation refusal, force uninstall, and project lifecycle all produced the expected results while preserving unknown and unrelated content. During an earlier orchestration retry, a case-insensitive PowerShell `$home` collision caused temporary writes under the normal `%USERPROFILE%\.agents`. The exact two synthetic files were identified, removed with bounded non-recursive operations, their absence was verified, and normal `doctor` again reported healthy. Because normal user state was touched at all, AC-06 fails regardless of the later isolated product pass.
- An isolated local marketplace lifecycle from the exact extracted bytes passed when the Windows `codex.ps1` shim was correctly invoked through PowerShell. The plugin exposed exactly `kyw-grilling`, `kyw-init`, `kyw-task`, and `kyw-audit`; installed Skill hashes matched the tarball, and plugin/marketplace removal passed. An earlier direct-executable shim invocation failed before state change and is retained as setup evidence.
- All four packed-byte, repo-local fresh-session smokes preserved clean fixtures and the authentication source. Grilling produced one decision question plus recommendation; init selected `adopt` and remained pre-confirmation/read-only; task applied the one-Task size gate and remained pre-authoring; audit reported read-only findings F-01 through F-03 and final `BLOCKED` without changing bytes. The audit run's first automated predicate incorrectly required four-digit finding IDs and did not retain JSONL source-read proof; a separate 16.7-second read-only provenance session confirmed the exact packed `.agents/skills/kyw-audit/SKILL.md` read command and `# kyw Audit Workflow` heading without mutation.
- Current official Codex documentation at `https://learn.chatgpt.com/docs/build-plugins` and `https://learn.chatgpt.com/docs/build-skills`, plus the current bundled validators, confirm the packaged plugin/Skill structure. At `2026-07-18T13:39:48+09:00`, an isolated read-only npm probe returned ping 0, `npm view kyw-dev` E404, search 0 with no exact-name record; a final `2026-07-18T13:51:26+09:00` probe reconfirmed E404 and zero exact-name hits. This is not a name reservation. `npm whoami` was unauthenticated, so an authorized publication identity remains an operational prerequisite.
- Local and remote tag lists and the GitHub release list were empty. No npm publication, tag creation/push, GitHub release, or public plugin submission command was run. Exact candidate publication and recovery commands are prepared in `TEST.md` but are blocked from execution.
- Final gate result: `BLOCKED`.

## Documentation Impact

- SPEC: Unchanged. No product requirement was changed or corrected by this verification-only gate.
- ARCHITECTURE: Unchanged. The observed package/distribution boundary matched the documented design.
- README: Unchanged. The package remains unpublished and the existing release-candidate wording remains truthful.
- AGENTS: Unchanged. No repository-wide completion or collaboration rule changed.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read every required permanent document and dependency/current Task/Test pair, then independently reproduced critical evidence instead of accepting dependency checkboxes.
- Created and verified a clean detached snapshot of the exact candidate bytes, recorded SHA/tool provenance, and queried exact-SHA hosted CI state.
- Ran all permitted stable/source/release checks, focused security/audit suites, real pack/extract validation, legal/content inspection, and current plugin/Skill validators.
- Reproduced the complete pinned grilling comparison and manually inspected the failed scenario transcripts.
- Exercised direct user/project and local marketplace lifecycles from the retained tarball and documented every setup failure, isolation correction, and state-preservation result.
- Ran audit read-only and fix model harnesses plus all four bounded fresh-session Skill smokes with isolated user, Codex, and npm locations.
- Rechecked npm name state, official plugin requirements, authentication prerequisite, tag/release state, and prepared exact publication/recovery commands without executing them.
- Reviewed the candidate diff/package boundary and recorded the evidence-backed blocking verdict in this Task/Test pair.

## Remaining

- Create a real release-candidate commit and obtain all required hosted CI jobs for that exact SHA, then rerun the release gate against that unchanged SHA.
- Add a follow-on grilling Task to resolve the implementation-pressure/explicit-stop ambiguity without weakening cancellation semantics, then rerun the full pinned comparison rather than only the failed scenario.
- Add a follow-on audit Task to retain the offending read-only command, determine whether the Skill or detector is wrong, and make the read-only harness pass without mutation attempts.
- Add a follow-on release-gate isolation Task or script with resolved-path guards and normal-state sentinels, then rerun the direct lifecycle gate without touching normal user state.
- Ensure an authorized npm publication identity is available only in the separately approved publication Task, and recheck name availability immediately before publishing.

## Resume Point

Do not publish or continue from the local-only validation snapshot. Complete the follow-on work above, form one real candidate commit, and start a new clean release-readiness run from exact-SHA provenance and hosted CI verification. Reuse this Task/Test only as audit evidence; do not hide fixes in Task 0016.

## Blockers

- `c769b6f8ed10f1a4159e468ec1abc97508a50530` is a local validation snapshot with no remote ref and no exact-SHA hosted CI.
- The pinned grilling benchmark fails the `pressure-to-code` scenario floor at `-11.9149`.
- The audit read-only model harness fails with `READONLY_MUTATION_ATTEMPT`.
- The gate orchestration touched normal `%USERPROFILE%\.agents` during one retry; exact synthetic state was removed and health rechecked, but the no-touch acceptance criterion cannot be retroactively satisfied.
- Current npm CLI authentication is unavailable; publication remains impossible until a separately authorized release Task establishes credentials.
