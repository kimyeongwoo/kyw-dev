# kyw-dev Product Specification

## 1. Purpose and authority

This document owns `kyw-dev` behavior, business rules, safety, and acceptance. `docs/ARCHITECTURE.md` owns stable structure and boundaries. Skills/references own authoring, execution, and audit procedure; source/tests own mechanics and edge cases; the current Task/Test pair and GitHub own work evidence.

`kyw-dev` is a lightweight, spec-driven development workflow for Codex. It helps a user clarify intent, retain durable project truth, author independently verifiable work, implement it with test evidence, and keep documentation synchronized across both managed Task workflows and ordinary prompts.

## 2. Goals

### G-01 — Shared understanding before major work

For a new project, adoption, rebaseline, major feature, or redesign, inspect available facts and expose unresolved product decisions before implementation. Interview progress asks one decision question at a time and includes one recommended answer; facts obtainable from the repository or tools are not asked back to the user.

### G-02 — Minimal durable documentation

A managed project uses four permanent documents:

- `README.md` owns installation, setup, configuration, usage, and contributor entry;
- `AGENTS.md` owns thin repository-wide Codex rules and routing;
- `docs/SPEC.md` owns observable product behavior and acceptance;
- `docs/ARCHITECTURE.md` owns components, boundaries, dependencies, flows, storage, and technical constraints.

No fifth permanent plan, status, progress, handoff, verification, or generated summary mirror is created merely to duplicate these owners. Session-local scope, progress, and evidence remain in the selected Task/Test pair.

### G-03 — Session-sized, dependency-aware execution

Large work is represented by numbered `docs/tasks/NNNN-kebab-slug/` directories. Each Task has one independently testable primary outcome, one coherent acceptance set, explicit hard dependencies, and a repository result that remains valid if later Tasks never run. The smallest justified dependency-aware set is preferred over arbitrary splitting by files or token estimates.

A Task normally fits one Codex session and at most one compaction; larger work splits at an independently verifiable boundary.

### G-04 — Test-intent traceability and evidence honesty

`TASK.md` and `TEST.md` are created together before implementation. Every acceptance criterion maps to at least one test or explicit verification method. A pass is claimed only for evidence that actually ran. The final diff is reviewed against the matrix so introduced behavior, failure paths, compatibility effects, and documentation changes cannot hide behind a generic passing suite.

### G-05 — Durable truth on every change path

Managed Task work and ordinary bounded prompts use the same documentation-impact routing. A missing Task directory never excuses stale permanent truth, and an unaffected owner is not edited merely to mark it reviewed.

### G-06 — Portable, shareable installation

The five packaged Skills and their deterministic support are distributable through GitHub and npm, usable as a Codex plugin where plugins are supported, and directly installable as managed user- or project-scope Skills.

## 3. Product boundaries

The MVP does not:

- replace GitHub Issues, Jira, Linear, or a product backlog;
- create a numbered Task for every prompt;
- run unattended background work, a daemon, watcher, or background repair;
- guarantee completion from token counting;
- require an MCP server, external connector, or npm lifecycle hook;
- make publication, registry, version, tag, Release, or public-directory decisions from CI success;
- treat another coding agent as a first-class target;
- impose one application architecture on managed projects;
- maintain separate permanent Plan, Progress, Status, Handoff, Verification, or Test Plan documents.

Supporting installation/discovery paths beyond managed direct user/project Skills and Codex plugin marketplace/cache bytes, or abstracting those paths behind a generic provider/install-backend API, is explicitly out of scope. Supporting a current-contract `STANDARD` delivery ledger other than GitHub PR/Actions exact-SHA evidence is also out of scope.

The product preserves user-authored work and public behavior unless the user or selected Task explicitly changes them. It fails closed when ownership, evidence, identity, scope, dependency, or required authority cannot be established.

## 4. Five explicit-only Skills

The product exposes exactly five user-visible Skills: `$kyw-grilling`, `$kyw-init`, `$kyw-task`, `$kyw-impl`, and `$kyw-audit`. All five are explicit-only and publish `allow_implicit_invocation: false`; ordinary prose never invokes them by resemblance. Managed repository aliases are anchored routing supplied by an applicable `AGENTS.md`, not implicit Skill matching.

### 4.1 `$kyw-grilling`

`$kyw-grilling` is the reusable decision interview. It may be invoked directly or used by initialization and Task authoring.

Required behavior:

