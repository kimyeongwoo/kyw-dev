# TASK 0067 — Correct the npm OIDC Release Contract and Preserve gitHead

<!-- kyw-task-contract: 3 -->

## Status

DONE

## Goal

Correct the repository-owned npm Trusted Publishing contract so routine releases authenticate only through one exact-main GitHub Actions OIDC publish, publish from a real Git checkout directory so npm can derive `gitHead`, and fail closed without per-release npm account reauthentication, retry, or credential fallback.

## Dependencies

- Task 0065.

## In Scope

- Preserve Task `0066` and its delivered `BLOCKED/BLOCKED` chronology byte-for-byte as the immutable causal evidence for this correction.
- Replace the normal-release requirement for authenticated npm account/settings inspection, `npm login`, OTP, security-key authentication, or `npm trust list` with repository-owned expected Trusted Publisher metadata and exact delivered `.github/workflows/publish.yml` bytes.
- Define the expected tuple as GitHub Actions owner `kimyeongwoo`, repository `kyw-dev`, workflow `publish.yml`, and environment `npm-production`; validate all tuple projections from one repository-owned owner.
- Make a successful actual OIDC publish job the canonical runtime proof that npm accepted the Trusted Publisher identity. Reserve account-side authentication for initial setup, an explicitly authorized security/configuration audit or change, or investigation after an actual OIDC/publisher failure.
- Change the production publish input from a retained `.tgz` file to the package directory in the exact checked-out Git repository while preserving exact-main/SHA/version gates, provenance, public access, environment protection, package inspection, and post-publication byte proof.
- Add a real automated fixture that creates and commits a temporary Git repository, invokes the actual npm CLI against an owned loopback registry, captures the submitted packument and tarball, and proves directory publication supplies the exact commit as `gitHead`.
- Add a tarball-input negative control proving that publishing a prebuilt `.tgz` does not synthesize `gitHead`; do not emulate success by adding a `gitHead` field to `package.json` or changing registry metadata after publication.
- Enforce one-attempt fail-closed behavior: no automatic retry, second dispatch, `NPM_TOKEN` or long-lived-token fallback, local/direct publish, interactive authentication, or alternate dist-tag path after an OIDC/publisher failure.
- Synchronize README, SPEC, and ARCHITECTURE owner sections for the corrected durable release/authentication/data flow; leave AGENTS unchanged unless repository-wide routing or authority semantics actually change.
- Run focused workflow, release-harness, fixture, documentation, and credential-leak coverage plus the stable commands and `STANDARD` exact-SHA delivery.

## Out of Scope

- Publishing, republishing, unpublishing, deprecating, or changing a dist-tag for `0.1.2` or any other public version.
- Dispatching or rerunning `publish.yml`, creating a second workflow attempt, or using local `npm publish` against the public npm registry.
- Editing, reopening, reterminalizing, or declaring success for Task `0066`.
- Bumping the repository to `0.1.3`; preparing that candidate and performing its public publication are separate dependent Tasks.
- Changing npm account settings, the configured Trusted Publisher, package owners, 2FA policy, Git tags, GitHub Releases, or public plugin submission.
- Treating a fixture-only credential scoped to an owned loopback registry as an allowed production credential or fallback.
- Unrelated runtime features, dependency additions, lifecycle scripts, Task queue semantics, or broad cleanup.

## Acceptance Criteria

- [x] AC-01: Durable release truth states that routine releases require no authenticated npm account/settings inspection; account-side authentication is limited to initial setup, explicit audit/configuration change, or investigation of an actual OIDC/publisher failure.
- [x] AC-02: One repository-owned expected tuple projects `kimyeongwoo/kyw-dev`, `publish.yml`, and `npm-production`, and tests validate it against the exact delivered workflow bytes without contacting authenticated npm account surfaces.
- [x] AC-03: `publish.yml` publishes the package directory from its exact real Git checkout, retains exact-main/SHA/version and provenance gates, and contains no public-registry token, interactive auth, tarball-input publish, automatic retry, second dispatch, or fallback path.
- [x] AC-04: A real temporary-Git/loopback-registry fixture using the actual npm CLI proves directory publication emits the exact commit as registry `gitHead` and submits tarball bytes matching the independently inspected directory candidate.
- [x] AC-05: The same fixture includes a prebuilt-tarball control that omits synthesized `gitHead`, and guards reject `package.json` fabrication or registry post-processing as a solution.
- [x] AC-06: OIDC or publisher rejection has exactly one permitted outcome: the workflow fails and the executing Task records `BLOCKED`; no retry, alternate credential, direct publish, or account reauthentication occurs automatically.
- [x] AC-07: README, SPEC, ARCHITECTURE, workflow/release tests, and credential scans agree on the corrected authentication and Git-checkout publication contract while Task `0066` remains byte-immutable.
- [x] AC-08: Focused checks and `npm test`, `npm run lint`, `npm run format:check`, and `npm run pack:check` pass; no registry, workflow-dispatch, dist-tag, tag, Release, account-setting, or submission mutation occurs.
- [x] AC-09: Final diff/coverage, pair validation, transaction cleanliness, and `STANDARD` delivery prove the correction on exact `main` before the version-preparation dependency becomes eligible.

