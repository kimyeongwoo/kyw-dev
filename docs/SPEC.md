# kyw-dev Product Specification

## 1. Purpose and authority

This document owns `kyw-dev` behavior, safety, and acceptance. `docs/ARCHITECTURE.md` owns structure and boundaries. Skills/references own authoring, implementation, delivery, and audit procedure; source/tests own mechanics; Task/Test and GitHub own work evidence.

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

The six packaged Skills and deterministic support are distributable through GitHub/npm as a Codex plugin or managed user/project Skills.

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

## 4. Six explicit-only Skills

The product exposes exactly six user-visible Skills: `$kyw-grilling`, `$kyw-init`, `$kyw-task`, `$kyw-impl`, `$kyw-deliver`, and `$kyw-audit`. All six publish `allow_implicit_invocation: false`; ordinary prose never invokes them by resemblance. Exact Skill syntax or the three implementation-only managed aliases activates an invocation-local workflow.

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
- for every prospective `STANDARD` pair, require one user-selected stable SemVer release version and freshly prove it non-conflicting against canonical npm history, bounded matching publication attempts, tag/Release state, package/plugin truth, and current-queue claims; missing, occupied, duplicate, unreadable, or ambiguous state blocks instead of selecting or incrementing a version;
- allocate unique final IDs and paths, author both files with mapped acceptance, validate every pair and the full dependency graph, and publish the set atomically as `READY/READY`;
- when the requested outcome corrects an already canonically delivered future-contract Task, preserve that pair and make the new correction pair hard-depend on it;
- leave application files and permanent documents unchanged while recording expected documentation impact for execution;
- fail closed without claiming a clean partial queue when publication ownership or rollback safety is uncertain;
- retain existing `DRAFT/DRAFT` and legacy readers for compatibility without making new adaptive authoring depend on placeholders;
- redirect a non-DRAFT exact pair to its state-appropriate `$kyw-impl NNNN` or `$kyw-deliver NNNN` command.

`$kyw-task` does not invoke or chain `$kyw-impl`. After successful authoring it reports created paths and dependencies, prints exactly one next `$kyw-impl NNNN` command for the first eligible pair, and stops without implementation, commit, PR, or delivery.

Detailed decomposition and publication procedure belongs to `skills/kyw-task/SKILL.md`; the sole packaged Task adapter owns deterministic queue and artifact mechanics.

### 4.4 `$kyw-impl`

`$kyw-impl NNNN` selects one exact existing Task for implementation, resume, verification, documentation synchronization, and truthful repository terminal state. It never allocates, authors, selects delivery, or performs delivery. Only an attempted `kyw-impl` with a goal, missing ID, or new outcome redirects to `$kyw-task "<outcome>"`; ordinary prose does not.

When a managed `AGENTS.md` contract is loaded, only these anchored aliases are equivalent existing-Task requests:

```text
task NNNN 실행해줘
task 진행해줘
남은 task 계속 실행해줘
```

The portable `$kyw-impl NNNN` form works without managed routing. Incidental prose containing “task” remains an ordinary prompt.

Required behavior:

- resolve every four-digit ID through the generic queue, reserve or intercept no ID for recovery, and reject a missing, duplicate, draft, inconsistent, dependency-blocked, or conflicting selection;
- implement only the selected Task scope and preserve unrelated or unexplained user work;
- transition and validate the Task/Test pair together, then keep scope, discoveries, risks, decisions, documentation impact, progress, resume state, and evidence truthful;
- on resume, verify recorded completed work against files and version control and continue from the valid resume point instead of repeating externally visible or destructive actions;
- classify appended clauses once: continue aligned constraints, but put a changed baseline, Task, acceptance, scope, action, target, or attempt through Section 6.3 before mutation;
- preserve the configured model and effort unless the current user explicitly overrides them, and label unavailable model provenance rather than inferring it;
- before its one dispatcher call, read-only validate prior `STANDARD` continuity from aligned `main` and at most one freshly evaluated uncovered predecessor, blocking before mutation on invalid or over-gap proof;
- treat a canonically delivered future-contract Task as report-only, reject later terminal-pair or delivery-identity drift before dispatch, and route correction intent to a new explicit hard-dependent Task;
- run acceptance-specific and risk-proportionate verification, record failures as well as later passes, and block when required evidence cannot run;
- synchronize only permanent owners whose durable meaning changed;
- compare the complete final diff with scope and the intent-to-test matrix before terminal success;
- for contract-4 `STANDARD`, revalidate the immutable Task-owned release version against fresh npm/run/tag/Release, package/plugin, and queue evidence before terminal success without performing a public write;
- checkpoint verified completed work, ordered remaining work, an executable resume point, blockers, repository state, and test evidence before interruption or compaction;
- set repository success only when acceptance, verification, final coverage, documentation, scope, and pair validation all agree.

