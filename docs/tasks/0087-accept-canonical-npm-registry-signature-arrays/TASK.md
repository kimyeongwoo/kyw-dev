# TASK 0087 — Accept Canonical npm Registry Signature Arrays

<!-- kyw-task-contract: 4 -->

## Status

DONE

## Goal

Correct public-release npm proof so a nonempty canonical registry signature array is accepted only when every entry uses the frozen signing-key identity and cryptographically verifies the exact package, version, and integrity message, allowing Task 0086's already-published `0.2.0` release to resume without another npm publication.

## Dependencies

- Task 0086.

## In Scope

- Replace the accidental exactly-one-signature cardinality checks in existing-target tuple hydration and fresh npm-version proof with one shared invariant expressed through the existing signing-key selection and signature-verification paths.
- Accept one or more registry signatures only when every entry has the frozen key ID and verifies `${name}@${version}:${integrity}`; retain the existing aggregate `signature.keyId` / `signature.verified` snapshot shape and public-state classifier.
- Add fixture-only regression coverage for one valid signature, two valid same-key signatures, empty arrays, mixed key IDs, invalid first or later signatures, and endpoint/index identity drift without live GitHub or npm writes.
- Synchronize only the canonical product, architecture, and detailed delivery-procedure statements whose signature-proof meaning changes.
- Run focused release/hydration tests, the complete release and Stable verification graph, Task pair validation, whitespace checks, and final scope/matrix review.

## Out of Scope

- Editing or reterminalizing Task 0086, changing its release tuple, package/plugin version, merge SHA, tarball, workflow attempt, continuity state, or previously published npm object.
- Dispatching or rerunning the npm workflow, invoking `npm publish`, changing credentials/account configuration, creating a new package version, or altering dist-tags.
- Redesigning the public-release tuple, classifier, checkpoint, signing-key store, provenance verifier, dispatcher, or delivery pipeline; adding a production/runtime dependency, state store, or abstraction.
- Relaxing validation to any-one-valid, accepting mixed/unknown keys, falling back between keys, or repairing malformed registry metadata.
- Treating this Task's reasoned `NONE` delivery as authority for the separately authorized direct PR/merge or for Task 0086's later tag and Release continuation.

## Acceptance Criteria

- [x] AC-01: Existing-target hydration and fresh npm reads accept a nonempty signature array only when every entry uses the frozen registry key ID and cryptographically verifies the exact package/version/integrity message; legacy one-signature state remains accepted.
- [x] AC-02: Empty, malformed, mixed-key, wrong-key, invalid-first, invalid-later, or message/integrity-mismatched signature state fails closed, and no any-valid, first-valid, fallback-key, or cardinality-only shortcut can produce exact npm proof.
- [x] AC-03: The existing immutable endpoint/index identity comparison, current-key selection, aggregate snapshot/classifier contract, provenance proof, release ordering, one-write limits, and failure blocking remain unchanged.
- [x] AC-04: SPEC, ARCHITECTURE, and the public-release procedure describe the same nonempty/all-entry signature invariant; README, AGENTS, workflow, package/plugin metadata, and unrelated owners remain unchanged.
- [x] AC-05: Focused, `npm run release:ci`, Stable, formatting, packaging, pair, transaction, diff, and final coverage verification pass using fixtures, injected clients, or owned loopback only, with zero live GitHub/npm mutation.
- [x] AC-06: Task 0086's pair and published tuple remain immutable; this correction owns no new npm version or public release and requires no npm redispatch or republication before the separately authorized original-SHA tag and asset-free Release continuation.

## Plan

- [x] Inspect Task 0086 delivery/public state, immutable pair, source guards, current fixtures, durable owners, remote `main`, and conflicting publication surfaces.
- [x] Add the negative and positive signature-array regression matrix, then make the two minimal production guard corrections through existing verification paths.
- [x] Synchronize only affected durable/procedural owners and run focused verification.
- [x] Run the complete required verification graph, compare final diff to scope/matrix, terminalize the pair, and preserve external-mutation traces.

## Decisions

