# TASK 0010 — Continuous Integration

## Status

IN_PROGRESS

## Goal

Add a least-privilege, cross-platform GitHub Actions CI gate that continuously proves the repository's stable checks and packed release candidate without publishing anything.

## Dependencies

- `0009-distribution-and-release`

## In Scope

- Add one or more workflows under `.github/workflows/` for pull requests, pushes to `main`, and optional manual dispatch.
- Use minimal workflow permissions, concurrency cancellation for superseded branch runs, explicit timeouts, and deterministic command output.
- Run the stable repository checks on Linux, macOS, and Windows against the supported Node.js policy.
- At minimum, exercise Node.js `22.x` and `24.x`; inspect the current support promise and add a bounded `26.x` compatibility lane if the repository still claims generic `>=22` support.
- Run a separate packaging/release-readiness job from packed contents on a supported Linux LTS lane.
- Keep required CI independent of Codex authentication, npm publication credentials, and mutable user configuration.
- Make the hosted workflow result a required piece of Task evidence rather than relying only on local success.
- Update durable documentation when the supported runtime policy or verification commands change.

## Out of Scope

- Publishing to npm.
- Creating a GitHub release or tag.
- Running paid/model-backed grilling evaluations in public CI.
- Automatically changing repository branch-protection settings.
- Adding unrelated build systems or package dependencies.

## Acceptance Criteria

- [ ] AC-01: A GitHub Actions workflow runs for pull requests and pushes to `main`, supports manual dispatch where useful, uses `contents: read` by default, and cancels superseded runs for the same ref.
- [ ] AC-02: Required CI runs on `ubuntu-latest`, `macos-latest`, and `windows-latest` for the documented supported LTS Node.js lines.
- [ ] AC-03: Every required matrix lane executes the repository's stable test, lint, formatting, and packaging checks without relying on secrets.
- [ ] AC-04: A separate Linux packaging lane creates and inspects the real npm tarball, runs the CI-safe release checks, and cannot publish.
- [ ] AC-05: Windows and macOS lanes exercise path-sensitive CLI and installation tests rather than silently skipping them.
- [ ] AC-06: The workflow and package scripts agree on Node support, command names, and exit behavior.
- [ ] AC-07: At least one real hosted run for the implementation commit finishes successfully, or the Task remains `BLOCKED` with the missing remote evidence recorded.
- [ ] AC-08: README, Spec, Architecture, and AGENTS are changed only where their durable truth is affected.

## Plan

- [x] Inspect `package.json`, current scripts, lockfile policy, test portability, and existing release checks.
- [x] Confirm the supported Node.js lines against the current project promise and official Node.js release status.
- [x] Design required matrix lanes and a separate packaging lane with least privilege and bounded timeouts.
- [x] Implement the workflow without adding publication credentials or model-backed checks.
- [x] Fix platform-specific test assumptions exposed by Linux, macOS, or Windows. No implementation fix was required before hosted execution; the existing native install/distribution paths have no platform-wide skip.
- [x] Run every underlying command locally and inspect the workflow diff.
- [ ] Push the branch only when authorized and capture the real hosted run evidence.
- [ ] Synchronize affected durable documents and finish the final coverage review.

## Decisions

- Required CI must remain credential-free and reproducible for external pull requests.
- Node.js 22 and 24 are the required LTS baselines for this Task. If the product continues to claim support for all versions `>=22`, add a clearly classified Node.js 26 compatibility lane or narrow the public support statement consistently.
- Do not run `npm ci` merely by convention when the repository intentionally has no dependency lockfile. Inspect and document the actual install policy.
- A remote workflow run is evidence; a locally plausible YAML file is not sufficient for a final PASS.
- Keep the existing `>=22` runtime floor. Run Node.js 22 and 24 across Linux, macOS, and Windows, plus one bounded Ubuntu Node.js 26 compatibility lane while 26 is Current.
- Use the current official major releases `actions/checkout@v6` and `actions/setup-node@v6`, disable checkout credential persistence and setup-node package-manager caching, and install no dependencies because the repository has neither dependency declarations nor a lockfile.
- Add a credential-free `release:ci` package script for the hosted packed gate. Keep the approval-only `release:check` dry run separate from CI so the workflow contains no publish command or registry credential path.

## Risks

- Windows shell and path semantics may expose assumptions hidden by local Linux/macOS testing.
- `npm run release:check` may contain checks that require a local Codex CLI; CI may need a safe split between credential-free required checks and manual environment-specific checks.
- Overly broad workflow permissions or secret exposure would make the CI itself a supply-chain risk.
- A large Cartesian matrix can waste runner time; keep only support-relevant lanes required.

## Discoveries and Changes