`task 진행해줘` resumes the sole active Task, otherwise selects the lowest dependency-satisfied ready Task. Any current or predecessor pending `STANDARD` delivery blocks with its exact `$kyw-deliver NNNN`; implementation aliases never select it. Continuous mode is serial and invocation-local, may advance after reasoned `NONE`, and stops at every `STANDARD` completion.

A selected `IMPLEMENT` or `RESUME` continues its aligned repository lifecycle without duplicate guardrail confirmation. On `STANDARD` `DONE/PASSED`, every implementation mode prints exactly `다음 단계: $kyw-deliver NNNN` and stops without chaining. Reasoned `NONE` ends locally. Material change enters Section 6.3; conflict, unsafe drift, unexplained work, failed evidence, or user decision blocks. Detailed repository procedure belongs to `skills/kyw-impl/references/execution.md`.

### 4.5 `$kyw-deliver`

Only exact plain `$kyw-deliver NNNN` routes. For contract-4 `STANDARD`, one invocation resumes GitHub delivery and, after exact `FINAL`, continues without prompting through public release. `--public-release`, other suffixes, and bare, alias, prose, implicit, chained, continuous, or background forms grant no authority.

The route selects only `DONE/PASSED` `STANDARD`. It resumes exact-path commit → non-force push → non-draft PR → head/synthetic CI → review/mergeability → expected-head merge → post-main CI without repeats or bypass. Versionless contract 1–3 stays GitHub-only/report-only. Contract 4 carries one stable SemVer Release version; delivery cross-checks this immutable value with the delivered package/plugin tree and gates every public write on evaluator-proven `FINAL`.