- inspect targeted repository and tool facts rather than asking for discoverable information;
- ask exactly one unresolved decision question on each interview-progress turn;
- include exactly one recommended answer with concise reasoning;
- order questions by product dependency and impact, keeping decisions with the user;
- identify incompatible requirements before downstream decisions;
- narrow genuinely independent outcomes to a recommended primary outcome instead of confusing implementation layers with separate products;
- keep unresolved or provisionally assumed choices explicit and avoid repeating an equivalent settled question;
- honor a clear terminal cancellation, while refusing implementation pressure before confirmation;
- make no repository change by itself;
- after confirmed feature intent, recommend a new explicit `$kyw-task "<confirmed outcome>"` invocation and stop without invoking another Skill.

The detailed interview state machine belongs to `skills/kyw-grilling/SKILL.md`.

### 4.2 `$kyw-init`

`$kyw-init` establishes or intentionally reconciles the four-document durable contract.

Required behavior:

- classify the project as new, adopt, or rebaseline from inspected facts;
- fully read and reconcile applicable durable sources because initialization can affect every owner;
- use the grilling behavior only for unresolved decisions and wait for shared-understanding confirmation before final writes;
- preserve useful user-authored content and never silently replace unrelated application or documentation bytes;
- create or minimally update only `README.md`, `AGENTS.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`;
- keep `AGENTS.md` intentionally thin and subject to its independent size policy;
- implement no application functionality;
- finish with synchronized documents, settled and unresolved decisions, and recommended first outcomes without creating a Task queue automatically.

### 4.3 `$kyw-task`

`$kyw-task "<outcome>"` authors the smallest safe set of complete Task/Test pairs for one confirmed request. `$kyw-task NNNN` resumes only compatible `DRAFT/DRAFT` authoring.

Required behavior:

- inspect durable truth and relevant implementation facts before authoring;
- ask only for a genuine unresolved Task-level decision;
- keep one pair for one independently verifiable outcome and create the smallest dependency-aware set only when acceptance boundaries, hard dependencies, or safe session scope require it;
- honor a valid user-specified Task count, boundary, ordering, title, and dependency;
- derive each portable internal authoring key deterministically from the outcome title, without requiring callers to know or shorten that key;
- allocate unique final IDs and paths, author both files with mapped acceptance, validate every pair and the full dependency graph, and publish the set atomically as `READY/READY`;
- when the requested outcome corrects an already canonically delivered future-contract Task, preserve that pair and make the new correction pair hard-depend on it;
- leave application files and permanent documents unchanged while recording expected documentation impact for execution;
- fail closed without claiming a clean partial queue when publication ownership or rollback safety is uncertain;
- retain existing `DRAFT/DRAFT` and legacy readers for compatibility without making new adaptive authoring depend on placeholders;
- redirect a non-DRAFT exact pair to the state-appropriate `$kyw-impl NNNN` command.

`$kyw-task` does not invoke or chain `$kyw-impl`. After successful authoring it reports created paths and dependencies, prints exactly one next `$kyw-impl NNNN` command for the first eligible pair, and stops without implementation, commit, PR, or delivery.

Detailed decomposition and publication procedure belongs to `skills/kyw-task/SKILL.md`; the sole packaged Task adapter owns deterministic queue and artifact mechanics.

### 4.4 `$kyw-impl`

`$kyw-impl NNNN` selects one exact existing Task for implementation, resume, verification, documentation synchronization, terminal repository state, and ordinary declared delivery. It never allocates or authors a Task and redirects new outcomes to `$kyw-task "<outcome>"`.

When a managed `AGENTS.md` contract is loaded, only these anchored aliases are equivalent existing-Task requests:

```text
task NNNN 실행해줘
task 진행해줘
남은 task 계속 실행해줘
```

The portable `$kyw-impl NNNN` form works without managed routing. Incidental prose containing “task” remains an ordinary prompt.

Required behavior:

