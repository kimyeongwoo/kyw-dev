# TASK 0052 — Windows Release Evidence Harness Hardening

<!-- kyw-task-contract: 2 -->

## Status

DONE

## Goal

Create one repository-defined, development-only, cross-platform release evidence harness that safely runs and retains evidence for `npm run release:check`, especially on Windows, without alias-containment errors, root-role confusion, npm provenance ambiguity, secret retention, or loss of child exit/output evidence.

## Dependencies

- Not applicable — no hard dependency is required for this outcome.

## In Scope

- Add the development-only repository script `scripts/release-evidence-harness.mjs` and focused tests without adding a production dependency.
- Implement separate `validateEvidenceRoot` and `validateEvidenceOutput` functions with distinct errors: the external evidence root may equal itself, while every output must be a strict descendant of the canonical root.
- Reject repository overlap, sibling/prefix confusion, unsafe path types, and symlink/junction/reparse escapes by checking lexical and canonical containment before and after creation.
- Normalize Windows drive, UNC, extended-prefix, separator, case, and long/short alias identities; use `fs.realpathSync.native()` for existing paths and a narrow injectable canonicalizer or fixture identity map for deterministic alias tests.
- Record exact npm launcher path and practical file identity/hash, launcher-reported version, child `npm_execpath`, child `npm_config_user_agent`, effective composite npm version, Node executable/version, and PATH precedence.
- Make dry validation select one exact npm CLI, put an owned shim for that exact CLI first in the supplied child PATH, and prove harmless nested `npm` resolution; fail with `NPM_PROVENANCE_MISMATCH` before the gated child when provenance cannot be unified.
- Before the child, durably record source SHA, package identity/hash, Node/npm provenance, timestamps, command plan, userconfig baseline, protected-state baseline, and repository/package state.
- Immediately after the child returns, durably write raw exit code, signal, end timestamp, monotonic runtime, stdout, stderr, provenance, and raw evidence hashes before summary parsing or other post-processing.
- Preserve raw evidence after parser or post-processing failure; publish a bounded redacted summary through same-parent temporary-file write plus atomic rename.
- Provide `--self-test`, `--dry-validate`, and actual command execution modes under a caller-owned repository-external evidence root, with one release-command invocation maximum, no retry loop, and duplicate invocation rejection.
- Observe repository/package/protected state before and after without mutating credentials or normal user configuration; cleanup may remove only the exact owned root after sanitized evidence is explicitly preserved.
- Add focused tests for path roles, Windows identities, escape rejection, npm provenance, child durability, parser failure, redaction, atomicity, duplicate/no-retry behavior, cleanup ownership, and the exact dry-validation command plan.
- Minimally synchronize the development-only release-evidence boundary in `docs/ARCHITECTURE.md` and document the exact Task 0051 reuse invocation in the appropriate maintainer usage surface.

## Out of Scope

- Running `npm run release:check`, a standalone npm dry run, a registry/auth probe, or release isolation.
- Actual npm publication, registry mutation, npm login/logout/config mutation, package version change, Git tag, GitHub Release, public plugin submission, or public-directory submission.
- Model-backed commands, production dependencies, a generic process supervisor, a generic filesystem/provider abstraction, daemon, watcher, database, or background service.
- Changing the Task 0051 verdict or status, reinterpreting historical helper failures as success evidence, or creating Task 0053.
- Copying a Task 0051 external helper or stale branch file wholesale; implementation starts from the exact current `main` bytes and uses Task 0051 only as requirements/evidence.
- Modifying unrelated release/product runtime code.

## Acceptance Criteria

- [x] AC-01: A safe canonical repository-external evidence root passes `validateEvidenceRoot` without a strict-descendant error, including root equality with its own canonical identity.
- [x] AC-02: `validateEvidenceOutput` permits only canonical strict descendants and rejects root equality, siblings, prefix confusion, repository overlap, and root/repository escape.
- [x] AC-03: Windows long/short, ordinary/extended, UNC, separator, and case aliases that resolve to the same object compare as one identity without requiring host 8.3 support.
- [x] AC-04: Repository overlap and symlink/junction/reparse or injected identity escape fail closed before a child or unsafe write.
- [x] AC-05: Requested launcher, launcher identity/version, child npm environment, nested/effective npm, Node, and PATH precedence are recorded; any unresolved outer/nested/effective mismatch fails with `NPM_PROVENANCE_MISMATCH` before the gated child.
- [x] AC-06: Child stdout, stderr, exit code, signal, timestamps, and monotonic runtime remain durable even when summary parsing or later post-processing fails.
- [x] AC-07: The sanitized summary is atomically published, bounded, and free of credential-shaped values while raw evidence hashes remain available.
- [x] AC-08: `--self-test` and `--dry-validate` succeed without executing release, registry, isolation, model, publication, or public commands.
- [x] AC-09: The focused tests are reachable through the existing Stable suite on Windows, macOS, and Linux; exact hosted PASS remains external `STANDARD` delivery evidence.
- [x] AC-10: No production dependency, package publication, version/tag/Release/public submission, generic framework, or package-allowlist expansion is added.
- [x] AC-11: The exact caller-owned-root invocation contract reusable by blocked Task 0051 is documented, including supported modes, one-invocation/no-retry behavior, retained evidence, and separate approval requirements.