After that gate, one frozen Task/repository/base/workflow/package/plugin/registry/tarball/merge/tag/Release tuple orders npm → exact-SHA tag → GitHub Release. Fresh whole-state reads classify `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, or `UNKNOWN`: only absent creates once, exact skips, pending observes, and conflict/unknown blocks. Resume starts at the first safe absent stage; failure or ambiguity permits bounded reads, never retry, fallback, repair, or later writes.

Success requires fresh canonical npm tarball/metadata/signature/provenance plus exact workflow attempt, merge-SHA tag, and Release proof. Diagnostics are bounded/redacted; public state never changes the pair or continuity. Corrections use a hard-dependent Task. The delivery reference owns GitHub procedure; its internal public reference loads only after contract-4 `FINAL` in the same invocation.

### 4.6 `$kyw-audit`

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

New pairs use marker `<!-- kyw-task-contract: 4 -->`; contract 3 remains queue-aware/immutable-terminal, contract 2 queue-aware compatibility, and unmarked contract 1 legacy. Supported status pairs are:

- `DRAFT/DRAFT` — compatible authoring is incomplete;
- `READY/READY` — complete authoring is selectable;
- `IN_PROGRESS/RUNNING` — the sole active implementation;
- `DONE/PASSED` — repository outcome is complete;
- `BLOCKED/BLOCKED` — a required condition remains unmet and may be rechecked;
- `CANCELLED/BLOCKED` — explicit cancellation is terminal.

Other combinations fail closed. Contracts 1–3 keep their readers and meaning; only nonterminal pairs may migrate to 4. Terminal history is never rewritten.

For contracts 3/4, the first evaluator-satisfied `HARDENED_EXACT_HEAD` graph canonically freezes outcome, merge/post-main roles, pair paths/modes, and terminal bytes. Later contract 3 is report-only; contract 4 reconstructs public stages externally without pair/continuity edits. Corrections require a new hard-dependent pair; the original is never reopened, edited, moved, replaced, or redelivered.

A selectable or active pair contains canonical sections with meaningful scope, acceptance, risk, handoff, mapped tests, executed evidence, unverified work, and final coverage. Templates own exact shape. `Not applicable — <reason>` is allowed only for an empty operational section; acceptance and its mapping remain substantive.

Model-dependent evidence records the model identifier, requested alias, reasoning effort, Codex surface, and Codex version with per-field observability. A field not exposed by the active surface is `UNAVAILABLE`; a different installed executable is not substituted.

### 5.3 Hard dependencies and queue selection

For each non-complete current pair, `Dependencies` is either the canonical no-dependency sentinel or one or more distinct canonical `- Task NNNN.` bullets. Explanatory mentions, negated dependencies, duplicates, mixed forms, missing references, and cycles fail closed.

A hard dependency is satisfied only when its repository outcome is `DONE/PASSED` and any required external delivery is satisfied. Draft, ready, active, blocked, cancelled, missing, or delivery-incomplete dependencies do not satisfy it.

A correction of a canonically delivered contract-3/4 Task must name it as a hard dependency. Repository and delivery satisfaction gate correction selection without inventing a second delivery under the original Task.

At most one pair may be `IN_PROGRESS/RUNNING`. Exact selection cannot bypass another active Task. Automatic selection prefers:

1. the sole active Task;
2. the lowest dependency-satisfied `READY/READY` Task whose predecessors have satisfied delivery.

A historical blocker that is neither active nor a hard dependency does not freeze unrelated work. Implementation never skips pending earlier delivery; it reports the exact deliver command. Delivery selects only its explicit ID. Otherwise the actual draft, blocked, cancelled, dependency, delivery, or frontier condition is reported rather than inferred completion.

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

The complete required local Release graph is unchanged Stable `npm run check`, one real-tarball `npm run release:candidate`, and composite `npm run release:ci`; the planner selects exactly the composite for release-sensitive paths or explicit candidate intent. `npm run release:check` is only an optional thin alias for `npm publish --dry-run --json`. It is not required evidence, a planner result, a CI or publication-workflow step, or publication authority.

The active agent verifies directly by default. Subagents, isolated sessions, or model-backed evaluation are optional confidence tools unless current acceptance explicitly requires independence. Their absence is not itself a blocker. A generic full-suite pass supplements rather than replaces acceptance-specific evidence.

### 6.2 Live execution record

During implementation, Task and Test stay synchronized with discoveries that change intent, design, scope, risk, expected behavior, commands, or coverage. Checkboxes and pass statuses are set only after the mapped result is observed. Failed attempts remain recorded when later work succeeds.

Before terminal success, inspect the complete relevant diff, separate selected-Task work from pre-existing changes, enumerate introduced behavior and compatibility effects, map each item to evidence, investigate out-of-scope paths, and synchronize affected permanent owners. Unsafe scope drift blocks rather than being hidden.

If work stops, the pair preserves enough verified completed work, remaining order, exact resume point, blockers, repository state, results, and unverified risk for a fresh session to continue without rereading unrelated completed Tasks or repeating completed external actions.

### 6.3 Activation-scoped guardrails and ordinary prompts

<!-- kyw-active-skill-guardrails:v1 -->

The kyw guardrail lifecycle is conversation-local and has no persistent approval store or production natural-language authority classifier:

| State | Required behavior |
|---|---|
| `INACTIVE` | Only an exact explicit Skill invocation or exact managed alias activates a workflow. Ordinary and post-terminal prompts receive no kyw-only block, warning, Task selection/allocation, or Task redirection. |
| `ACTIVE_ALIGNED` | The invoked Skill has an established shared baseline, mode, selected Task when applicable, acceptance, scope, action, target, and attempt. A matching command continues without a duplicate guardrail confirmation; Skill-native decision or write confirmations still apply. |
| `CHANGE_PENDING` | A material baseline, Task, acceptance, scope, action, target, attempt, or workflow-boundary change first emits the warning below and waits with zero mutation. |
| `RECONFIRMED_BOUNDED` | Only the trusted current user's immediately next, explicit, unambiguous confirmation of that exact warning and unchanged facts permits synchronization followed by the warned action within its exact bounds. |
| `CANCELLED_OR_EXPIRED` | Cancellation, decline, ambiguity, an intervening or stale response, changed facts, or different/additional bounds clears the pending warning without mutation; a changed request needs a fresh warning. Completion, stop, cancellation, and expiry end the active lifecycle. |

The pending warning binds a fresh identity to the controlling old criterion, requested new criterion, concrete implementation, Task/Test, permanent-document, verification, and delivery impacts, plus action, target, scope, and attempt. Created after classification, it cannot be confirmed by its originating or combined message. The changed clause makes no Task/Test, permanent-document, implementation, dispatcher-side, or external mutation while pending.

Fresh reconfirmation must be the immediately following trusted-current-user response and exactly accept the warning identity, unchanged baseline, Task, acceptance, facts, and bounds without another action or choice. Before implementation or external mutation, synchronize affected permanent owners and every applicable mutable Task/Test contract; then execute only that action, target, scope, and attempt. A mutable kyw project criterion cannot remain a veto afterward.

Non-route changes rewarn; route-locked replacement expires to its exact route; prior confirmation never revives. Publication/registry/version/tag/Release/submission remain distinct bounds except that an exact plain contract-4 delivery freezes its already selected version and fixed public stages only after `STANDARD FINAL`. Retry/fallback, force/destructive, bypass/admin/account, deletion, and unrelated mutation stay separate; failure grants no retry.

A combined message activates/routes once: classify clauses independently, continue aligned ones, warn before change, and await later exact reconfirmation. Never redispatch, chain Skills, broaden bounds, or waive system/platform safety, secrets, user-work preservation, honest evidence, delivered-pair immutability, or exact Skill/mode/dispatcher routing.

Outside an active lifecycle, handle prompts ordinarily: inspect facts, preserve user work, verify proportionately, update affected permanent owners, and leave others byte-stable. Create/select no Task unless the prompt is an exact route; explanations and small fixes need none unless requested.

## 7. STANDARD delivery contract

A current Task declares one static delivery policy:

- contract-4 `STANDARD` — exactly one stable SemVer `Release version` selected before `READY`, with GitHub PR/Actions exact-SHA state as the canonical mutable delivery ledger;
- contract 1–3 `STANDARD` — historical versionless GitHub-only delivery/report semantics;
- `NONE — <reason>` — no external delivery gate applies.

Task/Test owns repository outcome, local evidence, and for contract 4 the immutable release version. GitHub owns mutable PR, review, run, merge, and post-merge state; npm and GitHub own public package/tag/Release state. Exact plain `$kyw-deliver NNNN` establishes the selected Task's complete authorized lifecycle, with public stages gated after `STANDARD FINAL` only for contract 4. Changed bounds use Section 6.3; static policy and post-terminal prose execute nothing.

Normal dispatch accepts only the invocation. Implementation read-only derives required prior delivery; delivery separately hydrates the current graph. Both validate one fixed-bounded checkpoint from exact aligned `main`, binding repository/base ancestry, ordered covered set, terminal-pair/contract/cumulative evidence digests, prior checkpoint/genesis, and one sanitized transition receipt—never raw logs, credentials, API responses, or a mutable GitHub graph.

At most one prior `STANDARD` outcome may be uncovered and freshly production-evaluated. For selected `DELIVER`, the sole adapter call invokes the dispatcher exactly once, then passes any prepared predecessor state in memory through the existing validated atomic/idempotent apply path at most once before returning. The selected Task cannot cover itself. Apply failure or uncertainty exposes no successful delivery selection and blocks commit, push, PR, merge, npm, tag, and Release mutation; no continuity payload or manual apply command is returned to the caller. Invalid history/checkpoint, over-one gap, drift, evaluator failure, or self-coverage blocks without replay. Separate `bootstrap-continuity` requires exact `EXPLICIT_REBASELINE`; it is no dispatch option, ID exception, or source-repair path.

The current hardened contract is `HARDENED_EXACT_HEAD`. Trusted local expectations bind repository, base ref and SHA, outcome SHA, workflow identity, and required job-name sets. GitHub evidence keeps these roles distinct:

1. actual PR-head jobs check out and prove the selected outcome SHA;
2. a separately named merge compatibility job checks the synthetic base/head merge and proves both parents;
3. review state, mergeability, and the PR merge bind the expected head;
4. post-merge base-branch jobs check out and prove the resulting merge SHA.

A synthetic merge never substitutes for actual-head evidence. Run latest-attempt and each logical job's actual execution attempt are distinct. Hydration reconciles bounded `filter=all`, latest, and attempt-specific jobs, selects the newest actual execution, and reuses an earlier projection only when envelope, chronology, steps, and log uniquely prove it is that same untouched execution. A later failure, cancellation, incomplete run, or missing/invalid evidence never falls back to earlier success. Every checkout job's `KYWCIEVIDENCE.run_attempt` equals its independently derived attempt; aggregate jobs stay bound to authoritative dependency chronology. Identities, conclusions, evidence, and roles must be exact/current/non-reused. Missing, stale, fabricated, ambiguous, mismatched, failed, blocked, unsafe, or incomplete state stops; only the full hardened graph is satisfied.

Base protection is optional, not hardened evidence. Delivery combines the exact base's `protected` flag with complete branch-effective active repository/organization rules: successful false/empty is `ABSENT`, a positive signal `PRESENT`, and inaccessible/partial/malformed/conflicting state `UNKNOWN` and blocking. The exact route permits one expected-head merge without bypass/admin override. This disposition gates only an unfinished merge, is report-only, and never enters evaluator/checkpoint/pair state; post-merge resume neither repeats the merge nor invents past protection.

Trusted pre-contract continuity may preserve historical delivery with actual head visibly `UNVERIFIED`; it cannot serve a new outcome or become exact-head success. Checkpoint coverage preserves a prior complete evaluator result without relabeling it; expired covered logs remain durable, but uncovered/current evidence still fails closed. Repository `DONE/PASSED` and pair integrity remain prerequisites, so CI/continuity never substitutes for behavioral acceptance.

For contracts 3 and 4, the first satisfied graph is the sole delivery. Its expected-head merge tree owns exact pair paths, regular-file Git modes, and canonical blobs; aligned-main history, continuity, and worktree checks reject edit/delete/rename/replace/type/mode/identity drift or another Task delivery before mutation. A standard two-parent PR merge is Task-scoped only when its source begins with supported `task/NNNN`, `task-NNNN`, `agent/task/NNNN`, or `agent/task-NNNN` at the exact ID boundary; owner or later branch/slug/description text proves nothing.

A pair path without porcelain state is equivalent only when index mode, host-observable executable class, and raw bytes equal the canonical regular-file tree entry. The sole modified exception requires exact ` M`, bound path/type, unchanged tree/index/worktree mode class, and different worktree bytes whose one-way CRLF-pair-to-LF conversion exactly yields the untouched canonical blob. Canonical CRLF→worktree LF, bare CR, newline/whitespace/Unicode/content drift, staged/metadata state, link/type/mode/path differences never qualify. Diagnostics name Task/path and direct `$kyw-task "<correction outcome>"`. No PR chain, correction receipts, second checkpoint, or alternate ledger exists; contract-1/2 history keeps its meaning.

An aligned `STANDARD` lifecycle covers exact-path commit, non-force push, non-draft PR creation, exact-head CI observation, review and mergeability inspection, ordinary expected-head PR merge, post-merge base CI observation, and terminal reporting. Changed active bounds use Section 6.3 and remain attempt-specific.

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

User/project scope installs six managed Skills beneath its resolved Skills root without creating or replacing product documents.

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
- Contract-4, contract-3 immutable compatibility, contract-2 queue compatibility, and unmarked legacy Task readers remain compatible without rewriting historical artifacts.

### 9.2 Package boundary

The source package and plugin metadata identify the repository-selected version `0.2.0`; public npm `latest` is mutable canonical registry state and is never inferred from repository prose. The last verified historical public release is `0.1.4`. The tarball includes plugin metadata, six Skills, templates/support, CLI/runtime, README, and legal/attribution bytes.

Semantic versioning applies; `0.x` unfinished interfaces may change only with documented migration impact.

The tarball excludes development-only tests and evaluation output, local marketplace fixtures, repository Task/bootstrap documents and continuity checkpoint state, generated archives, credentials, machine-local configuration, and absolute machine paths. Packaged Skills/runtime are repository-neutral: no reserved Task ID or repository-specific recovery state. A positive package allowlist and inspection of real packed bytes enforce that boundary. The production package has no production or development dependency requirement for its workflow behavior.

Direct and plugin installation use the same packaged Skill meaning without copying a second Task/runtime/delivery engine. An npm or GitHub marketplace source may identify the plugin, but npm-based installation must work without lifecycle scripts.

Public pull requests and base-branch pushes run credential-free, read-only stable CI at exact executable identities. Required checks include the supported runtime/OS lanes, package selection, actual PR-head jobs, synthetic merge compatibility for PRs, and a separate packed-bytes lane. Model-backed or desktop-only checks do not become mandatory public-PR gates when the environment cannot provide them.

## 10. Progressive loading and document growth

### 10.1 Context loading

Every active kyw workflow loads applicable `AGENTS.md` and its selected/current Task/Test pair when one exists. Inactive ordinary prompts select none. For active authoring, implementation, delivery, and audit, first index or search `README.md`, `docs/SPEC.md`, and `docs/ARCHITECTURE.md`, then read owner sections indicated by goal, scope, Documentation Impact, code, and dependencies.

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

- Never request or expose credentials, auth headers/URLs, OTPs, JWTs, cookies, credential environment values, or unbounded raw logs; public-release diagnostics are bounded and recursively redacted.
- Never silently overwrite unknown or unrelated user files.
- Preserve pre-existing changes and classify unexplained work before mutation.
- Confine managed paths beneath the validated owner root and reject absolute, traversal, drive-relative, separator-confused, normalization-colliding, linked, or unsupported paths.
- Make managed installation and adaptive Task publication interruption-safe and recover only bytes whose exact ownership and identity can be proved.
- Never recursively delete a broad home, repository, `.agents/skills`, or unknown directory.
- Never infer a test pass, delivery pass, all-complete verdict, or publication approval from missing evidence.
- Never treat static policy text, CI success, an npm dry run, publishable metadata, or an expired warning as permission for a separate external mutation.
- Never depend on npm lifecycle scripts for plugin or direct Skill installation.
- Do not add a production dependency merely to enforce documentation or workflow policy.

## 12. MVP Acceptance

The product is accepted when the following observable results are demonstrated:

- **AC-01:** The package contains valid plugin metadata, six explicit-only Skills, deterministic support, legal notices, and only intended bytes.
- **AC-02:** User-scope direct installation exposes six Skills without modifying project documents or unrelated Skills.
- **AC-03:** Project-scope direct installation confines six Skills to the repository and preserves product files.
- **AC-04:** `$kyw-init` initializes an empty project and adopts an existing project only after shared understanding, producing exactly the four permanent documents without destructive replacement.
- **AC-05:** `$kyw-task` authors complete version-settled contract-4 pairs; `$kyw-impl` selects implementation only; exact plain `$kyw-deliver NNNN` is the sole delivery route and carries eligible contract-4 `STANDARD` work through GitHub delivery and its gated fixed public sequence in one invocation, while suffixes are unsupported.
- **AC-06:** Authoring publishes canonically valid `READY/READY` pairs, reports exactly one next `$kyw-impl NNNN`, and stops without implementation or automatic chaining.
- **AC-07:** Verification detects an intentionally uncovered implementation branch despite a passing generic suite, retains failed or blocked evidence honestly, and closes final-diff coverage before repository success.
- **AC-08:** An ordinary bounded change updates only affected code, tests, and durable owner documents without creating a numbered Task by default.
- **AC-09:** `$kyw-audit` detects stale permanent truth, unsupported pass claims, scope drift, and missing acceptance mapping while remaining byte-stable unless exact `--fix` authority is present.
- **AC-10:** Update, doctor, and uninstall preserve unrelated files, detect duplicates and unsafe state, and keep `--force` within valid recorded ownership.
- **AC-11:** Current/legacy readers, one-active selection, dependencies, implementation/delivery split, immutable terminal evidence, queue verdicts, resume/no-rerun, and delivery classifications remain deterministic and fail closed.
- **AC-12:** Hosted CI distinguishes actual PR-head evidence, synthetic merge compatibility, expected-head PR merge, and post-merge base evidence at exact identities without using CI as behavioral or publication approval.
- **AC-13:** Direct/plugin installation load the same six Skills without lifecycle scripts or a duplicate engine and safely read prior five-/four-Skill ownership generations.
- **AC-14:** Progressive loading selects the durable owner from explicit scope signals and escalates broad, conflicting, ambiguous, missing, or insufficient truth to a full read.
- **AC-15:** Permanent-document validation enforces the exact four-path inventory, ownership, growth evidence, budgets, chronology separation, and command validity through ordinary CI.
- **AC-16:** The published package version and third-party licensing are truthful, while publication remains separately authorized.
- **AC-17:** The manual trusted npm workflow projects one OIDC expectation, binds exact SHA/version/pack/prior-registry inputs, freshly excludes another run/tag/Release, publishes the clean checkout once, and cannot publish from merge/CI; Stable/candidate/exact-SHA evidence stays outside it.
- **AC-18:** Exact plain contract-4 delivery requires `STANDARD FINAL` before public writes, a Task-owned release version, frozen tuple, five-state whole-surface preflight, monotonic one-attempt npm→tag→Release resume, fresh canonical final proof, secret redaction, and unchanged terminal pair/continuity; implementation/tests perform zero live writes and versionless contract 1–3 remain GitHub-only.

## 13. Publication state and authority

Package/plugin metadata selects `kyw-dev@0.2.0`, MIT, author `Kim Yeongwoo`, `Copyright (c) 2026 Kim Yeongwoo`, source `https://github.com/kimyeongwoo/kyw-dev`, and its issue tracker. Optional contact/privacy/terms/branding and public plugin submission remain absent.

