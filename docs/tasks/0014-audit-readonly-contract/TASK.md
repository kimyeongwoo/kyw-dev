# TASK 0014 — Audit Read-Only Contract

## Status

DONE

## Goal

Make `$kyw-audit` predictably read-only by default and require explicit repair authorization, while preserving rigorous findings, reproducible evidence, bounded fixes, and final PASS/BLOCKED verdicts.

## Dependencies

- `0007-kyw-audit-skill`
- `0012-grilling-parity-and-tuning`

## In Scope

- Define the public invocation contract for read-only audit and explicit repair mode.
- Recommended contract: `$kyw-audit 0007` never writes; `$kyw-audit 0007 --fix` may repair only clear in-scope findings after stating the repair plan.
- Update the canonical Skill instructions, packaged references, metadata prompts, README, Spec, Architecture, and tests consistently.
- Ensure read-only mode does not update Task/Test status, record reports to the repository, run mutating commands, or alter generated files.
- Ensure fix mode preserves unrelated user changes, refuses ambiguous/out-of-scope work, updates affected Task/Test and durable docs, and reruns narrow plus required regression checks.
- Add fixtures proving both modes and final worktree behavior.

## Out of Scope

- Creating a separate audit report document for every run.
- Automatically allocating a follow-up Task ID.
- Fixing unrelated pre-existing repository problems.
- Changing `$kyw-task` implementation behavior except for shared references required by the contract.
- Publishing the package.

## Acceptance Criteria

- [x] AC-01: The public docs and Skill define one unambiguous default read-only invocation and one explicit repair invocation or confirmation path.
- [x] AC-02: Default read-only audit leaves tracked, untracked, generated, Task/Test, and durable-document state byte-for-byte unchanged.
- [x] AC-03: Read-only mode still inspects code, diff, acceptance/test mapping, reproducible commands, scope, document drift, and residual risk, then reports stable finding IDs and PASS/BLOCKED.
- [x] AC-04: Repair mode is impossible without explicit user intent and states the bounded repair plan before changing files.
- [x] AC-05: Repair mode changes only audited Task scope, affected tests/docs, and clear implementation findings; ambiguous or out-of-scope work remains a proposal.
- [x] AC-06: After repair, the Skill reruns the narrow affected check and required regressions and reports remaining limitations honestly.
- [x] AC-07: Automated/static fixtures and fresh-session behavior checks demonstrate no-write default and bounded-fix behavior.
- [x] AC-08: All packaged Skill copies, templates, README examples, and permanent requirements agree on the same contract.

## Plan

- [x] Inspect every canonical and copied `kyw-audit` instruction and current tests.
- [x] Confirm the recommended default/read-only plus `--fix` contract with the user if current product truth is ambiguous.
- [x] Update the canonical Skill and references without duplicating protocol text unnecessarily.
- [x] Add deterministic fixture tests for unchanged worktree and bounded fix scope.
- [x] Run fresh-session read-only and fix-mode checks where Codex execution is available.
- [x] Update affected permanent documents and package metadata/prompts.
- [x] Run the full repository and packaging regressions.

## Decisions

- Recommended default: `$kyw-audit <ID>` is strictly read-only.
- Repair opt-in: only the exact `$kyw-audit <ID> --fix` invocation authorizes repository mutation. Natural-language repair intent does not authorize repair and must be redirected to the exact invocation.
- Read-only means no repository write at all, including “helpful” Task/Test status recording.
- A repair must remain within the audited Task's already-approved intent; new product scope becomes a proposal, not an automatic change.
- The pre-mutation plan must be a standalone conversation message beginning `Bounded repair plan:` so fresh-session evidence can establish that authorization boundaries were visible before any mutation tool call.
- Treat `--fix` as an instruction-level Skill grammar, not a platform-enforced capability token. Prove the bare invocation in an OS-enforced read-only fresh session and prove fix behavior separately in an isolated writable fixture.

## Risks

- Existing users may currently expect automatic repair from the bare command; document the contract clearly as a behavior change.
- Model interpretation of informal fix intent can be ambiguous; prefer an explicit flag/example.
- Fresh-session Skill behavior is model-backed and requires evaluation evidence beyond static text tests.

## Discoveries and Changes