- resolve an exact ID to one directory and reject a missing, duplicate, draft, inconsistent, dependency-blocked, or concurrently conflicting selection;
- implement only the selected Task scope and preserve unrelated or unexplained user work;
- transition and validate the Task/Test pair together, then keep scope, discoveries, risks, decisions, documentation impact, progress, resume state, and evidence truthful;
- on resume, verify recorded completed work against files and version control and continue from the valid resume point instead of repeating externally visible or destructive actions;
- use current-user appended text as a settled first-selected-Task override without letting it waive acceptance, safety, evidence honesty, preservation, or separate authority;
- preserve the configured model and effort unless the current user explicitly overrides them, and label unavailable model provenance rather than inferring it;
- before its one dispatcher call, derive the exact prior `STANDARD` set, validate repository-owned continuity only from aligned `main`, production-evaluate fresh GitHub evidence for at most one uncovered prior outcome, and fail before selection or mutation on a missing, malformed, stale, over-gap, or evaluator-rejected proof;
- treat a canonically delivered future-contract Task as report-only, reject later terminal-pair or delivery-identity drift before dispatch, and route correction intent to a new explicit hard-dependent Task;
- run acceptance-specific and risk-proportionate verification, record failures as well as later passes, and block when required evidence cannot run;
- synchronize only permanent owners whose durable meaning changed;
- compare the complete final diff with scope and the intent-to-test matrix before terminal success;
- checkpoint verified completed work, ordered remaining work, an executable resume point, blockers, repository state, and test evidence before interruption or compaction;
- set repository success only when acceptance, verification, final coverage, documentation, scope, and pair validation all agree.

`task 진행해줘` resumes the sole active Task, otherwise resumes the lowest repository-complete Task with resumable required delivery, otherwise selects the lowest dependency-satisfied ready Task. Continuous mode repeats that same selection serially for pre-created work only, rechecks state after each transition, and never promises background continuation.

Recognized selection supplies ordinary repository authority and, for `STANDARD`, its bounded delivery authority without ceremonial reconfirmation. Conflicts, unsafe drift, unexplained work, failed evidence, review blockage, or a genuine user-owned decision still stop. Detailed procedure belongs to `skills/kyw-impl/references/execution.md`.

### 4.5 `$kyw-audit`

`$kyw-audit NNNN` independently evaluates one Task against its acceptance, implementation, evidence, scope, package effects, and permanent truth.

Required behavior:

- Treat bare `$kyw-audit <ID>` as strictly read-only for the whole invocation, including tracked, untracked, generated, temporary, cache, snapshot, and Task/Test bytes.
- Permit repair only when the exact invocation includes `--fix` immediately after the ID; natural-language repair intent does not authorize a write.
- Establish an independent baseline, retain evidence limitations, and report stable evidence-based findings and a `PASS` or `BLOCKED` verdict.
- Never turn unavailable required evidence or an unresolved blocker into a pass.
- In repair mode, change only an unambiguous finding already required by the audited Task and permanent truth, preserve unrelated work, rerun affected checks, and re-audit the final diff.
- Keep ambiguous or out-of-scope findings report-only and propose rather than allocate follow-on work.

The command boundary, finding format, and repair procedure belong to `skills/kyw-audit/references/audit.md`.

## 5. Managed project contract

### 5.1 Permanent-document ownership

The permanent set is exactly:

| Path | Durable owner |
|---|---|
| `README.md` | purpose, prerequisites, install/setup, configuration, usage, commands, and contributor entry |
| `AGENTS.md` | thin repository-wide Codex truth, context-loading, routing, preservation, and completion invariants |
| `docs/SPEC.md` | goals, non-goals, observable behavior, business rules, quality requirements, and acceptance |
| `docs/ARCHITECTURE.md` | system context, stable components, boundaries, dependencies, flows, storage, and trade-offs |

Detailed Skill procedure, source algorithms, exhaustive test catalogs, mutable delivery identities, and chronological work evidence do not belong in these documents. A change updates the owning document first when durable meaning changes; projections elsewhere remain minimal and linked to one canonical owner.

### 5.2 Task/Test artifact

A numbered directory contains exactly the paired implementation contract and evidence:

```text
docs/tasks/NNNN-kebab-slug/
├─ TASK.md
└─ TEST.md
```

IDs are four-digit, ascending, and never reused, including after cancellation. Directory names, not timestamps, determine allocation. Completed paths are stable unless the user explicitly authorizes a rename.

New queue-aware pairs carry the marker `<!-- kyw-task-contract: 3 -->`. Contract 2 remains a readable queue-aware compatibility contract, and unmarked contract 1 remains legacy history. The supported Task/Test status pairs are:

- `DRAFT/DRAFT` — compatible authoring is incomplete;
- `READY/READY` — complete authoring is selectable;
- `IN_PROGRESS/RUNNING` — the sole active implementation;
- `DONE/PASSED` — repository outcome is complete;
- `BLOCKED/BLOCKED` — a required condition remains unmet and may be rechecked;
- `CANCELLED/BLOCKED` — explicit cancellation is terminal.

Every other combination fails closed. Existing unmarked legacy and contract-2 pairs retain their recorded meaning and readers without migration or retroactive immutability checks; new pairs use contract 3. This repository's still-nonterminal cutover pair may migrate from contract 2 to 3 before delivery, but terminal history is never rewritten.

