# kyw-dev Product Specification

## 1. Document purpose

This document defines what `kyw-dev` must do from a user's perspective. Implementation structure belongs in `ARCHITECTURE.md`; session-local implementation details belong in numbered Tasks.

## 2. Product definition

`kyw-dev` is a lightweight, spec-driven development workflow plugin for Codex. It helps a user:

1. clarify what should be built before implementation;
2. materialize durable project truth into a minimal document set;
3. split large work into session-sized, independently verifiable Tasks;
4. build a test contract before code and retain execution evidence after code;
5. keep durable documents synchronized even when work is performed through an ordinary prompt rather than a Task command.

## 3. Goals

### G-01 — Shared understanding before major work

For a new project, major feature, or re-baseline, the workflow must expose unresolved decisions through a one-question-at-a-time interview. Each question must include a recommended answer. Facts available from the repository or tools must be inspected rather than asked.

### G-02 — Minimal durable documentation

A managed project uses four permanent documents:

- `README.md`: install, run, configuration, usage, and contributor entry point;
- `AGENTS.md`: thin repository-wide Codex rules;
- `docs/SPEC.md`: product behavior, requirements, business rules, and acceptance criteria;
- `docs/ARCHITECTURE.md`: components, boundaries, dependencies, data flow, storage, and technical constraints.

No extra permanent document is created unless a real, repeated need cannot fit one of those responsibilities.

### G-03 — Session-sized execution

Large work is represented as `docs/tasks/NNNN-kebab-slug/`. Each Task should target one independently testable outcome and normally fit in one Codex session, with at most one compaction.

### G-04 — Test-intent traceability

`TASK.md` and `TEST.md` are created together before implementation. Every Task acceptance criterion must map to at least one test or explicit verification method. After implementation, the final diff must be compared against the test matrix to find unplanned or untested behavior.

### G-05 — Documentation consistency for every change path

Task-based work and ordinary small prompts both apply the same documentation-impact rules. The absence of a Task folder must never permit durable documentation drift.

### G-06 — Shareable installation

The workflow must be distributable from GitHub and npm, usable as a Codex plugin, and installable as managed Skills at user scope or project scope.

## 4. Non-goals for MVP

- Replacing GitHub Issues, Jira, Linear, or a product backlog.
- Automatically creating a Task for every prompt.
- Running unattended background work.
- Guaranteeing completion by token counting alone.
- Adding MCP servers, external connectors, or lifecycle hooks.
- Automatically committing, pushing, or opening pull requests without a current-user instruction or explicit selected-Task scope.
- Supporting other coding agents as a first-class target in v0.1.
- Maintaining separate Plan, Progress, Status, Handoff, Verification, or Test Plan documents.
- Enforcing one universal software architecture across target projects.

## 5. User personas

### P-01 — Individual developer

Wants the same development discipline across unrelated repositories without manually copying prompts.

### P-02 — Repository maintainer

Wants a versioned, repository-local workflow shared with contributors.

### P-03 — Team reviewer

Wants clear evidence that implementation intent, tests, and permanent documents agree.

## 6. Primary commands

## 6.1 Codex Skills

### `$kyw-init`

Purpose: initialize, adopt, or re-baseline a project's durable documents.

Required behavior:

1. Inspect existing code and documentation before asking questions.
2. Determine one of three modes:
   - `new`: little or no project implementation exists;
   - `adopt`: existing project lacks the kyw-dev document contract;
   - `rebaseline`: existing kyw-dev documents or design need intentional replacement/reconciliation.
3. Apply the grilling protocol to unresolved decisions.
4. Ask one question at a time and wait for the answer.
5. Include the agent's recommended answer and concise reasoning.
6. Do not implement application functionality during initialization.
7. Do not write final durable documents until the user confirms shared understanding.
8. Create or minimally update:
   - `README.md`
   - `AGENTS.md`
   - `docs/SPEC.md`
   - `docs/ARCHITECTURE.md`
9. Preserve useful existing content and never silently replace unrelated user-authored sections.
10. Keep generated `AGENTS.md` intentionally small; target less than 4 KiB and warn before exceeding 8 KiB.
11. Propose an ordered Task decomposition, but do not create all Task directories automatically.

Output:

- synchronized permanent documents;
- a concise summary of settled decisions and remaining unknowns;
- recommended first Tasks.