## Plan

- [x] Revalidate Task `0066` immutable evidence, Task `0065` dependency delivery, exact main/workflow state, public registry state, and clean Task transaction state without authenticated npm account inspection.
- [x] Trace the official npm CLI directory-versus-tarball publish paths and codify the corrected authentication, expected-tuple, and fail-closed contract.
- [x] Implement the real Git checkout directory publish path and remove per-release account-authentication requirements and tarball-input publication.
- [x] Build the actual npm CLI loopback fixture with directory-positive and tarball-negative controls, exact commit/tarball assertions, bounded temporary state, and no public mutation.
- [x] Update focused tests and affected durable documents, then run the complete planned verification set.
- [x] Compare final diff to the matrix, verify Task `0066` immutability and excluded external state, validate the pair/transaction, and complete the repository side of the `STANDARD` exact-SHA handoff.

## Decisions

- Depend on Task `0065`, the last satisfied release-path contract. Task `0066` is immutable causal evidence but cannot be a hard dependency because `BLOCKED/BLOCKED` never satisfies the repository dependency predicate; depending on it would make recovery permanently ineligible.
- Use three Tasks because workflow/contract correction, version-specific candidate delivery, and authorized external publication have distinct dependency and mutation boundaries.
- Follow official npm CLI behavior: directory specs run package preparation including Git-head discovery, whereas tarball specs read the archived manifest and cannot synthesize repository `gitHead`.
- Keep expected publisher identity repository-owned and static for routine preflight. Runtime authentication truth comes from npm accepting the GitHub-issued OIDC identity during the actual publish job.
- Publish from `.` in the exact checked-out repository and independently inspect candidate/public bytes. Do not add synthetic manifest metadata or modify registry records.
- A loopback fixture may use an isolated fixture-only auth value if the npm CLI requires one to submit to the fake registry; production workflow and configuration must remain free of npm credentials.

## Risks

- Directory publication repacks the project; fixture and workflow evidence must prove the inspected candidate and submitted/public tarball remain byte-identical.
- A shallow or detached checkout can expose Git metadata differently; the workflow and fixture must assert the exact expected commit and fail if Git-head discovery disagrees.
- Tests can accidentally prove a mocked helper rather than npm behavior; the acceptance requires the actual npm CLI and captured registry request.
- Removing account inspection must not weaken static tuple/workflow validation or make publisher mismatch invisible after a failed run.
- A credential fallback hidden in environment, user config, retry wrapper, or setup action would violate fail-closed behavior and must be covered by scans and isolation.

## Discoveries and Changes

- Task `0066` recorded one successful `publish.yml` run at exact main SHA `60b3270e679bb9794de8c1fd40be3286cfd73dda`, run `30530304990`, attempt `1`; public tarball, integrity, signature, and SLSA provenance match, but registry metadata lacks required `gitHead`.
- The immutable `0.1.2` defect leaves Task `0066` honestly `BLOCKED/BLOCKED`; its evidence was delivered without success reinterpretation by PR `#54` to main `b3f22f94781c6298afb9076afdecf7a0efc7e99d`.
- Authoring-time public npm state lists `0.1.0`, `0.1.1`, and `0.1.2`, with `latest=0.1.2`; `kyw-dev@0.1.3` returns `E404`.
- Official npm CLI source shows directory publication calls package preparation, whose normalization includes `gitHead` derived from `.git/HEAD` and refs; tarball publication instead consumes the archived manifest.
- Existing repository truth publishes the retained `.tgz` and asks for fresh identity checks during normal release preflight; both meanings require correction.
- Implementation began on 2026-07-31 from local/cached/direct/GitHub-aligned `main` at `b3f22f94781c6298afb9076afdecf7a0efc7e99d`; the selected/dependency/causal-evidence pairs validate and Task transaction inspection reports `NONE / NO_TRANSACTION_EVIDENCE`.
- The sole packaged dispatcher call for `$kyw-impl 0067` selected Task `0067` for `IMPLEMENT`, classified Tasks `0030`–`0065` as durable continuity, found no uncovered prior delivery, and returned no continuity transition.
- Task `0066` remains tracked and byte-identical to `main`: SHA-256 is `7bcb1d64417a25a2d1f88342806288a3dca8288d330a5a088cf922168664b9b7` for `TASK.md` and `5040e617ea3ef796f0bb91a899a9ff8f29e3426dca30f9f37ae830cbec1277c2` for `TEST.md`.
- Execution-time public registry reads still list `0.1.0`, `0.1.1`, and `0.1.2`, keep `latest=0.1.2`, omit `0.1.2` `gitHead`, and show no `0.1.3`; no authenticated npm account surface was contacted.
- Local, `HEAD`, and GitHub `main` workflow blobs all equal `74c393fa6e342b7cd1db2ef99489d6e7cc465533`; GitHub still shows the single historical publish run `30530304990` at attempt `1`, with no tag or Release.
- Current npm `11.18.0` and official current npm CLI source agree on the required branch: directory specs call `pkg.prepare()` and its `gitHead` preparation step, while tarball/file specs read the archived manifest through `pacote.manifest()`.
- Task `0068` and `0069` are the pre-created dependent authoring set for later version preparation/publication; this delivery carries their `READY/READY` pairs without executing or semantically editing either Task.
- The workflow now reconfirms exact `HEAD` and a clean real checkout immediately before `npm publish . --access public --ignore-scripts --registry=https://registry.npmjs.org/`; the independently created/verified candidate and post-publication byte proof remain unchanged.
- `TRUSTED_PUBLISHER_EXPECTATION` is the single repository-owned tuple/workflow-path owner. Foundation and focused workflow tests project its exact values into the delivered workflow and reject tarball input, retries, alternate tags, production credentials, account-authentication commands, and manifest/registry fabrication.
- The actual npm `11.18.0` loopback fixture passed both controls: directory publication emitted the temporary repository's exact commit as `gitHead` and uploaded candidate-identical bytes, while publication of the same prebuilt tarball omitted synthesized `gitHead`.
- README, SPEC, and ARCHITECTURE now agree that routine release preflight is repository-owned and unauthenticated, actual OIDC acceptance is runtime proof, account access is exceptional, and publisher failure has only the `BLOCKED` path. AGENTS remains byte-stable.
- The exact changed-path planner selected `RELEASE`; the final focused suite passed 52/52, Stable verification passed 395 tests with 392 passes and three explicit skips plus lint/format/pack checks, and `release:ci` produced the same 43-file / 129,307-byte candidate at SHA-256 `870b642a6a75c1b3c7338669722242dfa9b75acf05fd84d99459b94061ce845b`.
- The four pre-created Task `0068`/`0069` files required one trailing LF each for the repository format contract. Removing that final LF reproduces their exact pre-implementation SHA-256 values, so their semantic bytes and `READY/READY` states are unchanged.
- Final isolated public reads still show versions `0.1.0`–`0.1.2`, `latest=0.1.2`, absent `0.1.2` `gitHead`, and `E404` for `0.1.3`; GitHub still shows only run `30530304990` attempt `1`, no tags, and no Releases. The audit cache was removed after inspection.

