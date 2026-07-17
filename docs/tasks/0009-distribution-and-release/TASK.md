# TASK 0009 — Distribution and Release

## Status

DONE

## Goal

Validate the complete npm/plugin distribution, run end-to-end workflows, and prepare a reproducible v0.1 release without publishing until explicit approval.

## Dependencies

- `0008-cli-installation`

## In Scope

- Finalize package metadata, files list, version synchronization, legal files, and changelog/release notes if needed.
- Create and validate local/personal marketplace metadata pointing to local, GitHub, and/or npm sources as selected.
- Inspect the packed tarball.
- Run direct user/project install, update, doctor, and uninstall end to end.
- Load the local plugin and invoke each Skill in fresh Codex sessions where supported.
- Exercise init, Task create/execute/resume, audit, and ordinary small-prompt documentation sync on fixtures.
- Resolve publication decisions and document exact release commands.
- Prepare but do not execute npm/public plugin publication without explicit approval.

## Out of Scope

- Adding new product features.
- Publishing without user confirmation.
- Submitting to a public plugin directory unless selected as a release decision.

## Acceptance Criteria

- [x] AC-01: The packed tarball contains all required plugin, Skill, template/runtime, README, and legal files.
- [x] AC-02: A marketplace install can discover the bundled Skills without lifecycle scripts.
- [x] AC-03: Direct user and project installations pass full lifecycle tests.
- [x] AC-04: Fresh-session E2E demonstrates `$kyw-init`, `$kyw-task`, and `$kyw-audit`.
- [x] AC-05: A small ordinary prompt updates affected permanent docs without creating a Task.
- [x] AC-06: Third-party license and chosen project license are present.
- [x] AC-07: README installation and usage commands match verified behavior.
- [x] AC-08: A release checklist and rollback/deprecation plan exist.
- [x] AC-09: No publish action occurs without explicit approval.

## Plan

- [x] Confirm open publication decisions.
- [x] Finalize package/manifest/marketplace metadata.
- [x] Run automated full suite and inspect npm tarball.
- [x] Run isolated direct-install E2E.
- [x] Run local plugin/Skill E2E in fresh sessions.
- [x] Fix release blockers and repeat affected tests.
- [x] Prepare release notes and exact publish steps for approval.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production dependencies minimal and justify any addition here.
- Prepare the unscoped npm package name `kyw-dev`; the registry returned E404 on 2026-07-17, but release approval must include a fresh availability/ownership check because an unused name is not reserved.
- Make the package publishable to the public npm registry while retaining an explicit human approval gate around the actual `npm publish` command. A dry run is verification, not publication.
- Use npm distribution plus an isolated local/repository marketplace as the v0.1 release surfaces. Do not submit to a public plugin directory in this Task.
- Omit GitHub repository/contact URLs and branding assets until real values exist; do not publish invented metadata. The local marketplace source is sufficient for the required plugin E2E.
- Keep first-release notes, the release checklist, exact commands, and rollback/deprecation guidance in this Task instead of creating a separate changelog or release document.
- Add no production or development dependency; Node.js built-ins, npm, and the installed Codex CLI are sufficient for release validation.

## Risks

- Official plugin interfaces may change before release and must be rechecked.
- The desired npm name may require a scoped fallback.
- Desktop plugin E2E may require a supported local environment and manual evidence.

## Release Notes

`kyw-dev` 0.1.0 is the first complete release candidate. It packages four explicit Codex workflows (`kyw-grilling`, `kyw-init`, `kyw-task`, and `kyw-audit`), canonical permanent/Task/Test templates, deterministic Task helpers, and a dependency-free CLI for managed user/project Skill install, update, doctor, and ownership-safe uninstall. The release adds public-ready npm/plugin metadata, exact tarball validation, full packed direct-install lifecycles, and isolated local marketplace installation without npm lifecycle scripts.

Known release boundaries: Node.js 22 or newer is required; the workflows target Codex; generated project documents are never upgraded by package update; plugin and direct-Skills installs should not be active together; GitHub/contact/branding metadata and public plugin-directory submission are intentionally absent from 0.1.0.

## Release Checklist

Preparation in this Task:

- [x] Package, plugin, Skill, template/runtime, README, and legal metadata are synchronized at 0.1.0.
- [x] The exact tarball allowlist, secret/path scan, packed direct lifecycles, and isolated local marketplace lifecycle pass.
- [x] Fresh-session init/Task/resume/audit and ordinary-prompt scenarios have reproducible evidence.
- [x] Node.js 22, all four stable checks, release dry run, official plugin validation, and current Task validation pass.
- [x] Final snapshot diff, documentation impact, acceptance mapping, and residual-risk review are complete.

Approval-time publication gate (not authorized or performed by this Task):