### `$kyw-task`

Purpose: create one numbered Task, execute an exact existing Task, or advance a pre-created Task queue serially through implementation and verification.

Invocation examples:

```text
$kyw-task "add account lockout"
$kyw-task 0007
task 0007 실행해줘
task 진행해줘
남은 task 계속 실행해줘
```

The `$kyw-task NNNN` form is portable. The three natural-language forms are anchored repository aliases available only when a kyw-managed `AGENTS.md` routing contract is loaded; a surface without that contract must direct the user to the portable form.

New-Task behavior:

1. Read permanent documents and inspect relevant code.
2. Identify unresolved Task-level decisions; grill only those decisions.
3. Reject or split work that contains multiple independently shippable outcomes or is unlikely to fit the session budget.
4. Allocate the next four-digit Task number.
5. Create `docs/tasks/NNNN-kebab-slug/TASK.md` and `TEST.md` together.
6. Build initial acceptance criteria and an intent-to-test matrix before implementation.
7. Summarize the shared Task understanding and require confirmation before implementation begins.

Execution behavior:

1. Implement only the current Task scope.
2. Update Task and Test when discoveries, design, scope, risk, or expected behavior changes.
3. Synchronize permanent documents whenever durable truth changes.
4. Run the planned tests and any additional tests implied by the final diff.
5. Record exact commands, results, failures, and unverified items.
6. Review the final diff against scope and test coverage.
7. Conclude `DONE`, `BLOCKED`, or `CANCELLED`; never infer a pass from unexecuted checks.

Resume behavior:

1. Load the current Task and Test state, permanent documents, git status, and relevant diff.
2. Verify recorded state against the repository.
3. Resume at `Resume Point` rather than repeating completed work.
4. Before compaction, refresh `Completed`, `Remaining`, `Resume Point`, and test evidence.

Existing-Task dispatch behavior:

1. Resolve an exact ID to exactly one existing Task. Selecting a current-contract `READY/READY` pair confirms implementation and, for `STANDARD`, the ordinary delivery lifecycle. Ask a user question only when a genuinely unresolved user-owned decision blocks progress; that progress turn contains exactly one question and exactly one recommended answer. When no such blocker exists, proceed without a ceremonial question. A different active Task blocks exact selection.
2. Treat `DRAFT/DRAFT` as unconfirmed authoring, `READY/READY` as selectable, `IN_PROGRESS/RUNNING` as active, `DONE/PASSED` as repository-complete, `BLOCKED/BLOCKED` as stopped, and `CANCELLED/BLOCKED` as terminal. Any other pair fails closed.
3. Treat only literal `Task NNNN` references inside `## Dependencies` as hard queue edges. Evidence and implementation-input prose is not an edge. A missing referenced Task, dependency cycle, or unsatisfied hard dependency fails closed.
4. For `task 진행해줘`, safely resume the sole active pair; if none exists, resume the lowest-numbered repository-complete Task whose `STANDARD` delivery is classified `RESUMABLE`; only then select the lowest-numbered dependency-satisfied ready pair. Multiple active pairs fail closed.
5. For `남은 task 계속 실행해줘`, use the same priority and authority for each selected Task, process only pre-created eligible Tasks serially and within the current invocation, and recheck repository, remote, and required GitHub delivery state before every transition. Never promise background continuation.
6. Stop on an active or hard-dependency blocker, current queue-frontier blocker, unsafe drift, unexplained user work, unresolved product decision, review or CI failure, or separately gated authority. A historical blocker that is neither active nor a hard dependency does not freeze a current queue.
7. Treat only text appended by the current user to the invocation as an execution override. Consume it as a settled constraint without asking it back to the user. It applies to the first selected Task unless the user explicitly scopes it to every remaining Task, and it cannot waive acceptance, evidence honesty, safety, user-work preservation, or external-mutation authority. Stop for one blocking decision question only when the constraint conflicts with durable truth or remains materially ambiguous.
8. Preserve the active model and reasoning effort unless the current user explicitly overrides them. For model-dependent evidence, record model identifier, requested model alias, reasoning effort, concrete Codex surface, Codex version, and per-field observability in `TEST.md`. A known absence of an override is observed; a value the active surface does not expose is `UNAVAILABLE`. Never infer, downgrade, substitute, or sweep settings.
9. Let Task/Test own repository outcome and reproducible evidence. A current-contract pair declares `STANDARD` delivery with GitHub PR/Actions exact-SHA state as its canonical ledger, or `NONE` with a reason. Bind that ledger to separately inspected local repository, base, and outcome-SHA expectations. Mutable delivery results never become future facts required inside the pair. The static `STANDARD` declaration alone grants no ambient mutation authority; a recognized exact, automatic, or continuous invocation returning `IMPLEMENT`, `RESUME`, or `DELIVER` grants the selected Task's ordinary lifecycle authority without another ceremonial confirmation.
10. Ordinary `STANDARD` authority includes implementation, acceptance-specific verification, repository `DONE/PASSED`, exact-path staging and commit, non-force branch push, non-draft PR creation, exact-head PR CI observation, review-blocker and mergeability inspection, expected-head protected merge, exact post-merge base-branch CI observation, and terminal reporting. It excludes publication, registry mutation, tags, GitHub Releases, public plugin submission, force push, destructive recovery, branch deletion, workflow rerun, bypass, and unrelated mutation.
11. Do not advance past a repository-complete Task while required delivery remains unknown, pending, or failed. Missing or pending final evidence means authorized ordinary delivery must resume; supplied CI failure, review blocker, repository/base/SHA drift, conflict, unexplained user work, or a new user-owned decision fails closed. Fully bound successful evidence is terminal and must not create duplicate delivery mutations. CI success proves delivery state, not behavioral acceptance.
12. If no ready or active current Task exists, the frontier is `DONE/PASSED` or `CANCELLED/BLOCKED`, and required delivery is satisfied, create no Task and return exactly: `현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?`
13. If the current frontier is blocked or inconsistent, report the exact blocker instead of returning the no-work message.
14. Incidental text containing `task` does not match an anchored alias and retains ordinary-prompt behavior.