- Pre-implementation comparison found one material product conflict: current SPEC, Architecture, README, `SKILL.md`, audit reference, prompt metadata, and static repair fixture allow a bare audit to repair clear in-scope findings, while this Task recommends a zero-write bare invocation.
- The user confirmed the new authoritative contract after review of current official Codex guidance: bare `$kyw-audit <ID>` is report-only, and only the exact `$kyw-audit <ID> --fix` form authorizes repair. Natural-language repair requests remain read-only and direct the user to rerun the exact form.
- Official Skill metadata can disable implicit invocation but does not define a typed argument schema or a per-invocation sandbox. The Skill must parse the exact repair form itself; fresh-session verification must combine instruction assertions with sandbox enforcement, tree hashing, and Git status.
- The closest official workflow precedent separates ordinary read-only inspection from accepted-finding remediation. Task 0014 keeps one Skill and uses an exact flag because adding a second public repair Skill would broaden the Task and distribution surface.
- The pre-existing worktree is dirty on `task/0013-filesystem-security-hardening`; Task 0011–0013 work and untracked future Task directories must remain untouched. Task 0014 will inspect path-scoped diffs and record its own file set rather than treating unrelated changes as audit output.
- Synchronized the canonical Skill/reference, prompt metadata, plugin prompt, README, SPEC, Architecture, prompt guide, deterministic scenarios, foundation assertions, installed-copy assertions, and package script around the exact two-mode grammar.
- Added a development-only smoke runner and a synthetic Task whose local test passes while implementation and test contradict the permanent punctuation requirement. The runner copies that fixture and the canonical Skill into a temporary Git repository, adds known unrelated dirty state, and publishes no result artifact.
- Codex CLI `0.144.5` did not preserve the requested inner writable behavior when user configuration was ignored, while clean-home command routing denied shell commands. The final evaluator therefore places the complete model process inside a temporary native Codex permission profile and uses inner automation bypass only inside that outer OS boundary. A temporary system/default CA bundle supplies control-plane trust inside the Windows sandbox.
- Fresh `gpt-5.6-sol`/high sessions passed both final modes. Read-only returned `BLOCKED` with zero mutation attempts, identical tree SHA-256 `769990ad4fad1fde26183ae45454e9ead6b33be9d7fa822261a2d30d87428ee7`, and identical Git status. Fix mode announced the plan first, changed exactly the four required Task/Test/source/test paths, preserved unrelated bytes, reran the fixture test, and returned `PASS`.

## Documentation Impact

- SPEC: Updated the user-visible exact invocation, zero-write, report-quality, repair-scope, rerun, and verdict requirements.
- ARCHITECTURE: Updated Skill ownership, read-only and repair flows, mutation/error boundaries, and the development-only fresh-session evaluator.
- README: Updated public examples, behavior descriptions, installed surface summary, and smoke-runner usage.
- AGENTS: No change. Its repository-wide source, scope, evidence, and completion rules remain compatible; the audit-specific exception belongs in the audit product contract.
- Other synchronized surfaces: Updated `CODEX_PROMPTS.md`, plugin and Skill prompt metadata, deterministic fixtures/tests, distribution-copy checks, and package scripts.

## Completed

- Read the active Task/Test, all permanent documents, both explicit dependencies, canonical audit Skill/reference/metadata, plugin prompt metadata, prompt guide, deterministic scenarios/tests, foundation validation, and package/direct-install copy paths.
- Compared every current audit contract surface and identified the bare-invocation automatic-repair conflict before implementation.
- Obtained the user's product decision and recorded the exact flag-only repair contract plus its official Codex rationale.
- Implemented the zero-write default and standalone planned-repair boundary in the canonical and distributed contract surfaces.
- Added deterministic mode, hash, status, mutation-attempt, report-signal, repair-scope, plan-ordering, authentication-preservation, cleanup, and installed-copy coverage.
- Completed fresh-session read-only and fix runs with the exact supported `gpt-5.6-sol` model at high reasoning effort under isolated native permission profiles.
- Ran the focused checks, Skill and Task validators, all four stable repository commands, aggregate check, package dry run, and final path-scoped diff review. Exact results and retained failed attempts are recorded in `TEST.md`.

## Remaining

- None.

## Resume Point

Task 0014 is complete. No next Task was started and no publish action was taken.

## Blockers

- None.