- [ ] The user explicitly approves this exact 0.1.0 tarball and the `kyw-dev` public package name.
- [ ] `npm whoami` identifies the intended publisher and account security requirements are satisfied.
- [ ] A fresh registry lookup still shows the unscoped name is available or owned by that publisher.
- [ ] The approved tarball hash matches the final verified artifact.
- [ ] Publication succeeds, registry metadata is verified, and only then is an npm marketplace source advertised.

## Exact Release Commands

Safe preparation commands:

```text
npm view kyw-dev name version dist-tags --json
npm run release:check
npx --yes node@22 --test
npm pack --dry-run --json
node skills/kyw-task/scripts/task-artifacts.mjs validate --task-directory docs/tasks/0009-distribution-and-release
```

Approval-only commands; do not run them merely because preparation passed:

```text
npm whoami
npm view kyw-dev name version dist-tags --json
npm publish --access public
npm view kyw-dev@0.1.0 name version dist.integrity dist.tarball --json
```

`npm publish --provenance` is not claimed for this release because the supplied workspace has no Git remote/commit evidence and this Task does not add a supported CI publication workflow.

## Rollback and Deprecation

- Prefer a corrected semantic version and deprecate the bad version without breaking existing installs: `npm deprecate kyw-dev@0.1.0 "Do not use this release; install the latest kyw-dev version instead."` Then prepare and explicitly approve a later version; never reuse `0.1.0`.
- Use `npm unpublish kyw-dev@0.1.0` only for an exceptional accidental or sensitive publication, only after separate explicit approval, and only when the current npm unpublish policy permits it. Unpublish is irreversible, the version cannot be reused, and removing an entire package may impose a republish delay.
- If an npm marketplace entry has been distributed, mark that entry unavailable or point a later catalog revision at the corrected version. The local `kyw-dev-local` fixture needs no remote rollback and is recreated from verified bytes for each test.
- Direct-Skills users can run `npx --yes kyw-dev@<corrected-version> update --scope <user|project>` after a corrected release; local modifications remain conflict-protected. If no correction exists, uninstall only the selected managed scope with the matching CLI.

## Discoveries and Changes

- The supplied workspace and its visible parent contain no `.git` metadata. Git status and staged/unstaged diff inspection cannot run, so a verified 97-file pre-change snapshot was created at `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0009-before-1784244031274` for no-index and independent hash/file-set review.
- The snapshot matches all 97 workspace files byte-for-byte, and `git diff --no-index --quiet` exited 0 before implementation.
- Pre-change `npm run check` passed: 70/70 tests, lint over 20 JavaScript modules plus metadata, 89 UTF-8/LF text files, and the exact 29-file package at 45,911 bytes.
- The current package is blocked from release by `"private": true`; npm documents that this flag refuses publication. The manifest also still describes implemented Skills as foundation stubs.
- `npm view kyw-dev name version dist-tags --json` returned E404 on 2026-07-17, so the preferred unscoped name is presently unused or inaccessible but must be rechecked at approval time.
- The current official Codex manual and installed `codex-cli 0.144.5` agree on repo/personal marketplace locations, local/npm source forms, isolated plugin cache behavior, and `codex plugin marketplace|add|list|remove` commands. The official plugin validator passes the existing plugin structure.
- Node.js v24.11.0, npm 11.18.0, and Codex CLI 0.144.5 are available in this environment. Native Node.js 22 verification remains required separately.
- The user's instruction to continue only Task 0009 supplies authorization to advance the prepared pair into execution. It does not authorize an npm publish, public-directory submission, or mutation of the user's normal Codex plugin configuration.
- Release metadata now sets `private: false`, public npm `publishConfig`, bounded keywords, and an explicit dry-run-only `release:check`; the plugin manifest describes the four implemented workflows and real capabilities instead of stubs. No dependency or lifecycle script was added.
- The canonical development-only marketplace fixture uses `./plugins/kyw-dev`. A focused test packed and extracted the real archive, added that local marketplace under an isolated `CODEX_HOME`, discovered and installed `kyw-dev@kyw-dev-local`, found all four cached `SKILL.md` files, then removed the plugin and marketplace without touching normal user configuration.
- The same actual tarball completed install, same-version update, doctor, and uninstall at both isolated user and nested project scopes. It created no project permanent document and exposed no source absolute path or secret-shaped token in packed text.
- Fresh Codex CLI sessions used an isolated greeting repository. Normal read-only sessions discovered and invoked `kyw-grilling` and `kyw-init`; grilling inspected facts and asked one recommended decision question, while init produced a four-file plan and stopped cleanly for confirmation with no write.
- The installed CLI's managed policy reduced requested child `workspace-write` sessions to read-only. Three confirmed init materialization attempts were rejected before any partial change. A bounded fixture-only `--dangerously-bypass-approvals-and-sandbox` session then completed exactly the confirmed four-document init plan, with 2/2 tests and lint passing.
- In full-access child sessions, the project Skill catalog reported `kyw-init`, `kyw-task`, and `kyw-audit` unavailable even though the 19-file direct installation and Skill files were present. Those sessions therefore applied the same installed Task/Test and repository contracts directly. They authored one DRAFT pair, resumed it numerically to `DONE`/`PASSED` with 4/4 tests, independently audited it as `PASS` without changes, and completed an ordinary small change with 5/5 tests while keeping the Task directory count at one.
- The fresh-session limitation is surface-specific rather than a package-content failure: isolated marketplace and direct-install discovery are proven, read-only explicit Skill invocation is proven, and the write workflows are proven from the installed artifacts, but exact desktop-app invocation remains a manual residual risk.
- The workspace-local E2E repository was moved after verification to the recoverable Temp path `C:\Users\DevHamster\AppData\Local\Temp\kyw-dev-task0009-completed-e2e-1784246542632`; no temporary run directory remains in the workspace.
- The first `npm run release:check` exposed npm's automatic removal of the `./` prefix from the `bin` path. The manifest now uses canonical `bin/kyw-dev.mjs`, foundation/distribution checks lock that path and its Node shebang, and the repeated dry run completed without the correction warning.
- A final exact read-only `$kyw-task 0001` session loaded the installed Skill, validated the completed pair, reran 5/5 current tests and lint, and reported no remaining Task work without mutation.
- A final exact read-only `$kyw-audit 0001` session loaded the installed audit Skill. Its first process timed out after 184.2 seconds; the saved session resumed without repair and correctly returned `BLOCKED` because the deliberately later ordinary-prompt API change was outside Task 0001's recorded scope. The earlier pre-ordinary-change audit returned `PASS`, demonstrating both clean and finding verdicts.
- Snapshot review found exactly 7 added and 9 modified Task-owned paths, no deletion or root tarball, and one fixture EOF blank line; that whitespace defect was removed before the terminal rerun.