### `$kyw-audit`

Purpose: independently verify a Task after implementation, compaction, external modification, or before release.

Invocation examples:

```text
$kyw-audit 0007
$kyw-audit 0007 --fix
```

Required behavior:

1. Resolve exactly one four-digit Task ID and lock the mode from the invocation.
2. Treat bare `$kyw-audit <ID>` as strictly read-only for the complete invocation. It must not change any tracked, untracked, generated, Task/Test, or durable-document byte, write a repository report, or attempt a mutating command. That attempt boundary includes temporary, control, snapshot, cache, and isolated-copy state; the audit must not prepare or clean a disposable rerun copy itself.
3. Permit inspection commands only through documented literal, single-process read-only shapes for repository-relative file reads and searches, guarded Git inspection, and the packaged Task pair validator. Reject shell wrappers, control operators, pipes, redirects, dynamic or encoded launchers, expansions, absolute/traversing paths, unlisted arguments, and ambiguous grammar instead of trying to interpret a broader shell language. Single-quoted search data remains opaque.
4. In read-only mode, compare acceptance criteria, implementation, code and diff/history or a reproducible fallback baseline, test matrix and actual results, scope, handoff state, package effects, and permanent documents. Preserve stable finding IDs, evidence-specific limitations, byte-preserving evidence reruns, residual risks, and report quality even though findings remain unmodified. A potentially writing or boundary-incompatible rerun uses retained evidence or is skipped with an explicit limitation.
5. Permit repair only when the literal `--fix` token immediately follows the Task ID. Natural-language repair intent without that token never authorizes a write and must direct the user to a new exact invocation.
6. In repair mode, establish the baseline within the same strict read-only boundary and record findings, then state a bounded plan with finding IDs, intended paths, and verification commands before the first mutation-capable command or file change.
7. Repair only an unambiguous finding already required by the audited Task and permanent truth. Limit changes to its Task/Test pair, required implementation/tests/configuration, and permanent documents whose durable meaning is affected; preserve unrelated user work.
8. Keep ambiguous and out-of-scope findings report-only and propose, but do not allocate or create, a follow-on Task.
9. After a repair, rerun the affected acceptance-specific check and required regressions, retain failed evidence and limitations, and re-audit the final diff.
10. End with evidence-based `PASS` or `BLOCKED`; unavailable required evidence or an open blocker/error cannot be reported as a pass.

### `$kyw-grilling`

Purpose: reusable interview primitive used by initialization and Task authoring, and optionally invoked directly.