- Use current contract 4 with reasoned `NONE`: Task 0087 corrects validation for Task 0086's already-started public release but selects no new release version and owns no public mutation.
- Preserve the frozen tuple's single key identity. Multiple entries are accepted only when all use that identity and all verify; key-rotation redesign is a different outcome.
- Keep `signature.keyId` and aggregate `signature.verified` unchanged so the public classifier and state machine need no schema or behavior change.
- Verify existing-target signatures against the exact delivered package name/version and locally reconstructed tarball integrity rather than trusting mutable registry message fields.

## Risks

- Accepting any one signature would hide a malicious or malformed additional entry; every entry must pass.
- Validating only the post-publication read would still block tuple reconstruction when the target version already exists; both guards must use the same rule.
- Overbroad changes could weaken signing-key expiry/current-key constraints, immutable endpoint/index comparison, or provenance proof.
- Tests or implementation must not issue a second publish dispatch or any live tag/Release mutation before local and hosted correction verification completes.

## Discoveries and Changes

- Task 0086 is canonically GitHub-delivered at merge SHA `85f8f757e97f9ee12e63ffa6c7f07b08ddf0879f`; its OIDC workflow run `33862909430`, attempt 1, already published exact `kyw-dev@0.2.0` once.
- Canonical registry metadata exposes two signatures under the same current key ID, and both independently verify the exact npm registry signature message; npm's own signature audit also accepts the package.
- Source inspection found two accidental cardinality assumptions in `src/core/task-artifact-hydration.mjs`: existing-target tuple hydration and the fresh npm-version proof. The existing key selector, cryptographic verifier, immutable identity comparison, and aggregate classifier already supply the required primitives.
- `v0.2.0` and its GitHub Release remain absent, so no public continuation write is eligible until this correction is locally verified, merged, and proven by hosted CI.
- Both production guards now require a nonempty array and validate every entry through the pre-existing key and cryptographic verifier. The later canonical read retains the aggregate snapshot shape, while existing-target hydration verifies against the delivered package identity and reconstructed tarball integrity before freezing the key.
- Fixtures cover one valid, two independently valid same-key, empty, malformed, mixed-key, wrong-first, wrong-message, invalid-first, invalid-second, and endpoint/index-divergent arrays. The shared public runner proves two-valid npm resumes with only tag and Release fixture writes, while an invalid later entry blocks every write.

## Documentation Impact

- SPEC: Clarify that exact npm proof requires a nonempty registry signature set whose every entry matches the frozen key identity and verifies the exact message.
- ARCHITECTURE: Record all-entry verification at tuple reconstruction and canonical npm read without changing the public-release graph; synchronize the exact procedural projection in `skills/kyw-deliver/references/public-release.md`.
- README: Unchanged — commands, setup, user-visible release flow, and current-version guidance do not change.
- AGENTS: Unchanged — direct authority, immutable-pair correction, verification, and release failure rules already govern this work.

## Delivery

- Requirement: NONE — this bounded validator correction restores canonical proof for already-published Task 0086 and owns no new package version or public release.

## Completed

- Completed fresh read-only inspection and established the minimal two-guard correction, regression matrix, documentation boundary, immutable Task 0086 baseline, and no-republication constraint.
- Replaced both accidental exactly-one checks with nonempty all-entry verification through existing key, signature, immutable-identity, snapshot, and classifier paths without a new schema, store, dependency, or abstraction.
- Added the positive/negative cryptographic fixture matrix, integrated no-redispatch TAG→RELEASE resume, invalid-aggregate no-write proof, and the single changed delivery-reference assertion.
- Synchronized only SPEC, ARCHITECTURE, and the public-release procedure; preserved README, AGENTS, package/plugin metadata, workflow, Task 0086, continuity, dispatcher, and unrelated files.
- Completed focused, Release, Stable, standalone lint/format/pack, pair/transaction, immutable-blob, canonical registry/workflow, diff, and final matrix verification with no live external mutation.

## Remaining

- None — repository outcome complete.

## Resume Point

- None — repository outcome complete.

## Blockers

- Not applicable — no repository blocker is known.