## Documentation Impact

- SPEC: Replace normal authenticated publisher inspection and retained-tarball publication requirements with repository-owned tuple/workflow validation, actual OIDC acceptance proof, real-Git directory publication, and fail-closed recovery.
- ARCHITECTURE: Change the durable authentication/data flow from account inspection plus tarball handoff to static expected tuple plus exact-workflow bytes, actual OIDC proof, and exact-checkout directory publication.
- README: Explain that routine releases do not repeat npm login/OTP/security-key/settings authentication and state the narrow anomaly/setup conditions that can require account-side authentication.
- AGENTS: Expected unchanged — publication authority, serial Task execution, immutable evidence, and failure handling already remain repository-wide rules.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
- External publication authority: none — this Task may use only an owned loopback registry fixture and must not dispatch or mutate public npm.

## Completed

- Loaded and reconciled the repository rules, complete implementation procedure, selected Task/Test pair, hard-dependency Task `0065`, immutable causal-evidence Task `0066`, and targeted permanent-document owner sections.
- Validated all three pairs, clean Task transaction state, exact local/direct/GitHub `main` and workflow alignment, public registry/version state, Task `0066` hashes, and excluded tag/Release/workflow-run surfaces read-only.
- Inspected the delivered workflow, tuple owner, workflow/foundation/instruction/release tests, and official plus installed npm CLI directory-versus-tarball publication paths.
- Executed the sole dispatcher call, created `task/0067-correct-the-npm-oidc-release-contract-a-678d4dc2` from aligned `main`, and entered `IN_PROGRESS/RUNNING`.
- Replaced production tarball publication with clean exact-checkout directory publication, centralized the expected publisher tuple, and strengthened workflow/foundation failure and credential guards.
- Added the actual npm CLI temporary-Git/owned-loopback fixture with raw packument and attachment capture, directory-positive and prebuilt-tarball-negative controls, anti-fabrication assertions, time/body/output bounds, and owned cleanup.
- Synchronized README, SPEC, and ARCHITECTURE while preserving AGENTS and the Task `0066` pair byte-for-byte.
- Preserved all initial focused/format failures, corrected only their scoped causes, and passed the final 52-test focused set, exact `RELEASE` plan, all four Stable commands, and `release:ci`.
- Completed final public-registry/GitHub/tag/Release reads, pair/transaction validation, Task `0066` hashes, future-pair semantic-byte proof, document-delta review, full 15-path scope mapping, and whitespace/status inspection without external mutation.
- Entered `DONE/PASSED`; repository acceptance is complete and `STANDARD` remains the separate external delivery gate.

## Remaining

- None — repository outcome complete; external `STANDARD` delivery remains the separate queue gate.

## Resume Point

- None — repository outcome complete; continue only through the declared `STANDARD` delivery gate.

## Blockers

- Not applicable — no repository blocker is known. Public publication remains unauthorized and intentionally absent; only the declared `STANDARD` delivery gate remains.