Required behavior:

- Walk a decision tree in dependency order.
- On every interview-progress turn, ask exactly one decision question.
- Include exactly one recommended answer with each interview-progress question; a terminal response is not a progress turn and asks no decision question.
- Inspect targeted relevant user-authored repository/tool facts instead of asking the user; do not bulk-read broad globs, version-control internals, or unrelated files, and do not repeat discovery unless an answer identifies a specific previously unread path.
- Keep decisions with the user.
- When inspected product/domain requirements conflict or cannot both be satisfied, explicitly state the conflict on the first turn and ask which side is authoritative before any other decision.
- If that conflict is only bundled scope exceeding a single-outcome boundary, use the primary-outcome narrowing rule directly; do not classify mutation-boundary pressure as a product conflict.
- Except when genuine multi-outcome narrowing is required, ask the highest unresolved domain dependency first and do not mention downstream interface scope until its prerequisites are settled.
- On every remaining turn, choose the highest-impact unresolved product or domain dependency; lower-impact questions about supporting material provenance, recency, or completeness must not keep higher-impact decisions blocked.
- Treat implementation layers of one cross-layer feature as dependent parts of one outcome rather than separate outcomes.
- When a subject bundles independently shippable outcomes, first ask the user to choose the single primary outcome for the first release and recommend deferring the rest.
- Do not treat uncertainty or “use your recommendation” as a settled choice; ask for one explicit confirmation or choice with an unmistakable ownership verb before advancing.
- Track decisions by semantic meaning as asked, resolved, provisionally assumed, or unresolved. Absent new or conflicting evidence, do not repeat an equivalent question. If a reply omits the pending answer, state a safe and reversible working assumption as provisional and advance to the highest-impact unresolved decision; if no safe assumption exists, retain an explicit unknown or stop instead of silently settling or repeating it.
- Treat a clear request to stop or cancel the interview as terminal only when it is not combined, before confirmation, with a prohibited request to implement, edit, produce file output, or otherwise mutate.
- Treat pre-confirmation stop/cancel wording bundled with such a prohibited action as implementation pressure rather than cancellation: refuse the action and, when an answerable decision remains, continue with exactly one next unresolved decision question and one recommended answer.
- Once terminal cancellation is established, stop immediately and do not resume, summarize, seek confirmation, or ask another decision under later implementation pressure without a new explicit invocation.
- Do not act on the plan until the user confirms shared understanding.
- Produce no file by itself unless a wrapper Skill explicitly materializes the result.

## 6.2 npm CLI

Executable: `kyw-dev`.

The mutating command grammar is limited to `install|update|uninstall --scope <user|project>`. Only uninstall accepts `--force`. Scope is required and may appear once. `doctor` accepts no options.

### `kyw-dev install --scope user`

- Install managed `kyw-*` Skills under `~/.agents/skills/`.
- Do not create project documents.
- Detect existing unmanaged files and refuse destructive overwrite.
- Record ownership at `~/.agents/skills/.kyw-dev-install.json` and install namespaced deterministic support required by the managed Skills under `~/.agents/skills/.kyw-dev/runtime/`.

### `kyw-dev install --scope project`

- Resolve the target Git repository root.
- Install managed `kyw-*` Skills under `<repo>/.agents/skills/`.
- Do not modify existing product documents.
- Use the same ownership and namespaced runtime layout as user scope, rooted in the repository's `.agents/skills/` directory.

### `kyw-dev update --scope <user|project>`

- Replace only files proven to be managed by the installed kyw-dev version.
- Preserve user project documents and unrelated Skills.
- Treat every package-, metadata-, journal-, home-, Git-root-, and argument-derived managed path as untrusted until it is normalized and confined. Reject empty, absolute, drive-relative, traversal, mixed-separator, malformed, duplicate, case/normalization-colliding, and file/directory-prefix-colliding paths on every host.
- Refuse when a recorded file is missing or locally modified, an unknown path exists inside a managed container, metadata is malformed, or the Skills root, a managed parent, source, target, stage, backup, marker, or file has a symlink/junction, unsupported type, or unprovable identity.
- Revalidate parent containment, regular-file type, ownership hash, and current content immediately before each destructive rename or removal.

### `kyw-dev uninstall --scope <user|project>`