## Plan

- [x] Inspect the exact current-main release/test conventions and define the narrow harness CLI, path-role API, evidence layout, and provenance contract.
- [x] Implement canonical path identity, root/output validation, overlap/type/link guards, and deterministic Windows alias injection.
- [x] Implement npm provenance unification, exact command planning, one-shot child execution, durable raw evidence, redacted atomic summary, protected-state observations, and ownership-safe cleanup.
- [x] Add focused unit/integration tests and harmless self-test/dry-validation coverage for every acceptance and failure branch.
- [x] Synchronize Architecture and maintainer usage documentation, keeping the harness development-only and excluded from package bytes except intentional documentation bytes.
- [x] Run focused, Stable, canonical Task, format, lint, package-boundary, credential, changed-path, blocker-to-acceptance, and final-diff verification.
- [x] Set `DONE/PASSED` only after repository evidence is complete and hand the immutable repository outcome to ordinary exact-SHA `STANDARD` delivery without running Task 0051 or any release boundary.

## Decisions

- `validateEvidenceRoot` owns root admissibility and equality; `validateEvidenceOutput` alone owns strict-descendant output enforcement. Each returns a separate stable error code.
- Existing identities use native realpath. A narrow canonicalizer seam or fixture identity map is allowed only for deterministic Windows alias/reparse tests and must not grow into a generic filesystem provider.
- Dry validation chooses one exact npm CLI identity, places an owned exact-CLI shim first in the supplied child PATH, and proves nested resolution with a harmless probe; ambiguity blocks before the gated command.
- Raw streams and exit/provenance records are external caller-owned evidence. The repository retains only sanitized Task/Test conclusions, and cleanup requires explicit ownership and preservation proof.
- The release command plan is exactly `npm run release:check`, maximum one child invocation, with no standalone dry run, retry loop, or implicit lifecycle expansion added by this harness.
- The harness and tests are development-only and remain outside the npm package allowlist. No package version change or production dependency is justified.
- Hard dependency wording supplied by the user is preserved semantically: Not applicable — this corrective Task resolves an execution blocker discovered by blocked Task 0051; Task 0051 is related evidence, not a satisfiable hard dependency. The canonical Dependencies sentinel is used because current-contract queue grammar permits no explanatory no-dependency bullet.
- Hosted PR/main results remain in the external GitHub ledger; Task/Test records repository behavior and reproducible local evidence only.

## Risks

- Windows aliases can make lexical comparisons disagree with physical identity, and non-existent descendants can escape after creation unless both lexical and post-creation canonical checks run.
- Junction/reparse behavior and disabled 8.3 support can produce brittle tests unless identity mapping stays narrow and deterministic.
- npm shims, globally installed CLIs, PATH precedence, and nested npm invocation can silently mix versions unless every identity is recorded and proved before the child.
- A post-child parser or hashing error can erase the only useful verdict unless raw streams and exit/runtime are flushed first.
- Redaction that is too weak can retain secrets; redaction that is unbounded or destructive can make evidence unusable.
- Cleanup can delete caller data unless it is restricted to the exact unpredictable owned root with identity and complete-entry proof.

## Discoveries and Changes