For contract 3, the first complete production-evaluator-satisfied `HARDENED_EXACT_HEAD` `STANDARD` delivery is canonical. Its exact outcome, protected merge, post-main roles, canonical pair paths, and terminal `TASK.md`/`TEST.md` bytes become immutable. An unchanged later invocation is report-only. Any product, code, test, documentation, or evidence correction is a new explicit Task/Test pair with a hard dependency on the delivered Task; the original pair is not reopened, demoted, edited, renamed, deleted, replaced, or delivered again.

A selectable or active pair contains canonical sections with meaningful scope, acceptance, risk, handoff, mapped tests, executed evidence, unverified work, and final coverage. Templates own exact shape. `Not applicable — <reason>` is allowed only for an empty operational section; acceptance and its mapping remain substantive.

Model-dependent evidence records the model identifier, requested alias, reasoning effort, Codex surface, and Codex version with per-field observability. A field not exposed by the active surface is `UNAVAILABLE`; a different installed executable is not substituted.

### 5.3 Hard dependencies and queue selection

For each non-complete current pair, `Dependencies` is either the canonical no-dependency sentinel or one or more distinct canonical `- Task NNNN.` bullets. Explanatory mentions, negated dependencies, duplicates, mixed forms, missing references, and cycles fail closed.

A hard dependency is satisfied only when its repository outcome is `DONE/PASSED` and any required external delivery is satisfied. Draft, ready, active, blocked, cancelled, missing, or delivery-incomplete dependencies do not satisfy it.

A correction of a canonically delivered contract-3 Task must name that Task as a canonical hard dependency. Normal repository and external delivery satisfaction therefore gates correction selection without inventing a second delivery under the original Task.

At most one pair may be `IN_PROGRESS/RUNNING`. Exact selection cannot bypass another active Task. Automatic selection prefers:

1. the sole active Task;
2. the lowest repository-complete current Task whose required `STANDARD` delivery is resumable;
3. the lowest dependency-satisfied `READY/READY` Task.

A historical blocker that is neither active nor a hard dependency does not freeze unrelated current work. When no Task is selectable, the product reports the actual draft, blocked, cancelled, dependency, delivery, or queue-frontier condition rather than inferring completion from the highest ID.

The exact all-complete message is returned only when every applicable current pair is `DONE/PASSED`, every hard dependency is satisfied, and every required delivery is satisfied:

```text
현재 만들어진 Task는 모두 완료됐습니다. 더 이상 진행할 작업이 없습니다. 추가로 하고 싶은 작업이 있나요?
```

It creates no new Task.

## 6. Evidence, verification, and documentation behavior

### 6.1 Acceptance evidence

Each acceptance criterion has a stable identifier and maps to one or more test rows. Each row states intent, method, level, status, and reproducible evidence. `PASS` requires an executed command or explicit verification method; `FAIL` retains the observed failure; `BLOCKED` identifies the missing required condition and recovery path; `N/A` requires a concrete reason; `TODO` makes no pass claim.

Verification is proportionate:

- **Focused** checks changed behavior and its closest regressions.
- **Stable** proves the full repository contract for runtime, cross-cutting, unknown, or higher-risk changes and remains mandatory on hosted PR and base-branch CI.
- **Release** proves immutable package and distribution boundaries only when release-sensitive work or an actual candidate requires it.

The active agent verifies directly by default. Subagents, isolated sessions, or model-backed evaluation are optional confidence tools unless current acceptance explicitly requires independence. Their absence is not itself a blocker. A generic full-suite pass supplements rather than replaces acceptance-specific evidence.

### 6.2 Live execution record

During implementation, Task and Test stay synchronized with discoveries that change intent, design, scope, risk, expected behavior, commands, or coverage. Checkboxes and pass statuses are set only after the mapped result is observed. Failed attempts remain recorded when later work succeeds.

Before terminal success, inspect the complete relevant diff, separate selected-Task work from pre-existing changes, enumerate introduced behavior and compatibility effects, map each item to evidence, investigate out-of-scope paths, and synchronize affected permanent owners. Unsafe scope drift blocks rather than being hidden.

If work stops, the pair preserves enough verified completed work, remaining order, exact resume point, blockers, repository state, results, and unverified risk for a fresh session to continue without rereading unrelated completed Tasks or repeating completed external actions.

### 6.3 Ordinary prompts

When the user asks a question or small bounded change without an explicit Skill invocation:

- recognize only the three exact managed existing-Task aliases when the applicable routing contract is loaded;
- otherwise answer, diagnose, or implement directly without creating a numbered Task by default;
- inspect relevant facts and preserve user work;
- run proportionate verification for changed code or configuration;
- route durable meaning to `README.md`, `AGENTS.md`, `docs/SPEC.md`, or `docs/ARCHITECTURE.md` by ownership;
- leave unaffected documents byte-stable.

Explanations and small clearly bounded fixes do not require a numbered Task unless the user asks for one.

## 7. STANDARD delivery contract

A current Task declares one static delivery policy:

- `STANDARD` — GitHub PR/Actions exact-SHA state is the canonical mutable ledger;
- `NONE — <reason>` — no external delivery gate applies.

The Task/Test pair owns repository outcome and reproducible local evidence; GitHub owns mutable PR, review, run, merge, and post-merge state. Static `STANDARD` text alone authorizes no ambient mutation. A recognized `$kyw-impl` selection grants ordinary delivery for that selected outcome after repository completion.

The normal `$kyw-impl NNNN` path accepts only the invocation. It derives the exact required prior-delivery set from queue and dependency truth, validates one fixed-bounded rolling continuity checkpoint read from exact aligned `main`, and creates a distinct production-evaluated continuity classification for its exact covered prefix. The checkpoint binds repository/base/main ancestry, the ordered covered-set and terminal-pair digests, hardened-contract version, cumulative evidence digest, prior checkpoint or genesis, and one sanitized transition receipt. It stores no raw log, credential, API response, or mutable GitHub graph and never becomes the current delivery ledger.

At most one prior `STANDARD` outcome may be uncovered. That outcome is freshly reconstructed from local ancestry and GitHub, must satisfy the existing production evaluator, and may prepare the next rolling checkpoint without mutation. Only a recognized `IMPLEMENT`, `RESUME`, or `DELIVER` result may hand the opaque transition into the selected active Task branch for atomic, idempotent application; the selected Task cannot attest to itself. An empty history may prepare genesis without GitHub access. Existing delivered history with no valid checkpoint, a gap larger than one, or a corrupt, stale, forked, downgraded, repository-mismatched, pair-mismatched, or noncanonical checkpoint requires separately explicit migration/rebaseline authority and has no automatic full-history fallback.

The current hardened contract is `HARDENED_EXACT_HEAD`. Trusted local expectations bind repository, base ref and SHA, outcome SHA, workflow identity, and required job-name sets. GitHub evidence keeps these roles distinct:

1. actual PR-head jobs check out and prove the selected outcome SHA;
2. a separately named merge compatibility job checks the synthetic base/head merge and proves both parents;
3. review state, mergeability, and the protected merge bind the expected head;
4. post-merge base-branch jobs check out and prove the resulting merge SHA.

A synthetic merge success never substitutes for actual head evidence. Job/run identities, attempts, conclusions, checkout evidence, and role separation must be exact, current, and non-reused. Missing logs, stale attempts, mismatched identity, failed CI, a review blocker, unsafe drift, or incomplete final evidence blocks advancement. A valid pending snapshot is resumable; only the full hardened graph is satisfied.

Explicit trusted pre-contract continuity may preserve already completed historical delivery while labeling actual-head evidence `UNVERIFIED`. It cannot be used for a newly delivered outcome or promoted to exact-head success. CI evidence proves delivery state, not behavioral acceptance.

Checkpoint-covered continuity preserves a previously complete evaluator result without relabeling it legacy or fresh. Expired covered Actions logs do not invalidate that durable result, while missing or mismatched evidence for the one uncovered or current outcome still fails closed. Repository `DONE/PASSED` acceptance and terminal pair-state integrity remain prerequisites, so checkpoint or CI success cannot substitute for behavioral acceptance.

For contract 3, the first satisfied hardened graph is also the sole delivery graph for that Task. The protected merge tree binds the exact terminal pair paths and bytes; aligned-main history, rolling continuity, and worktree checks reject later edits, deletion, rename, replacement, identity drift, or another Task-scoped delivery before dispatcher mutation. The diagnostic names the Task and affected path and directs correction through `$kyw-task "<correction outcome>"`. No PR chain, correction-receipt list, second checkpoint, or alternate ledger is created. Contract-1/2 history—including legitimate later historical merges—keeps its existing meaning.