- Remove only managed kyw-dev Skill files and installation metadata.
- Refuse normal uninstall when owned files are modified/missing or unknown entries are present.
- Treat `--force` as explicit confirmation to remove existing modified regular files named in valid ownership metadata. It may proceed around already-missing owned files and preserved unknown entries, but never authorizes deleting an unknown file, unrelated Skill, unsafe link, or unsupported file type.

### `kyw-dev doctor`

Report:

- Node/npm availability and supported version;
- Codex availability when detectable;
- active user and repository Skill locations;
- duplicate `kyw-*` Skills across scopes;
- installation version drift;
- malformed plugin or Skill metadata;
- missing permissions, unsafe path/link/type state, or partial transactions.

`doctor` is byte-and-metadata read-only: it performs no directory creation, recovery, cleanup, rename, chmod, write, or deletion. It returns the most severe applicable CLI exit category when it finds an error; an unavailable project scope outside a Git repository and undetected optional tools are informational/warning results rather than automatic failures.

### `kyw-dev --help` and `kyw-dev --version`

Must be fast, deterministic, and not modify the filesystem.

- No arguments, `-h`, and `--help` print help and exit 0.
- `-V` and `--version` print the exact package version and exit 0.
- Unrecognized argument sequences print an error plus usage and exit 1.
- Dispatch never changes the current working directory.

Stable exit codes:

| Code | Category |
|---|---|
| 0 | success / healthy diagnostics |
| 1 | usage error |
| 2 | unsupported runtime |
| 3 | scope resolution failure |
| 4 | unsafe overwrite, local-change, or duplicate conflict |
| 5 | malformed package or installation state |
| 6 | filesystem or permission failure |
| 7 | recovery required |

Direct-install metadata uses schema version 1 and records package name/version, scope, install/update timestamps, the four managed Skill paths, and a sorted SHA-256 inventory. Mutating commands stage bytes beneath the validated Skills root before touching targets, publish a bounded recovery journal before commit, commit metadata last, roll back an incomplete commit only from type/hash/ownership-proven entries, and finish cleanup only when exact markers and the published state prove the new state. Unknown content inside a reserved transaction directory blocks recursive cleanup for inspection. Broad recursive deletion of `.agents/skills/` is never allowed.

## 7. Managed project artifact contract

## 7.1 Permanent documents

### `README.md`

Contains only externally useful project entry information:

- purpose;
- prerequisites;
- install/setup;
- run/test/build commands;
- configuration;
- user-facing usage;
- concise repository map;
- links to Spec and Architecture.

### `AGENTS.md`

Contains only invariant agent behavior:

- source-of-truth map;
- when Task folders are and are not required;
- documentation-sync routing;
- verification and completion gate;
- a few repository-specific commands or constraints.

Detailed templates, long checklists, domain explanations, and Task-specific facts do not belong here.

### `docs/SPEC.md`

Contains:

- goals and non-goals;
- user-visible behavior;
- business/domain rules;
- functional and quality requirements;
- acceptance criteria;
- explicit unresolved decisions where necessary.

Implementation sequence and class-by-class plans do not belong here.

### `docs/ARCHITECTURE.md`

Contains:

- system context;
- components and responsibilities;
- module and dependency boundaries;
- data and control flow;
- storage and external interfaces;
- cross-cutting constraints;
- important architectural trade-offs.

Task status and chronological implementation steps do not belong here.

## 7.2 Numbered Task folder

Path format:

```text
docs/tasks/0001-short-kebab-slug/
├─ TASK.md
└─ TEST.md
```

Numbering rules:

- four digits, ascending from `0001`;
- never reuse a number, including cancelled Tasks;
- determine the next number from existing directory names, not timestamps;
- slug is lowercase ASCII kebab-case where possible;
- renaming a completed Task requires explicit intent because links may depend on it.

### Required current-contract `TASK.md` sections

Legacy unmarked pairs retain their historical section contract; queue-aware pairs require:

- ID and title
- Status
- Goal
- Dependencies
- In Scope
- Out of Scope
- Acceptance Criteria
- Plan
- Decisions
- Risks
- Discoveries and Changes
- Documentation Impact
- Delivery
- Completed
- Remaining
- Resume Point
- Blockers

Allowed statuses:

```text
DRAFT → READY → IN_PROGRESS → DONE
                     ↘ BLOCKED
DRAFT/READY/IN_PROGRESS → CANCELLED
```