- Pre-change inspection on 2026-07-17 found no tracked or staged diff on `main`; Task directories 0010 through 0016 were untracked user content. Task 0010 is in scope, while 0011 through 0016 remain preserved and unread.
- The repository has no dependency or devDependency declarations, no package-manager lockfile, and no existing `.github/workflows/` implementation. The four stable scripts are `test`, `lint`, `format:check`, and `pack:check`; `release:check` is a non-publishing npm dry run.
- The actual distribution suite creates and extracts an npm tarball, runs isolated user/project install-update-doctor-uninstall paths before any optional Codex check, and skips only the isolated marketplace portion when the Codex CLI is unavailable. Path-dialect and native filesystem tests already cover POSIX/Windows construction plus real temporary-directory installation behavior.
- The official Node.js release page reports Node.js 22 and 24 as LTS, Node.js 26 as Current, and Node.js 23/25 as EOL on 2026-07-17: https://nodejs.org/en/about/previous-releases
- GitHub's current hosted-runner reference supports `ubuntu-latest`, `macos-latest`, and `windows-latest`; the official action repositories identify checkout v6 and setup-node v6 as their current majors. GitHub's workflow syntax documents top-level `contents: read` permissions and same-workflow/ref concurrency cancellation.
- `gh auth status` confirms the repository owner account is authenticated with `repo` and `workflow` scopes, the public repository has Actions enabled, and no current PR exists. Hosted evidence remains pending implementation, commit, push, and a draft PR run; no merge is authorized.
- `.github/workflows/ci.yml` now defines seven stable lanes, a separate packed release lane, and one aggregate credential-free gate. The workflow references no secret, write permission, install command, publish command, Codex credential, tag, release, or merge operation.
- `release:ci` reuses the stable suite and then creates a real npm tarball in a validated system temporary directory, checks the exact 29-file allowlist and reported size, extracts the packed bytes, rejects lifecycle/development-only content, and smoke-tests the packed CLI before cleanup. The approval-only `release:check` now builds on that command and adds only the existing npm publication dry run.
- No production or development dependency was added.
- The first full `npm test` run exposed one stale README regression assertion that still required `Tasks 0001 through 0009`; the product document now correctly includes Task 0010. The assertion is an in-scope documentation-contract update, not a runtime defect.
- Updating that single assertion restored the focused kyw-task suite (11/11) and the complete test suite (78/78); the independently rerun package allowlist check also passed.

## Documentation Impact

- SPEC: Clarify the durable supported-runtime verification policy: Node.js 22/24 LTS across all three OS families and bounded Node.js 26 Current compatibility on Linux.
- ARCHITECTURE: Record the CI/release gate boundary, matrix topology, packed-byte inspection, and credential-free required-check design.
- README: Add the CI runtime/platform policy, dependency-free setup behavior, and the credential-free packed release command.
- AGENTS: Unchanged unless implementation changes one of the four stable repository-wide commands; the current design does not.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the four permanent documents, Task 0010 pair, explicit Task 0009 dependency, package metadata/scripts, validation scripts, distribution tests, path-sensitive installation/Task tests, and runtime support checks.
- Inspected pre-change Git status/diff, branch/remote state, lockfile/dependency policy, test skip conditions, and current GitHub authentication/Actions availability while preserving all future Task directories.
- Confirmed the current Node.js release lines, GitHub-hosted runner labels, workflow permission/concurrency model, and official checkout/setup-node major versions from first-party sources.
- Created the isolated local branch `task/0010-continuous-integration`; no commit, push, PR, publication, tag, release, or merge has occurred.
- Implemented the workflow, packed-content release checker, package-script/foundation contract, and three acceptance-specific CI tests.
- Passed the focused CI/distribution/foundation command (6/6) and the standalone real packed-content check on the local Windows runtime.
- Synchronized README, Spec, and Architecture for the runtime matrix, dependency-free CI setup, and packed release boundary; kept AGENTS unchanged because the four stable commands and repository-wide rules did not change.
- Preserved the first full-suite failure, updated the stale README regression assertion, and passed its focused rerun plus the complete 78-test suite.
- Passed the aggregate local stable gate and the credential-free packed release gate on Node.js 24, including a real 29-file tarball with no persistent artifact.
- Reviewed the complete tracked diff and every new Task 0010 file; implementation, tests, scripts, and the three affected durable documents remain within scope, while AGENTS and future Tasks are untouched.
- Staged exactly 12 Task-owned paths (607 insertions, 11 deletions) with no unstaged change; the six future Task directories remain untracked and excluded. Cached whitespace review and the terminal focused CI/format checks pass.

## Remaining

- Stage and commit only Task 0010-owned paths, push the implementation branch, open a draft PR, and inspect every required hosted lane.
- If hosted evidence passes, record the implementation SHA/run URL and conclusions, complete the final acceptance/diff matrix, and move the Task/Test pair to its evidence-backed terminal state.

## Resume Point

Stage only the reviewed Task 0010 path set, verify the cached diff, commit and push the implementation branch, then open a draft PR to trigger the new workflow. Do not stage or inspect Task 0011 through 0016.

## Blockers

- A hosted GitHub Actions run cannot exist until the workflow commit is pushed and a pull request triggers the new workflow. Keep AC-07 and T-07 blocked until the real run is inspected.