Ordinary `STANDARD` authority covers exact-path commit, non-force push, non-draft PR creation, exact-head CI observation, review and mergeability inspection, expected-head protected merge, post-merge base CI observation, and terminal reporting. Publication, registry/version/tag/Release/public submission, force push, destructive recovery, branch deletion, workflow rerun, bypass, and unrelated mutation remain separate authority boundaries.

## 8. CLI and installation behavior

Executable: `kyw-dev`.

The mutating grammar is limited to:

```text
kyw-dev install --scope <user|project>
kyw-dev update --scope <user|project>
kyw-dev uninstall --scope <user|project> [--force]
```

Scope is required exactly once. Only uninstall accepts `--force`. `doctor`, help, and version are non-mutating.

### 8.1 Direct installation

User scope installs the five managed Skills beneath the user's managed Skills root. Project scope resolves the current Git repository and installs beneath its repository Skills root. Neither mode creates or replaces product documents.

Install and update:

- install only package-owned Skill and namespaced runtime bytes;
- record a versioned ownership manifest with package version and content hashes;
- refuse unknown files, unmanaged overwrite, unsafe links or types, path escape, colliding portable identities, malformed metadata, or unprovable ownership;
- update only files proven to match the recorded managed state;
- stage and recover bounded managed changes without treating a process identifier, path age, or host name as ownership;
- preserve unrelated Skills and project content;
- never rely on `postinstall`, `prepare`, or other npm lifecycle scripts.

Uninstall removes only manifest-owned managed files. Normal uninstall refuses modified, missing, unknown, linked, or unsafe state. `--force` is explicit permission to remove an existing modified regular file already named in valid ownership metadata; it never authorizes deletion of unknown content, unrelated Skills, unsafe links, unsupported file types, or a broad Skills root.

### 8.2 Diagnostics and CLI responses

`kyw-dev doctor` is byte-and-metadata read-only. It reports supported Node/npm availability, detectable Codex state, user/project/plugin-cache sources, duplicate Skill names, version drift, malformed metadata, unsafe path/link/type state, permissions, and incomplete managed transactions. Plugin-cache discovery reports installed bytes and source without claiming that a plugin is enabled.

Doctor returns the most severe applicable category. Missing project scope outside Git and undetected optional tools are non-failing information or warnings.

No arguments, `-h`, and `--help` print help successfully. `-V` and `--version` print the exact package version. Invalid grammar prints usage and fails. Dispatch does not change the current working directory.

Stable exit categories are:

| Code | Meaning |
|---:|---|
| 0 | success or healthy diagnostics |
| 1 | usage error |
| 2 | unsupported runtime |
| 3 | scope resolution failure |
| 4 | unsafe overwrite, local-change, or duplicate conflict |
| 5 | malformed package or installation state |
| 6 | filesystem or permission failure |
| 7 | recovery required |

## 9. Compatibility and distribution

### 9.1 Supported surfaces

- Direct managed Skills are supported on the ChatGPT desktop app, Codex CLI, and IDE extension.
- Plugins are supported on the ChatGPT desktop app and Codex CLI; IDE users use direct user- or repository-scope Skills.
- Every Skill contains `SKILL.md` plus UI metadata and disables implicit invocation.
- The plugin root contains `.codex-plugin/plugin.json` and uses plugin-relative Skill paths.
- The runtime floor is Node.js 22 or newer. Required stable evidence covers Node.js 22 and 24 on Linux, macOS, and Windows, with a bounded Linux compatibility lane for the current next major runtime.
- Native path, permission, link, and junction behavior is verified on supported operating systems. An unavailable required capability is blocked evidence, not a passing skip.
- Contract-3, contract-2 compatibility, and unmarked legacy Task readers remain compatible without rewriting historical artifacts.

### 9.2 Package boundary

The source package and plugin metadata version is the unpublished `0.1.3` candidate; the public npm registry still serves `0.1.2` under `latest`. The candidate tarball includes plugin metadata, all five Skills, their required templates and deterministic support, CLI/runtime source, README, license, third-party notices, and upstream attribution.

Semantic versioning applies; `0.x` unfinished interfaces may change only with documented migration impact.

The tarball excludes development-only tests and evaluation output, local marketplace fixtures, repository Task/bootstrap documents and continuity checkpoint state, generated archives, credentials, machine-local configuration, and absolute machine paths. A positive package allowlist and inspection of real packed bytes enforce that boundary. The production package has no production or development dependency requirement for its workflow behavior.

Direct and plugin installation use the same packaged Skill meaning without copying a second Task/runtime/delivery engine. An npm or GitHub marketplace source may identify the plugin, but npm-based installation must work without lifecycle scripts.