Queue-aware Task/Test pairs carry the paired current-contract marker `<!-- kyw-task-contract: 2 -->`; immutable historical pairs without that marker retain their original validation meaning. A current pair also contains a `Delivery` section with exactly one static requirement:

```text
- Requirement: STANDARD
- Canonical ledger: GitHub PR/Actions exact-SHA state.
```

or:

```text
- Requirement: NONE — <reason>
```

`STANDARD` records only the kind and canonical external ledger. Mutable PR, review, merge, and Actions results do not belong in the Task artifact and must not remain as future work in a repository-complete pair. Authority comes from a recognized current existing-Task invocation that selects the Task, not from this static field in isolation.

For a current pair that has advanced beyond `DRAFT`, every required Task and Test section must contain meaningful content. A section with no applicable material may contain the single concise entry `Not applicable — <reason>`; comments alone, an empty section, a bare `None`, or `Not applicable` without a reason are invalid. `CANCELLED/BLOCKED` preserves an incomplete authoring history and is not forced to invent content. Acceptance Criteria and the Intent-to-Test Matrix are never replaceable by N/A: every selectable or active Task has at least one stable acceptance criterion, at least one test row, and complete acceptance mapping.

Existing contract-v2 pairs authored before the reasoned-N/A template remain readable without historical rewrites. Once a pair adopts a reasoned `Not applicable — <reason>` entry, the validator applies the strict reasoned-N/A rule consistently across that pair; empty required content and acceptance/matrix gaps are rejected for every selectable or active pair.

Conciseness is guidance rather than a hard line, byte, or token cap. Routine standard, documentation-only, and bug-fix Tasks should use short reasoned entries and avoid irrelevant prose. Release, security, migration, or other evidence-heavy Tasks may be longer when the additional content is required for scope, risk, verification, or resume safety. This remains one Task/Test artifact type.

### Required `TEST.md` sections

- Status
- Test Basis
- Intent-to-Test Matrix
- Regression Coverage
- Commands
- Results
- Unverified
- Final Coverage Review

Canonical new scaffolds also contain a five-field `Model Provenance` block. An executing pre-existing current pair adds the block when it records model-dependent evidence; legacy and pre-created pairs remain readable before that execution update. Each field records a value plus `OBSERVED` or `UNAVAILABLE`, and an unavailable field must not be inferred from a different Codex surface or installed CLI.

Allowed statuses:

```text
DRAFT → READY → RUNNING → PASSED
                     ↘ BLOCKED
```

For the current contract, valid Task/Test pairs are `DRAFT/DRAFT`, `READY/READY`, `IN_PROGRESS/RUNNING`, `DONE/PASSED`, `BLOCKED/BLOCKED`, and `CANCELLED/BLOCKED`. Pair validation fails closed before selection or implementation.

The test matrix must contain:

| Field | Meaning |
|---|---|
| ID | Stable test case identifier |
| Intent / acceptance criterion | Why this test exists |
| Method | How it will be checked |
| Level | Static, unit, integration, E2E, manual, packaging, or audit |
| Status | TODO, PASS, FAIL, BLOCKED, or N/A with reason |
| Evidence | Command, test name, output summary, or artifact |

## 8. Task sizing policy

A Task is correctly sized when it has:

- one primary user or system outcome;
- one coherent acceptance-criteria set;
- a result that can be tested independently;
- a repository state that remains valid if later Tasks never run;
- no hidden dependency on rereading all completed Tasks.

Split before implementation when:

- two outcomes can be released or reverted independently;
- separate subsystems require separate design decisions;
- the test matrix naturally separates into independent acceptance sets;
- the work is likely to require more than one compaction;
- the Task cannot be summarized with a single Goal sentence.

Do not split by arbitrary file count or estimated token count alone.

## 9. Test lifecycle

### At Task creation

- Create `TEST.md` immediately with the Task.
- Derive initial cases from Goal, scope, acceptance criteria, known failure paths, and required regressions.
- Mark it `DRAFT` until the user confirms the Task understanding.

### During development

- Add cases for discovered branches, bugs, fallback behavior, compatibility constraints, and revised design.
- Keep changed intent synchronized with Task acceptance criteria and durable documents.

### Verification execution policy

