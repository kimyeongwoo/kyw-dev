# TASK 0015 — Release Metadata and Repository Hygiene

## Status

DONE

## Goal

Finalize accurate npm/plugin metadata, runtime-support policy, legal attribution, package boundaries, and repository hygiene so the release candidate describes exactly what is implemented and publishes only intended files.

## Dependencies

- `0010-continuous-integration`
- `0012-grilling-parity-and-tuning`
- `0013-filesystem-security-hardening`
- `0014-audit-readonly-contract`

## In Scope

- Complete and validate supported `package.json` metadata: name, version, description, keywords, homepage, repository, bugs, license, author/maintainer, engines, bin, files, and publish configuration where appropriate.
- Complete `.codex-plugin/plugin.json` with only fields supported by the current official plugin format, including useful interface/discovery metadata.
- Make version and product identity consistent across package metadata, plugin manifest, CLI output, install ownership metadata, README, and release scripts.
- Resolve and document the exact Node support policy across `engines`, CLI/doctor checks, CI lanes, Spec, Architecture, and README.
- Resolve the project copyright holder/author identity with explicit user confirmation rather than inventing legal identity.
- Preserve Matt Pocock upstream attribution and MIT license in source and packed distribution.
- Remove, relocate, or clearly exclude development-only artifacts such as `DOCUMENT_BUNDLE.txt`, eval fixtures/results, local marketplace fixtures, generated tarballs, and local paths.
- Add a verified CI badge or status reference only after the workflow exists and is green.
- Re-run packed-content and metadata validation without publishing.

## Out of Scope

- Running `npm publish`.
- Creating GitHub tags/releases.
- Submitting to a public Codex plugin directory.
- Adding general contributor/governance documents not needed for release correctness.
- Renaming the `kyw-dev` product unless the npm name is actually unavailable at release time.

## Acceptance Criteria

- [x] AC-01: Package metadata is complete, syntactically valid, points to the real public repository, and contains no placeholder owner/contact values.
- [x] AC-02: Plugin manifest passes current official validation and exposes accurate supported interface metadata without unsupported fields.
- [x] AC-03: Version, plugin name, CLI command, package name, and displayed product identity are consistent everywhere they must be.
- [x] AC-04: Node support is explicit and consistent across `engines`, runtime checks, doctor, CI, Spec, Architecture, and README.
- [x] AC-05: The copyright holder and author/maintainer metadata are explicitly confirmed by the user and reflected consistently.
- [x] AC-06: Matt Pocock attribution and upstream MIT text are present in every distributed location required by the license.
- [x] AC-07: `npm pack --dry-run --json` and a real tarball contain all required plugin/Skill/runtime/legal files and exclude development-only, generated, secret, and local-path artifacts.
- [x] AC-08: `DOCUMENT_BUNDLE.txt` and equivalent bootstrap artifacts are removed, relocated, or excluded according to an intentional documented decision.
- [x] AC-09: README installation, support, CI, audit-mode, and “not yet published” claims match the actual release state.
- [x] AC-10: No registry publication, tag, release, or plugin-directory submission occurs.

## Plan

- [x] Inventory all product/version/runtime/author/repository metadata occurrences.
- [x] Ask the user exactly one focused question for unresolved legal author/copyright identity.
- [x] Recheck current official Codex plugin/Skill metadata requirements and npm package rules using primary sources.
- [x] Normalize package and plugin metadata, version synchronization, and runtime support.
- [x] Remove or exclude bootstrap/eval/generated artifacts and verify package boundaries.
- [x] Confirm legal notices in source and real tarball.
- [x] Update README and durable documents to actual verified behavior and release state.
- [x] Run metadata, package, CI, and full regression checks without publishing.

## Decisions

- Do not infer a legal name from a GitHub username. Obtain explicit user confirmation for copyright/author fields.
- Keep product, plugin, CLI, and preferred npm identity `kyw-dev`; use a scoped npm fallback only if availability is rechecked and the unscoped name is unavailable.
- Include only metadata fields supported by the current official schemas; do not copy speculative examples blindly.
- Development-only eval and fixture material must not enter the public tarball unless runtime execution truly requires it.
- The user confirmed `Kim Yeongwoo` as the exact legal author and copyright-holder name. Keep `kyw-dev` as the product, plugin, package, and CLI identity.
- Keep the release candidate at `0.1.0`; it has not been published, and package/plugin/CLI/install metadata already derive or validate that version consistently.
- Keep Node support at `>=22`: Node.js 22 and 24 are required LTS CI lines, while Node.js 26 remains a bounded Linux compatibility lane.
- Use the verified public repository `https://github.com/kimyeongwoo/kyw-dev`; omit unconfirmed email/contact metadata. Do not add a source-maintained `maintainers` field because npm derives registry maintainers at publication time.
- Delete the obsolete tracked `DOCUMENT_BUNDLE.txt` bootstrap inventory. Keep eval sources, raw/generated results, local marketplace fixtures, tests, credentials, generated tarballs, and local paths outside the positive npm `files` allowlist.

## Risks

