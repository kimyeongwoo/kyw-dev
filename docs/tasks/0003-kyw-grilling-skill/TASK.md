# TASK 0003 — kyw-grilling Skill

## Status

DONE

## Goal

Implement the reusable, explicitly invoked one-question-at-a-time grilling Skill with proper upstream attribution.

## Dependencies

- `0002-template-contracts` (transitively includes `0001-plugin-foundation`)

## In Scope

- Create `skills/kyw-grilling/SKILL.md`.
- Create `skills/kyw-grilling/agents/openai.yaml` with explicit invocation policy.
- Encode dependency-ordered decision-tree interviewing.
- Require one question per turn, a recommended answer, repository fact inspection, user-owned decisions, and confirmation before action.
- Keep the Skill stateless and fileless by itself.
- Include and verify Matt Pocock MIT attribution in package output.
- Add scenario-based contract checks or documented manual evaluation cases.

## Out of Scope

- Creating permanent project documents.
- Creating Task/Test artifacts.
- Implementing the user's plan.

## Acceptance Criteria

- [x] AC-01: The Skill is discoverable as `kyw-grilling` and is not implicitly invoked.
- [x] AC-02: A scenario transcript asks exactly one decision question at a time and includes a recommendation.
- [x] AC-03: Facts available in a fixture are inspected instead of being asked.
- [x] AC-04: No file mutation occurs before or after the interview when invoked alone.
- [x] AC-05: The Skill does not act until shared understanding is confirmed.
- [x] AC-06: Third-party notices and upstream MIT license are included in the packed package.

## Plan

- [x] Review the upstream `grilling` and `grill-me` behavior and license.
- [x] Write a concise Skill contract and explicit stop conditions.
- [x] Add OpenAI UI/invocation metadata.
- [x] Create evaluation scenarios covering facts, decisions, dependency order, and confirmation.
- [x] Run static/packaging checks and record results.

## Decisions

- Follow `docs/SPEC.md` and `docs/ARCHITECTURE.md`; record any necessary deviation before implementing it.
- Keep production dependencies at zero. The interview is an instruction-only workflow and needs no runtime helper.
- Combine the upstream model-invoked `grilling` protocol and explicit-only `grill-me` wrapper into this repository's single explicit-only `kyw-grilling` Skill.
- Interpret “fileless” as a zero-write boundary, not a zero-read boundary: use read-only repository/tool inspection to establish facts, but never create, edit, rename, move, or delete files.
- End a standalone invocation after the user confirms the shared-understanding summary. Do not materialize or implement the result; wrapper Skills own those later mutations.

## Risks

- A vague description could trigger incorrectly or be hard to find.
- Wrappers need a reliable way to invoke or apply the primitive without duplicating it.
- Too much interview state in the Skill can crowd the user conversation.

## Discoveries and Changes

- The supplied workspace has no Git metadata, so `git status` and Git-native working-tree diff commands cannot run. A scoped 13-file pre-change snapshot was created at `C:\Users\DEVHAM~1\AppData\Local\Temp\kyw-dev-task0003-before-1784205750470`; final review will use no-index diffs and hashes for the 0003 files only, preserving the user's explicit read boundary.
- Pre-change `npm run check` passed: 21/21 tests, 13 JavaScript modules, 60 UTF-8/LF text files, and the exact 25-file tarball allowlist at 16,139 bytes.
- The current official Codex Skill guidance confirms `SKILL.md` with `name` and `description`, `$` explicit invocation, `agents/openai.yaml`, and `policy.allow_implicit_invocation: false`. It also recommends focused, imperative, instruction-only Skills where deterministic scripts are unnecessary.
- The current upstream `grilling` Skill owns the reusable loop (dependency-ordered decisions, one question, recommendation, fact inspection, user-owned decisions, confirmation before action); `grill-me` is its explicit-only wrapper. The existing Matt Pocock MIT notice and license match the upstream repository.
- The foundation validator currently requires every Skill to remain an unimplemented stub. Task 0003 must retire that assertion only for `kyw-grilling` while preserving the three future Skill stubs and all foundation constraints.
- Task 0003 uses the completed Task 0002 validation foundation and therefore records `0002-template-contracts` as its direct dependency instead of bypassing the current repository state.
- The Skill metadata generator produced the intended UI fields but intentionally omitted invocation policy; the repository metadata retains the generated interface values plus the required `policy.allow_implicit_invocation: false` block.
- Three context-isolated forward tests passed the behavioral scenarios: one decision/recommendation only, fixture-fact use without factual questioning, and explicit summary confirmation followed by a no-implementation stop. A repeated fixture scenario left the Skill and fact fixture SHA-256 hashes unchanged.
- A full confirmation-boundary rerun explicitly requested a post-confirmation fixture edit. The Skill stopped and delegated mutation to a separate request/wrapper; the isolated fixture hash remained `149EF8B284C65549916AFDC3C4476B33B333CFE8A27879D42CD586A0689CAE9E`.
- Final stable checks passed with 26/26 tests, 14 JavaScript modules, 62 UTF-8/LF text files, and the exact 25-file package allowlist. Node.js 22 also passed 26/26 tests.
- An actual temporary tarball contained 25 entries at 17,201 packed bytes. Its third-party notice and Matt Pocock MIT license hashes exactly matched the preserved source files.

## Documentation Impact

- SPEC: Unchanged; this Task implements the already specified interview behavior without changing requirements or acceptance criteria.
- ARCHITECTURE: Unchanged; the existing stateless, fileless `kyw-grilling` boundary already describes the selected design.
- README: Updated implementation status, direct invocation usage, standalone mutation boundary, and current stub/implemented distinction.
- AGENTS: Unchanged; repository-wide development and completion rules do not change.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the permanent documents, Task 0002 evidence, the Task 0001 dependency, and the 0003 Task/Test contract.
- Inspected the current Skill stub, metadata, legal files, package contract, foundation validator, and stable verification scripts.
- Confirmed missing Git metadata, created the scoped pre-change snapshot, and passed the pre-change stable check baseline.
- Reconciled current official Codex Skill requirements with the upstream `grilling`/`grill-me` source and existing MIT attribution.
- Finalized the instruction-only, read-only-inspection, zero-mutation, explicit-confirmation design without adding dependencies.
- Replaced the `kyw-grilling` stub with the dependency-ordered interview protocol and updated its generated UI copy while preserving explicit-only policy.
- Updated foundation validation so only `kyw-grilling` is implemented and the three later Skills must remain non-mutating stubs.
- Added executable contract tests, a deterministic repository-facts fixture, and independent forward-test scenarios; the focused suite and official Skill validator pass.
- Updated README usage/status and confirmed SPEC, Architecture, and AGENTS remain accurate without edits.
- Passed all four stable commands, the full Node.js 22 suite, actual tarball/legal inspection, and the official Skill validator.
- Reviewed the scoped snapshot diff and independent hash audit: 6 expected existing files changed, 2 expected files added, 7 scoped files byte-identical, no whitespace errors, and no out-of-scope path in the reviewed set.

## Remaining

- None.

## Resume Point

Task 0003 is complete. Begin later workflow work only from its own numbered Task; do not implement `kyw-init`, `kyw-task`, or `kyw-audit` here.

## Blockers

- None known.