- Acceptance-specific verification and reproducible evidence remain required. The active Codex model performs risk-proportionate verification directly in the current session by default.
- Nested `codex exec`, fresh model cohorts, and subagent orchestration are not universal verification requirements. Use subagents or isolated or fresh sessions only when the user explicitly requests them or the active model determines that independent or isolated verification would materially improve confidence.
- Not using a subagent is not by itself a blocker. A Task that genuinely requires a fresh session or independent agent must state that requirement explicitly in its acceptance criteria and Test contract.
- Never record an unexecuted verification method as `PASS`.

### Verification tiers

Every supported verification command belongs to one of three cumulative tiers with a documented trigger:

1. **Focused** checks the exact changed behavior and its closest regressions. Documentation and Skill changes use targeted deterministic tests plus only the formatting or package-boundary checks their changed bytes require. Model-backed evaluators remain focused, explicit-cost evidence and never run merely because a Task is being delivered.
2. **Stable** proves the complete repository contract. Runtime, cross-cutting, unknown, or higher-risk changes run the local stable suite; every pull request and `main` push still runs the full supported Node/OS matrix, package selection, and aggregate required status at the exact Git SHA.
3. **Release** proves an immutable package candidate and later distribution boundaries. Release-sensitive changes and actual candidates retain real-tarball hygiene, licensing, CLI smoke, isolated lifecycle, protected-state, registry dry-run, and separately approved publication checks as applicable.

The deterministic maintainer planner classifies supplied changed paths conservatively, ignores the current Task/Test pair as an implementation-risk signal, and fails closed to Stable for an unknown or mixed runtime path. A release-candidate flag can only escalate the result. It never weakens acceptance-specific checks or the mandatory hosted Stable gate.

Do not repeat a package identity proof against the same immutable candidate bytes at the same boundary. A candidate archive, exact PR head, registry dry-run result, and actually published package are separate evidence boundaries because their bytes or identity can differ; record the SHA and boundary for each claim that is required.

### After implementation

- Inspect the final diff and enumerate every meaningful new behavior, state transition, error path, and compatibility change.
- Ensure each item maps to a test or explicit unverified reason.
- Execute checks and record evidence.
- A passing generic test command does not replace acceptance-specific coverage.

## 10. Ordinary-prompt behavior

When the user asks a question or small, bounded change without invoking a Skill:

- first recognize only the three exact anchored Task aliases when the managed repository routing contract is loaded;
- do not create a numbered Task by default;
- inspect the repository and answer or implement directly;
- run proportionate verification for code/configuration changes;
- apply the permanent-document impact routing;
- do not edit documents that did not change in meaning.

## 11. Safety and integrity requirements

- Never expose secrets found while inspecting repositories.
- Never overwrite unknown user files silently.
- Use atomic writes for CLI-managed installation files.
- Installation and update operations must be recoverable after interruption.
- The CLI must identify files it manages; uninstall must not use broad directory deletion without ownership verification, and force must never broaden the removal set to unknown or unsafe entries.
- Fail closed whenever managed-path containment, portable identity, filesystem type, link-free ancestry, transaction ownership, or expected content hash cannot be proved.
- Recursive removal is limited to an exact journal-owned stage or backup directory whose complete present tree contains only expected regular files and directories; `.agents/skills` itself is never a recursive-removal target.
- Skills must not claim tests ran when they did not.
- Plugin installation must not depend on `postinstall` or other npm lifecycle scripts.

## 12. Compatibility requirements

- Primary target: current Codex CLI, IDE extension, and ChatGPT desktop Codex surfaces that support Skills.
- Skill directories must contain `SKILL.md` with `name` and `description`.
- User-visible Skills must provide `agents/openai.yaml` with UI metadata and explicit-invocation policy.
- Plugin root must contain `.codex-plugin/plugin.json` and keep Skill paths relative to the plugin root.
- MVP Node runtime target: Node.js 22 or newer. Node.js 20 and unsupported odd-numbered releases are not supported CI targets.
- Required runtime evidence covers Node.js 22 and 24 LTS on Linux, macOS, and Windows. While the public engine floor remains `>=22`, Node.js 26 Current has one bounded Linux compatibility lane until it becomes an LTS baseline or the policy is revised.
- Windows, macOS, and Linux path behavior must be tested through native CLI/install execution as well as path construction. Required link/junction fixtures must prove that the native link was created; a capability failure is blocked evidence rather than a passing skip. Full desktop integration may be manually tested only where the environment exists.