At this baseline, npm served historical `0.1.4` under `latest` and retained `0.1.0`–`0.1.3`; mutable registry state must be queried. Its trusted exact-checkout publication has matching `gitHead`, signatures, SLSA provenance, `v0.1.4` tag, and Release. Historical `0.1.2` retains signature/provenance but lacks `gitHead` because it used a prebuilt tarball.

Non-publishing proof is `npm run check`, one candidate, `release:ci`, and credential-free exact-SHA CI; implementation/tests/merge/CI make no live release. Only exact plain `$kyw-deliver NNNN` carries contract 4 beyond `FINAL`; all suffixes are unsupported. It consumes, never changes, the Task version. Routine preflight avoids npm account inspection/login/OTP/security keys; account auth is only for setup, explicit configuration work, or actual OIDC failure.

One expectation binds GitHub Actions, this repository, `publish.yml`, `npm-production`, and `npm publish`. Its manual OIDC job receives only required permissions; ten inputs bind main SHA/version, pack identity, prior registry state, and signing key. Any identity/state drift blocks before one real-checkout `npm publish . --ignore-scripts`. It has no automatic/token/interactive, retry, fallback, dist-tag, tag, or Release path. Success proves OIDC acceptance; rejection blocks without Task demotion or reauthentication.

After evaluator `FINAL`, freeze the Task/repository/base/workflow/package/plugin/registry/tarball/merge/tag/Release tuple. Before every write, read npm version/runs, tag/ref, and Release-by-tag together as `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, or `UNKNOWN`. Only absent creates once; exact skips; pending observes; conflict/unknown/out-of-order state blocks. Exact npm proves target `gitHead`, tarball bytes/digests, signature/provenance, public access, `latest`, and prior history. Then create at most one lightweight `v<version>` at the merge SHA and one asset-free Release titled `v<version>`, non-draft/non-prerelease.

Every invocation reconstructs state and resumes the first absent safe stage. Failure, timeout, race, malformed data, or lost response permits bounded reads only—never retry/fallback, force/edit/delete/repair, alternate credentials, or later writes. Final success requires fresh cache-bypassed npm plus exact workflow attempt, tag target, and Release proof. Bounded/redacted diagnostics exclude credentials/raw logs. `COMPLETE` or `BLOCKED` leaves immutable `DONE/PASSED` and `STANDARD` continuity unchanged.