- npm name availability can change between this Task and actual publish.
- Plugin metadata formats can change; validate against current official docs and installed tools.
- Incorrect legal identity cannot be safely guessed.
- A broad `files` change can accidentally omit runtime support or include private/generated artifacts.

## Discoveries and Changes

- Pre-change inspection found a dirty worktree containing user-authored Task 0011 through 0014 work and related implementation/documentation changes. Preserve those changes and limit Task 0015 edits to release metadata, packaging hygiene, release verification, current Task/Test evidence, and affected permanent documents.
- On 2026-07-18 the user explicitly confirmed the exact legal name `Kim Yeongwoo`; the product identity remains `kyw-dev`.
- `git remote` and read-only `gh repo view` verified the public repository as `https://github.com/kimyeongwoo/kyw-dev`, with `main` as its default branch and GitHub issues as the real bug-report surface.
- `npm view kyw-dev ... --json` returned registry E404 on 2026-07-18. This supports the preferred unscoped package name for this release candidate but does not reserve it; Task 0016 must recheck it at its own final gate.
- The current official Codex manual pages `https://learn.chatgpt.com/docs/build-plugins` and `https://learn.chatgpt.com/docs/build-skills` confirm `.codex-plugin/plugin.json`, the supported optional manifest/interface fields used here, `SKILL.md` `name`/`description`, and `agents/openai.yaml` interface/policy metadata. The bundled current plugin validator passed the pre-change manifest, and all four Skill validators passed under UTF-8 mode.
- npm CLI 11.18.0 official `package.json` and `npm pack` documentation confirms full repository objects, optional author email/URL, positive `files` allowlists, always-included package/README/LICENSE/bin files, `engines`, `publishConfig`, dry-run JSON reports, and isolated `--pack-destination` output.
- The repository-wide search found release metadata placeholders in package/plugin author fields, `LICENSE`, README, Spec, and validation assertions; absent public repository/homepage/issues fields; an obsolete tracked `DOCUMENT_BUNDLE.txt`; packed README references to the machine-local checkout name `kyw_dev`; historical absolute paths only in development-only Task evidence; and no generated tarball or credential file in the current repository inventory.
- Node support was already consistent before implementation: package engine `>=22`, runtime/doctor floor 22, Node 22/24 cross-platform CI, Node 26 Linux compatibility, and matching README/Spec/Architecture text. Task 0015 adds explicit boundary and drift coverage rather than changing the policy.
- No successful hosted `main` workflow exists for the final Task 0015 bytes, so README intentionally has no CI badge. The workflow contract and local release gate are verified, but a badge would overstate the current hosted evidence.
- Final package inspection found no credential-like filename or content in the repository, no generated `.tgz`, and no release-surface placeholder. Remaining absolute paths are historical Task evidence or synthetic cross-platform test values; all are outside the positive package boundary. The old checkout spelling `kyw_dev` remains only in historical Task 0001 evidence and this Task's discovery record.

## Documentation Impact

- SPEC: Updated the confirmed legal author, public repository/issues identity, release-product identity, and explicit tarball exclusions. Runtime behavior and acceptance policy remain unchanged.
- ARCHITECTURE: Updated the repository root spelling, release metadata sources of truth, positive package boundary, legal checks, and development-only exclusions.
- README: Updated the public source/issues links, clone/layout examples, release-candidate status, official Codex references, legal identity, and publication claim. No CI badge was added because the final bytes have no successful hosted `main` run.
- AGENTS: Unchanged. The repository-wide rules and four stable verification commands remain accurate.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the four permanent documents, current Task/Test pair, and completion state of the four explicit dependencies.
- Captured the pre-change Git status and repository metadata, inventoried every requested metadata/hygiene category, and verified the public GitHub repository plus current npm-name result without changing external state.
- Obtained and recorded the user's explicit `Kim Yeongwoo` legal-identity decision.
- Rechecked current Codex plugin/Skill metadata and npm package/pack rules from official primary sources and ran the current local official validators.
- Normalized `package.json`, plugin manifest, project license, CLI/document identity, public URLs, and `>=22` runtime assertions around `kyw-dev` `0.1.0` and `Kim Yeongwoo`, without inventing contact or maintainer fields.
- Deleted obsolete `DOCUMENT_BUNDLE.txt`, retained development-only material outside the positive npm `files` allowlist, and added repository ignores for generated tarballs and common local credential configuration.
- Strengthened foundation, CI, distribution, and packed-release checks for supported manifest keys, exact metadata agreement, Node boundary behavior, legal hashes, forbidden roots, credential patterns, and local absolute paths.
- Generated, extracted, and inspected a real 29-file tarball. It passed direct-install and isolated Codex marketplace lifecycles, retained the project and Matt Pocock MIT notices, excluded every named development/local artifact class, and was deleted with its temporary extraction directory after verification.
- Ran the full local release gate plus official plugin and all four Skill validators. Reviewed the final Task-scoped diff and repository-wide hygiene scan; detailed command evidence is in `TEST.md`.

## Remaining

- None.

## Resume Point

Task 0015 is complete. Preserve the pre-existing Task 0011 through 0014 worktree changes; no publication, tag, GitHub release, public plugin submission, or Task 0016 work was performed.

## Blockers

- None.