- Fresh Phase B preflight fixed the implementation base at clean exact `main` SHA `acf819a062569e33d26f9f64c9b5733ebaabfbb1`; local, cached, and direct remote main matched with no staged, unstaged, or untracked path.
- Task 0051 remains valid `BLOCKED/BLOCKED`; its evidence delivery is PR #37, while its helper failures remain requirements rather than source code or success evidence.
- No Task 0052-or-higher directory, creation transaction, lock, release marker, staging residue, package version change, tag, GitHub Release, or new publication state was found before authoring.
- The only open PR is the pre-existing unrelated draft PR #3; it is outside this Task and remains untouched.
- `scripts/release-evidence-harness.mjs` now owns the narrow development-only boundary. Root and output validation are separate, existing identities use native realpath, materialized descendants are revalidated, Windows extended/case/separator/UNC identities normalize, and alias/reparse behavior uses only a narrow canonicalizer seam in deterministic tests.
- The requested Windows npm launcher reported `11.18.0`; candidate discovery also encountered the older CLI that caused Task 0051's outer/effective ambiguity, but selected only the exact `11.18.0` CLI matching the launcher. A generated shim and harmless nested probe established launcher, child, and effective npm `11.18.0` plus Node `v24.11.0` before any gated release child.
- npm lifecycle execution prepends its package-local `node_modules/.bin` entry to the child PATH even when that directory contains no npm launcher. Provenance therefore records the complete child PATH and proves that the first actually resolvable `npm` is the exact owned shim, rather than incorrectly requiring the literal first PATH entry to be the shim.
- Windows `.cmd` launcher probing requires `cmd.exe /d /s /c` with `windowsVerbatimArguments`; direct shell-free execution and the first quoted form failed safely before any gated child. These failures remain in `TEST.md` and were not reinterpreted as PASS.
- Raw child streams are redacted while being durably retained; exit/signal/end/runtime are written immediately after close, hashes follow stream finalization, parser failure leaves them intact, and a same-parent temporary summary is atomically renamed. Summary strings and whole documents are bounded.
- README now documents all three supported modes and the exact Task 0051 reuse contract. Architecture owns the path, provenance, durable-evidence, cleanup, package-exclusion, and separate-authority boundary. SPEC and AGENTS remain unaffected.
- Exact external CLI evidence under the caller-owned Task 0052 root produced `SELF_TEST_PASS` with deliberate exit `7` and `DRY_VALIDATION_PASS`; both observed protected state `CLEAN`. Their sanitized summary SHA-256 values are `70887df228aae30b9a0b7c05445b85aa887e48b2198f89c41073e0e1a469e90d` and `403b0501101665190f566d3580a669006339480a773862917e6b83b4a43c29b0`, respectively, and an external credential scan found zero credential-bearing file.
- After those sanitized conclusions and hashes were preserved here and in `TEST.md`, each external run was sealed with its exact token, identity, and complete inventory. Harness cleanup removed only those two direct children; a separate verified non-recursive removal deleted the then-empty caller root.
- Final post-hardening external reruns again produced `SELF_TEST_PASS` and `DRY_VALIDATION_PASS`, protected state `CLEAN`, launcher/selected/effective npm `11.18.0`, and Node `v24.11.0`. Final sanitized summary SHA-256 values are `a7dadeda36a9d7511fb45b7efe3e47b349993cff42f252399926f75ac705bb42` and `0f71c48c033ec39d4942c74156354a555c493d5b5cb0d2533f17a2d764a59c01`.
- The final self-test and dry-validation runs were likewise sealed at 32 and 22 inventory entries, removed by exact-token harness cleanup, and followed only by verified non-recursive removal of their empty caller root.
- The final Stable run passed 305/305 tests, lint over 72 JavaScript modules and foundation metadata, format over 296 UTF-8/LF text files, and package selection over 39 files/93,783 compressed bytes.
- Canonical validation passed all 52 numbered Task pairs. Windows-focused path/alias/junction/provenance coverage passed 5/5, focused harness coverage passed 17/17, and `git diff --check` passed.
- Final scope is exactly six paths: the Task 0052 pair, harness, focused test, README, and Architecture. Credential review found only deliberate synthetic redaction fixtures, not a retained credential. Package selection includes only the README change: +1,935 source bytes and +600 compressed bytes versus Task 0050's last recorded 39-file package check; script, test, Task, and Architecture remain excluded.
- Task 0051 was rechecked unchanged at `BLOCKED/BLOCKED`. Its root-role failure maps to AC-01/02, alias/escape requirements to AC-03/04, npm `11.6.1`/`11.18.0` ambiguity to AC-05, wrapper-after-child evidence loss to AC-06/07, guarded execution to AC-08, hosted reachability/package isolation to AC-09/10, and exact reuse guidance to AC-11.

## Documentation Impact

- SPEC: Expected unchanged; the harness is development-only evidence support and does not change product behavior or publication authority.
- ARCHITECTURE: Updated the development-only release evidence boundary, path/provenance/durability responsibilities, and package exclusion.
- README: Updated maintainer usage with supported commands and the exact Task 0051 reuse invocation because commands and usage belong there.
- AGENTS: Expected unchanged; repository-wide execution, completion, and delivery rules do not change.

## Delivery

- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.

## Completed

- Fresh preflight and complete Task/Test authoring were performed from exact clean main.
- The pair passed canonical validation, the creation transaction finalized without residue, and branch `task/0052-windows-release-evidence-harness-hardening` was created from exact base SHA `acf819a062569e33d26f9f64c9b5733ebaabfbb1`.
- The repository-defined harness, focused tests, README usage, and Architecture boundary are implemented without a dependency, package version change, package-allowlist expansion, or unrelated release/product edit.
- Focused tests currently pass 17/17. Initial and final exact external `--self-test` and `--dry-validate` executions passed without invoking `release:check`, isolation, registry/auth, publication, or model commands.
- The two retained Task 0052 runs were sanitized, recorded, sealed, and removed through ownership-proved cleanup; the verified empty caller-owned root was then removed non-recursively.
- Stable, Windows-focused, canonical all-Task, format, lint, package-boundary, credential-retention, exact-scope, Task 0051 blocker, and final diff reviews passed. Every acceptance criterion is mapped to reproducible Test evidence.

## Remaining

- None — the repository outcome is complete; mutable `STANDARD` delivery is tracked in the external GitHub ledger.

## Resume Point

- None — no repository work remains; if interrupted, resume only the external exact-SHA `STANDARD` delivery ledger.

## Blockers

- Not applicable — no blocker is known.