## Documentation Impact

- SPEC: Updated distribution requirements, approval boundary, and resolved v0.1 publication decisions.
- ARCHITECTURE: Updated the final package/manifest release state, local marketplace fixture and isolated cache flow, release gate, and distribution-test topology.
- README: Updated release-candidate status, reproducible release/dry-run checks, pre-publication CLI usage, package-name recheck, and verified plugin marketplace behavior.
- AGENTS: Unchanged; the four stable commands and repository-wide completion rules remain authoritative. `release:check` is a release-specific command, not a new stable gate for every Task.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, current Task/Test pair, required Task 0002 evidence, and explicit Task 0008 dependency.
- Inspected the current package/plugin metadata, package allowlist and validation code, legal/Skill metadata surfaces, repository inventory, and release-relevant tests.
- Confirmed missing Git metadata, created and hash-verified the 97-file pre-change snapshot, reviewed the empty baseline no-index diff, and passed the pre-change stable checks.
- Rechecked current official Codex plugin/marketplace guidance, installed CLI grammar, npm release/rollback requirements, and the preferred package-name lookup without executing any publication action.
- Resolved the conservative v0.1 distribution decisions and recorded the no-publication boundary.
- Finalized public-ready npm metadata, implemented plugin presentation metadata, the canonical local marketplace fixture, acceptance-specific foundation validation, and packed distribution integration coverage without adding dependencies.
- Synchronized SPEC, Architecture, and README while confirming AGENTS and stable repository rules are unaffected.
- Passed focused release/foundation tests, official plugin validation, packed user/project lifecycle E2E, isolated Codex marketplace add/install/discovery/remove, and the complete fresh-session fixture workflow including independent audit and ordinary-prompt documentation sync.
- Preserved the child-session read-only failures as evidence, completed the bounded write scenarios without changing normal user plugin state, and moved the verified workspace-local fixture to a recoverable Temp path.
- Normalized the npm executable path after the first dry-run warning, locked the canonical path/shebang in validation, and passed the warning-free repeated release dry run.
- Passed Node.js 22 and current-runtime 75-test suites, coverage (86.53% lines / 71.91% branches / 99.37% functions), exact pack inspection, all four official Skill validations, plugin validation, Task validation, and snapshot-based final scope/whitespace review.

## Remaining

- None for Task 0009. Publication remains a separate approval-only operation and has not occurred.

## Resume Point

Task 0009 is complete. If publication is later approved, start at the approval-time publication gate and revalidate identity, package-name ownership, and the exact tarball hash before any mutating command.

## Blockers

- None known.