Public pull requests and base-branch pushes run credential-free, read-only stable CI at exact executable identities. Required checks include the supported runtime/OS lanes, package selection, actual PR-head jobs, synthetic merge compatibility for PRs, and a separate packed-bytes lane. Model-backed or desktop-only checks do not become mandatory public-PR gates when the environment cannot provide them.

## 10. Progressive loading and document growth

### 10.1 Context loading

Every workflow loads the applicable `AGENTS.md` and the selected/current Task/Test pair when one exists. For ordinary authoring, implementation, and audit work, first index or search `README.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`, then read the owner sections indicated by the goal, scope, Documentation Impact, changed code, and explicit dependencies.

Read all four permanent documents for `$kyw-init`, rebaseline, major redesign, broad cross-owner work, a source conflict, ambiguous ownership, a missing expected owner heading, or insufficient targeted truth. If full reading does not resolve the conflict or establish authority, fail closed instead of choosing a convenient source.

Progressive loading reduces irrelevant context; it never permits a workflow to skip the source that owns changed meaning or to overlook a selected Task/Test contract.

### 10.2 Deterministic growth policy

The permanent-document inventory is exactly the four established paths. Deterministic validation enforces path/role uniqueness, readable Markdown structure, valid local links and command references, one canonical owner per guarded rule family, allowed minimal projections, chronology/evidence separation, and warning/hard byte budgets. It uses no fuzzy similarity score or model-backed grader.

Current future-growth budgets are:

| Document | Warning | Hard |
|---|---:|---:|
| `README.md` | 20 KiB | 24 KiB |
| `AGENTS.md` | 4 KiB target | 8 KiB |
| `docs/SPEC.md` | 40 KiB | 48 KiB |
| `docs/ARCHITECTURE.md` | 56 KiB | 64 KiB |
| Combined | 112 KiB | 128 KiB |

A permanent-document change records before/after UTF-8 bytes and lines for all four paths and the combined set in the current Test evidence. Additional durable-necessity and replacement/absorption evidence is required when one document grows by at least 2 KiB, grows by at least 10 percent, produces any positive combined net growth, or crosses a warning.

That evidence identifies the canonical owner of added meaning, why existing sections could not absorb it, and which duplication was removed or replaced. A warning or hard budget change additionally requires explicit Task acceptance and explicit user approval. Validation never raises a limit from observed file size. A hard excess fails until the document is reduced or a separately authorized policy change supplies the required evidence.

## 11. Safety and integrity

- Never expose secrets encountered during inspection.
- Never silently overwrite unknown or unrelated user files.
- Preserve pre-existing changes and classify unexplained work before mutation.
- Confine managed paths beneath the validated owner root and reject absolute, traversal, drive-relative, separator-confused, normalization-colliding, linked, or unsupported paths.
- Make managed installation and adaptive Task publication interruption-safe and recover only bytes whose exact ownership and identity can be proved.
- Never recursively delete a broad home, repository, `.agents/skills`, or unknown directory.
- Never infer a test pass, delivery pass, all-complete verdict, or publication approval from missing evidence.
- Never treat static policy text, CI success, an npm dry run, or publishable metadata as authority for a separate external mutation.
- Never depend on npm lifecycle scripts for plugin or direct Skill installation.
- Do not add a production dependency merely to enforce documentation or workflow policy.

## 12. MVP Acceptance

The product is accepted when the following observable results are demonstrated:

- **AC-01:** The package contains valid plugin metadata, five explicit-only packaged Skills, deterministic support, legal notices, and only the intended distribution bytes.
- **AC-02:** User-scope direct installation makes the five Skills discoverable without modifying project documents or unrelated Skills.
- **AC-03:** Project-scope direct installation confines the five Skills to the selected repository and preserves existing product files.
- **AC-04:** `$kyw-init` initializes an empty project and adopts an existing project only after shared understanding, producing exactly the four permanent documents without destructive replacement.
- **AC-05:** `$kyw-task` authors one complete pair for one outcome or the smallest dependency-aware complete set, while `$kyw-impl` selects only an existing eligible pair and never allocates or recreates one.
- **AC-06:** Authoring publishes canonically valid `READY/READY` pairs, reports exactly one next `$kyw-impl NNNN`, and stops without implementation or automatic chaining.
- **AC-07:** Verification detects an intentionally uncovered implementation branch despite a passing generic suite, retains failed or blocked evidence honestly, and closes final-diff coverage before repository success.
- **AC-08:** An ordinary bounded change updates only affected code, tests, and durable owner documents without creating a numbered Task by default.
- **AC-09:** `$kyw-audit` detects stale permanent truth, unsupported pass claims, scope drift, and missing acceptance mapping while remaining byte-stable unless exact `--fix` authority is present.
- **AC-10:** Update, doctor, and uninstall preserve unrelated files, detect duplicates and unsafe state, and keep `--force` within valid recorded ownership.
- **AC-11:** Contract-3, contract-2, and legacy Task readers, one-active selection, hard dependencies, immutable future terminal evidence, terminal queue verdicts, and current `STANDARD` delivery classifications remain deterministic and fail closed.
- **AC-12:** Hosted CI distinguishes actual PR-head evidence, synthetic merge compatibility, protected merge, and post-merge base evidence at exact identities without using CI as behavioral or publication approval.
- **AC-13:** Direct and plugin installation load the same five Skill contracts on supported surfaces without lifecycle scripts or a duplicate engine.
- **AC-14:** Progressive loading selects the durable owner from explicit scope signals and escalates broad, conflicting, ambiguous, missing, or insufficient truth to a full read.
- **AC-15:** Permanent-document validation enforces the exact four-path inventory, ownership, growth evidence, budgets, chronology separation, and command validity through ordinary CI.
- **AC-16:** The published package version and third-party licensing are truthful, while publication remains separately authorized.
- **AC-17:** The trusted npm workflow is manual-only, projects one repository-owned OIDC publisher expectation, verifies the requested `main` SHA/version and an independent candidate, publishes the exact Git checkout directory once, and cannot publish from merge or CI success.

## 13. Publication state and authority

Current repository package and plugin metadata identify unpublished candidate version `0.1.3`, package/plugin/CLI name `kyw-dev`, MIT licensing, author display name `Kim Yeongwoo`, copyright `Copyright (c) 2026 Kim Yeongwoo`, public source repository `https://github.com/kimyeongwoo/kyw-dev`, and its issue tracker.

The public npm registry serves `kyw-dev@0.1.2` under the `latest` tag and retains `0.1.0` and `0.1.1`. The single authorized `0.1.2` publication came from the configured GitHub Actions trusted publisher and carries registry signatures plus SLSA provenance binding the package digest to `.github/workflows/publish.yml`, `refs/heads/main`, and the exact published source commit. Canonical npm version metadata does not expose `gitHead`; provenance supplies the observable source binding but does not satisfy a contract that explicitly requires that metadata field. Metadata otherwise targets the public registry and unscoped package identity. Optional contact, privacy, terms, and branding values are omitted rather than invented. No Git version tag, GitHub Release, or public plugin-directory submission is part of the current publication.

Packing, local marketplace verification, exact-SHA CI, release-candidate checks, and `npm publish --dry-run` are evidence only. The mutating `npm publish`, registry mutation, package version change, tag, GitHub Release, public plugin submission, or other public distribution action requires separate explicit user authority after current public-registry, repository-owned publisher-expectation, and exact-workflow checks. Routine release preflight does not require npm account/settings inspection, `npm login`, OTP, security-key authentication, or `npm trust list`. Account-side authentication is limited to initial setup, an explicitly authorized security/configuration audit or change, or investigation after an actual OIDC/publisher failure. No Skill or CI result may infer mutation authority.

One repository-owned expectation defines provider `GitHub Actions`, owner/repository `kimyeongwoo/kyw-dev`, workflow path `.github/workflows/publish.yml`, environment `npm-production`, and allowed action `npm publish`; foundation and workflow tests project every tuple field from that owner into the exact delivered workflow bytes. The workflow is a separate `workflow_dispatch`-only surface requiring the current `main` ref plus exact expected source SHA and package/plugin version. Only its publishing job receives `contents: read` and `id-token: write`; it has no automatic trigger, long-lived npm token, interactive authentication, account-inspection, retry, second-dispatch, or fallback path. Merging or passing CI cannot invoke it.

An authorized run must pass the Stable gate, independently create and verify one exact retained candidate, prove the target version absent, reconfirm a clean exact-SHA checkout, and call `npm publish .` for that real Git directory exactly once without retry, fallback credentials, or an independent dist-tag/tag/Release action. The submitted tarball must match the independently inspected candidate, while npm derives `gitHead` from the checkout rather than fabricated package or registry metadata. Successful publication is canonical runtime proof that npm accepted the GitHub-issued OIDC identity and produces provenance automatically. OIDC/publisher rejection fails the workflow and blocks the executing Task; it never causes automatic account reauthentication or another publish path.