## 13. Distribution requirements

The npm tarball must include at least:

- `.codex-plugin/plugin.json`;
- all `skills/` content;
- templates and deterministic helper scripts used by Skills or CLI;
- CLI entrypoint and runtime source;
- `README.md`;
- project license;
- `THIRD_PARTY_NOTICES.md` and upstream MIT text.

The tarball must exclude development-only eval sources/results and raw model output, tests and local marketplace fixtures, repository Task/docs/bootstrap bundles, generated archives, credential/config files, and machine-local absolute paths. A positive `files` allowlist plus dry-run and extracted-real-tarball inspection enforces this boundary.

A marketplace entry may use npm or GitHub as the plugin source. npm-based plugin installation must work without lifecycle scripts.

The v0.1 release candidate uses a canonical local marketplace fixture for reproducible pre-publication verification. The fixture must point at `./plugins/kyw-dev`, declare explicit installation/authentication policies and a category, and be exercised with packed plugin bytes under an isolated Codex home. The fixture and release tests are development-only and must not enter the npm tarball.

Preparing publishable metadata or running `npm publish --dry-run` does not authorize publication. The mutating `npm publish` command and any public plugin-directory submission require separate explicit user approval after the final release checks and package-name revalidation.

Public pull requests, pushes to `main`, and manual CI dispatch must run credential-free stable checks with read-only repository access. Every supported LTS OS/runtime lane runs the stable test, lint, format, and package commands. A separate supported Linux LTS lane must create and inspect real packed bytes without invoking npm publication, Codex authentication, tagging, release creation, or merge automation; unavailable model-backed or desktop-only checks cannot become required public-PR checks.

## 14. Versioning and upgrade behavior

- Use semantic versioning.
- `0.x` releases may change unfinished interfaces but must document migration impact.
- Managed installation metadata records kyw-dev version and file hashes.
- Updates must detect local modifications and require explicit conflict resolution.
- Generated project documents are never replaced merely because the plugin version changed.

## 15. MVP acceptance criteria

The MVP is accepted when all of the following are demonstrated:

1. The npm package packs with the required plugin and Skill files.
2. A user-scope direct installation makes the four Skills discoverable.
3. A project-scope direct installation makes the four Skills discoverable only in that project context.
4. `$kyw-init` can initialize an empty fixture and adopt an existing fixture without destructive replacement.
5. `$kyw-task` creates the next numbered folder with both Task and Test documents and can resume it.
6. The Task workflow refuses implementation until shared understanding is confirmed.
7. The Test workflow catches at least one intentionally untested implementation branch in a fixture.
8. Ordinary small-change instructions enforce permanent-document impact review without creating a Task.
9. `$kyw-audit` detects stale permanent documentation and unsupported pass claims.
10. `doctor`, update, and uninstall preserve unrelated files and report duplicate installations.
11. A local marketplace or direct plugin test loads the packaged Skills.
12. Third-party licensing is present in the published tarball.

## 16. Publication decisions

The following decisions are confirmed for the `0.1.0` release candidate:

- `kyw-dev` is licensed under MIT;
- the legal author/publisher display name is `Kim Yeongwoo`, while the product, plugin, package, and CLI identity remains `kyw-dev`;
- the project copyright notice is `Copyright (c) 2026 Kim Yeongwoo`;
- the public source repository is `https://github.com/kimyeongwoo/kyw-dev`, and its GitHub issue tracker is the public bug-report URL;
- the preferred public npm name is the unscoped `kyw-dev`, with a real owner scope required as fallback if a final registry check shows that name is unavailable;
- package metadata targets public access at `https://registry.npmjs.org/` and is publishable, while the actual publish remains an explicit approval-only operation;
- pre-publication plugin verification uses a local marketplace built from the real tarball; an npm marketplace source may be advertised only after publication;
- v0.1 is not submitted to a public plugin directory;
- unconfirmed email/contact values, privacy/terms URLs, and branding assets are omitted instead of invented.

The following actions remain open after Task 0009 verification:

- explicit approval and credentials for the first npm publication;
- a scoped fallback decision if the preferred name becomes unavailable before publication;
- optional public contact metadata and branding when those values exist;
- any later public plugin-directory submission.
