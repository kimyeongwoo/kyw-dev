# kyw-dev Architecture

## 1. Purpose and system context

This document owns the stable structure of `kyw-dev`: components, boundaries,
dependency direction, control and data flow, distribution, validation, and
technical trade-offs. Observable product behavior belongs in
[`SPEC.md`](SPEC.md); setup and usage belong in [`README.md`](../README.md);
repository-wide Codex invariants belong in [`AGENTS.md`](../AGENTS.md).
Detailed authoring, execution, and audit procedure lives with the owning Skill,
and current work or evidence lives in the selected Task/Test pair.

```text
GitHub source repository
        │
        ├─ npm package / Codex plugin bytes
        │       └─ plugin cache with five Skills
        │
        └─ direct CLI installation
                └─ user or project Skills + hidden runtime support
                           │
                           ▼
                    Codex discovers kyw-* Skills
                           │
                           ▼
                    target repository
                    ├─ four permanent documents
                    └─ numbered Task/Test pairs
```

There is no server, database, daemon, watcher, or telemetry component. After
package acquisition, normal use requires no kyw-dev network service. GitHub is
used only when a selected Task declares GitHub-backed `STANDARD` delivery.

## 2. Architectural principles

### A-01 — Reasoning in Skills, mechanics in deterministic code

Skills own interviews, decisions, scoped inspection, document reasoning,
evidence interpretation, and stop conditions. Dependency-free Node modules own
operations that require exact and repeatable behavior: template validation,
Task identity and dependency parsing, queue selection, transaction ownership,
delivery classification, install containment, hashing, and CLI dispatch.

Permanent documents do not copy those algorithms. They state only stable
product or architecture meaning and link to the canonical procedural owner.
The Task runtime also owns a closed rolling continuity checkpoint: Skills
decide when separately authorized migration or selected-branch application is
permitted, while deterministic code owns canonical bytes, digests, trust,
coverage, and atomic replacement.

### A-02 — Explicit heavyweight workflows

The five user-visible Skills—`kyw-grilling`, `kyw-init`, `kyw-task`,
`kyw-impl`, and `kyw-audit`—disable implicit invocation. A managed
`AGENTS.md` may route only the three exact existing-Task aliases to
`kyw-impl`; that repository projection does not enable general implicit Skill
matching. Ordinary prompts remain ordinary.

### A-03 — Progressive, fail-closed context loading

Applicable repository instructions and a selected/current Task/Test pair are
always loaded. README, SPEC, and ARCHITECTURE are first indexed by heading or
targeted search. Goal, scope, Documentation Impact, changed paths, and code
dependencies select the owning sections.

Initialization, rebaseline, major redesign, broad cross-owner changes, source
conflicts, ambiguous ownership, missing headings, or insufficient targeted
truth escalate to a full read of all four permanent documents. An unresolved
conflict stops the workflow. This reduces routine context without permitting a
workflow to guess at missing durable truth.

### A-04 — One Task is the execution boundary

A Task/Test directory is one resumable implementation packet. Authoring may
atomically create a dependency-aware set, but later implementation activates
at most one pair. Continuous execution is serial, advances only after the
current repository and delivery gates finish, and never becomes background
work. A future-contract pair becomes immutable after its first complete
hardened delivery; a correction receives a new hard-dependent Task identity.
Prior contracts stay grandfathered. Completed pairs remain historical evidence;
durable meaning is promoted to a permanent owner rather than recovered by
rereading history.

### A-05 — Preserve unknown and user-authored state

Repository edits, Task publication, direct installation, update, uninstall,
and recovery all fail closed when ownership, containment, type, link-free
ancestry, or expected identity cannot be proved. A force option may narrow a
known conflict policy; it never broadens path ownership. Generated project
documents are semantic user content and are not replaced during package
updates.

### A-06 — Distribution is complete without lifecycle scripts

Packed plugin and Skill bytes are usable as acquired. Installation never
depends on npm lifecycle scripts. The package contains no production
dependency, while development-only tests, evaluators, fixtures, and release
gates remain outside the runtime and package boundary.

## 3. Authority and dependency direction

### Document ownership

```text
Observable behavior, requirements, acceptance     → docs/SPEC.md
Components, boundaries, dependencies, flows       → docs/ARCHITECTURE.md
Setup, commands, configuration, usage              → README.md
Repository-wide Codex invariants                   → AGENTS.md
Current scope, decisions, handoff                   → active TASK.md
Test intent and reproducible repository evidence   → active TEST.md
Mutable PR, run, review, and merge identities       → GitHub
```

When durable meaning changes, the owning permanent document changes first,
then the current Task/Test pair and implementation align with it. An unaffected
owner is not edited merely to record review.

### Instruction authority and projections

Each normative rule family has one owner. Other surfaces carry only a named
minimal projection needed before that owner can be loaded.

| Rule family | Canonical owner | Permitted projection |
|---|---|---|
| Observable product and acceptance contracts | `docs/SPEC.md` | Concise purpose, invocation, and current status in README |
| Stable components, dependency direction, flows, and distribution structure | `docs/ARCHITECTURE.md` | Short repository-map links in README |
| Repository routing, preservation, progressive loading, evidence honesty, and completion | Root `AGENTS.md` | Canonical generated `AGENTS.md` template |
| New Task/Test authoring | `skills/kyw-task/SKILL.md` | Invocation and outcome summaries only |
| Existing-Task execution, resume, verification, documentation sync, and delivery | `skills/kyw-impl/references/execution.md` | `kyw-impl/SKILL.md` dispatch handoff plus concise repository/user projections |
| Independent audit and bounded repair | `skills/kyw-audit/references/audit.md` | Audit Skill handoff plus invocation summaries |
| Exact Task/Test shape | Canonical Task and Test templates | Deterministic template validator and minimal state semantics |
| Deterministic algorithms and exhaustive edge cases | Source and focused tests | Stable component/invariant descriptions here |
| Current and historical repository evidence | Current and historical Task/Test pairs | No permanent-document copy |

`CODEX_PROMPTS.md` is maintainer convenience, not normative authority. Mutable
GitHub facts never become a permanent-document or Task future-work snapshot.

### Code dependency direction

```text
Skills
  └─ one packaged Task adapter
       └─ Task artifact facade and cohesive core modules
            ├─ canonical template contracts
            ├─ queue and production delivery evaluator
            ├─ bounded local-Git / GitHub hydration inputs
            └─ fixed-bounded STANDARD continuity checkpoint

CLI entry
  └─ installation facade and cohesive core modules
       └─ package inventory + filesystem ownership state

development validation
  ├─ imports runtime/package surfaces for verification
  └─ is never imported by runtime, CLI, or packaged Skills
```

`kyw-task` and `kyw-impl` share the same packaged adapter and core graph. There
is one deterministic Task/runtime/delivery engine; neither Skill owns a copied
parser, allocator, queue, transaction, or delivery classifier. Facades keep
public imports stable while cohesive internals remain acyclic.

## 4. Component groups

### 4.1 Skill workflows

- `kyw-grilling` is a conversation-only decision primitive. It inspects
  targeted facts, asks one user-owned decision at a time, and writes no files.
- `kyw-init` owns confirmed creation or reconciliation of exactly the four
  permanent documents. It does not implement the application or create Tasks.
- `kyw-task` owns new complete Task/Test authoring and compatible DRAFT
  completion. It does not implement or deliver an existing Task.
- `kyw-impl` owns selection and execution of an existing Task through
  repository outcome and ordinary declared delivery. It never allocates or
  authors a pair.
- `kyw-audit` independently compares one Task with established truth and
  evidence. Its bare mode has no mutation authority; exact repair mode remains
  bounded to demonstrated in-scope findings.

The long semantic procedures remain in their Skill/reference owners so normal
discovery does not load every workflow.

### 4.2 Task artifact runtime

The Task runtime is grouped by responsibility:

- template contracts validate canonical project and Task/Test artifacts;
- shared primitives own portable identities, hashes, and transaction constants;
- artifact contracts parse paths, markers, statuses, dependencies, and delivery
  declarations;
- queue logic validates the dependency graph and deterministic selection;
- creation logic publishes complete authored sets under ownership proof;
- delivery logic parses invocation, preflight, and exact-SHA evidence roles;
- hydration binds a future terminal pair's canonical path and bytes to its
  first evaluator-satisfied hardened merge and rejects later history/worktree
  drift before dispatch;
- continuity logic owns the canonical rolling checkpoint, ordered coverage and
  terminal-state digests, aligned-main trust, opaque transition, and atomic
  idempotent replacement;
- one facade and one process adapter expose the combined public surface.

The process adapter accepts explicit validated arguments and delegates all
meaningful mechanics. In an npm/plugin tree it imports the package core. A
direct installation falls back to the hidden managed runtime copied beside the
Skills. That runtime is not itself a discoverable Skill.

### 4.3 CLI and installation runtime

The dependency-free CLI parses only the supported command grammar and delegates
to an installation facade. Cohesive internals own:

- physical user/project scope resolution;
- package and managed-file inventories;
- ownership metadata and installed-state inspection;
- atomic install/update/uninstall transactions;
- read-only doctor diagnostics.

These modules do not import Skills or development validation. Installation
inventory may copy packaged Task runtime bytes without depending on their
logic.

### 4.4 Templates

Project templates establish responsibilities for README, AGENTS, SPEC, and
ARCHITECTURE. Task templates establish the paired contract and evidence fields.
Templates are authoring inputs, not generated mirrors of current repository
truth. Skills customize them from inspected facts and settled decisions, and
deterministic validation prevents unresolved tokens or contract drift.

### 4.5 Development validation

Tests and scripts own exhaustive fixture inventories, mutation cases,
implementation constants, evaluator behavior, and release checks. Major groups
are:

- foundation and instruction-surface validation;
- Task/runtime and installer unit/integration tests;
- direct behavioral acceptance fixtures;
- package and isolated marketplace checks;
- optional model-backed grilling/audit evaluators;
- verification planning and hosted CI.

All are development-only unless a specific deterministic helper is explicitly
listed in the package allowlist.

### 4.6 External delivery ledger

For `STANDARD`, GitHub PRs, reviews, merges, Actions runs, numeric job
identities, and asserted checkout logs form the mutable ledger. Task/Test stores
the repository outcome and reproducible behavior evidence, not a stale copy of
that graph. One repository-owned checkpoint stores only a fixed-bounded
cryptographic continuity summary derived from complete evaluator results. It is
read from exact aligned `main`, binds repository/main ancestry plus the exact
ordered covered prefix and terminal pair state, and is neither a mutable ledger
nor fresh/current delivery evidence.

The shared hydration module derives required outcomes from the queue, validates
checkpoint coverage, and normalizes fresh GitHub observations only for the
single permitted uncovered suffix. For each selected workflow run it keeps the
run-level latest attempt separate from every required logical job's actual
execution attempt. Bounded `filter=all`, `filter=latest`, and attempt-specific
job collections establish execution history; a projected record is deduplicated
only when exact envelope, chronology, step, and log equivalence prove one prior
execution. The newest actual execution is authoritative and never falls back to
an earlier success after a later failed, cancelled, incomplete, or
missing-evidence execution. Invocation cache and pagination bounds still apply
to that fresh graph; credentials and raw logs are never persisted.
`NONE` delivery stays local and records a reason.

## 5. Control and data flows

### 5.1 Initialization

```text
explicit init
   → full durable-document inspection
   → unresolved durable decisions
   → confirmed shared understanding
   → four-path materialization
   → cross-document and changed-path verification
```

Initialization and intentional rebaseline are full-read flows. Existing
user-authored sections remain inputs to reconciliation, not disposable
template residue.

### 5.2 Task authoring

```text
explicit outcome
   → applicable instructions + targeted durable truth + relevant code
   → smallest independently verifiable dependency graph
   → complete in-memory Task/Test pairs
   → deterministic internal keys + complete side-effect-free validation
   → transaction acquisition + atomic ID/path allocation and publication
   → READY pair set + one exact next implementation command
   → stop
```

The authoring Skill owns intent and decomposition; the core owns allocation,
key derivation, validation, graph checks, and publication mechanics. Explicit
keys remain a low-level compatibility input. Canonical readers reject an
in-flight or unproven transaction, so a partial prefix cannot become dispatchable.

### 5.3 Existing-Task implementation

```text
explicit existing-Task invocation
   → repository, pair, dependency, immutable-terminal, and preflight validation
   → queue-derived prior STANDARD set
   → aligned-main checkpoint trust + exact covered-prefix evaluation
   → zero or one local ancestry / fresh GitHub hardened evaluation
   → read-only checkpoint transition preparation
   → one dispatcher call
   → IMPLEMENT | RESUME | DELIVER
   → selected active Task branch + atomic/idempotent transition application
   → one current mutation boundary
   → acceptance-specific verification + durable-owner synchronization
   → final diff and coverage review
   → repository DONE/PASSED or truthful BLOCKED
   → declared delivery gate
```

Resume treats recorded completion as a claim and continues from verified
handoff state. A selected Task may change only its pair, required
implementation/tests/configuration, and permanent owners whose meaning changes.
Ordinary declared delivery authority does not cross publication, force,
destructive, bypass, rerun, or unrelated-mutation boundaries.

### 5.4 `STANDARD` delivery

`HARDENED_EXACT_HEAD` keeps four identities distinct:

```text
actual PR head
   ├─ every required behavioral job checks out and asserts the exact head
   ├─ one quality job asserts the exact head
   └─ the packed job asserts the exact head

synthetic merge compatibility
   └─ separate job asserts synthetic SHA, exactly two ordered base/head
      parents, then runs the complete combined-state check

final reviewed merge
   └─ expected PR head merges to the protected base

post-merge main
   ├─ every required behavioral job asserts the merge SHA
   ├─ one quality job asserts the merge SHA
   └─ the packed job asserts the merge SHA
```

Each role is bound to repository, workflow, the run-level latest attempt, each
logical job's authoritative execution attempt, and distinct numeric execution
identities. Checkout-bearing jobs emit a `KYWCIEVIDENCE` assertion whose
`run_attempt` must equal the independently reconciled execution attempt; the
marker-free aggregate gate is selected from the same history and dependency
chronology. A successful synthetic checkout proves compatibility only and
cannot occupy an actual-head slot. Missing, stale, reused, role-confused,
ambiguous, or mismatched evidence fails closed. Explicit pre-contract
continuity can preserve an older completed delivery only while actual-head
evidence remains visibly `UNVERIFIED`; it is not available to new outcomes.

After one complete evaluator result is no longer current, a later selected
Task may roll it into durable continuity. The checkpoint carries only an exact
ordered-set digest, terminal-pair digest, cumulative evidence digest, ancestry
identities, previous digest/genesis, and one sanitized receipt. Preparation is
read-only before dispatch. Application requires the selected Task's
`IN_PROGRESS/RUNNING` branch and can cover only already delivered predecessors,
preserving one-delivery causal lag. Missing/corrupt checkpoints and gaps larger
than one stop for explicit migration/rebaseline rather than replaying history.
A separately authorized one-time correction may repair only a frozen
pre-dispatch owner allowlist and prepare one evaluator-satisfied terminal
frontier from an already valid checkpoint. It reuses the same read-only prepare
→ sole selected-dispatch token → active-branch atomic apply boundary, forbids
manual proof and pre-dispatch checkpoint writes, and cannot cover the selected
correction Task or create a wider recovery subsystem.

For artifact contract 3, the first evaluator-satisfied hardened graph is the
only delivery graph for its Task. The protected merge tree binds the exact
terminal Task/Test paths and bytes. Fresh uncovered evaluation and later
checkpoint reads compare that binding with aligned-main history, filesystem
type, and worktree bytes before dispatch. A mismatch names the Task/path and
routes the correction to a new hard-dependent Task. The graph, rolling
checkpoint, and Git history provide the binding; there is no PR-chain array,
correction receipt collection, second checkpoint, or alternate ledger.

Terminal worktree inspection preserves fixed-width porcelain status records
and rejects malformed, staged, added, deleted, renamed, linked, or unsupported
pair states before content comparison. For an unstaged regular-file
modification only, it reads the canonical Git blob and worktree bytes and
suppresses the status record only when CRLF-pair-to-LF normalization is exactly
equal; it performs no other whitespace, final-newline, or Unicode
normalization.

### 5.5 Independent audit

```text
explicit Task audit
   → locked read-only or literal fix mode
   → independent baseline + targeted durable owners
   → acceptance, scope, implementation, docs, and evidence comparison
   → PASS or BLOCKED
```

The audit reference owns command grammar, finding shape, repair eligibility,
rerun, and verdict procedure. The deterministic Task validator is one evidence
source, not an alternative audit engine.

### 5.6 Progressive document loading

```text
always: applicable AGENTS + selected/current TASK/TEST
   → index/search README + SPEC + ARCHITECTURE
   → map goal/scope/doc impact/changed code to owner sections
   ├─ sufficient and consistent → targeted read
   └─ broad, missing, ambiguous, or conflicting → full read
          └─ unresolved conflict → stop
```

The loading decision changes context volume, not normative authority. A section
that was not loaded cannot be silently contradicted.

## 6. Task, Test, and evidence architecture

### 6.1 Pair states and queue

New pairs use machine-readable artifact contract 3; contract 2 remains
queue-aware compatibility and unmarked contract 1 remains legacy. Queue-aware
pairs use one of six closed state pairs:

```text
DRAFT / DRAFT
READY / READY
IN_PROGRESS / RUNNING
DONE / PASSED
BLOCKED / BLOCKED
CANCELLED / BLOCKED
```

Non-complete current Tasks use either the canonical no-dependency sentinel or
distinct hard-dependency bullets. The queue rejects marker or status mismatch,
duplicate IDs, missing dependencies, cycles, and multiple active pairs.
Selection resumes the one active Task, then repository-complete delivery, then
the lowest dependency-satisfied ready Task. Historical blockers that are
neither active nor hard dependencies do not freeze unrelated work.

Contract-2 and unmarked legacy pairs retain their historical readers and
delivery meaning, including pre-cutover multi-merge history. Only contract 3
acquires the post-delivery path/byte invariant. No reader rewrites history into
the current schema.

### 6.2 Artifact shape and traceability

Canonical Task/Test templates own exact sections and default evidence fields.
The template contract validates meaningful content, reasoned inapplicability,
status pairs, acceptance-to-test mapping, and terminal evidence. It does not
create short and long artifact types or impose a universal Task size.

Stable acceptance IDs and matrix IDs form a traceability graph. A terminal
repository outcome requires mapped criteria, executed required checks,
reproducible row evidence, synchronized durable owners, truthful handoff
fields, and complete final-diff coverage. A generic suite cannot substitute for
an unmapped behavior or branch.

### 6.3 Evidence storage

- The active pair owns current scope, decisions, risks, handoff, commands, and
  reproducible results.
- Contract-3 completed pairs own byte-immutable canonical repository evidence
  after first complete hardened delivery; prior completed contracts retain
  grandfathered historical evidence.
- Permanent documents own only current durable meaning.
- Source/tests own deterministic mechanics and exhaustive compatibility cases.
- GitHub owns mutable PR, review, run, job, checkout, and merge identities.
- `docs/tasks/.kyw-dev-standard-delivery-continuity.json` owns one
  machine-generated, fixed-bounded continuity summary derived from previously
  complete GitHub evaluation; Git history retains its earlier versions.

This separation prevents permanent-document chronology and prevents a
repository-complete pair from containing self-referential future delivery work.

### 6.4 Transaction invariants

Task-batch and Skill-installation transactions are purpose-built rather than a
shared filesystem framework. Both are atomic, ownership-proven, bounded, and
fail-closed:

- validate complete intended state before publication;
- confine every path beneath a physically proved root;
- reject links, unsupported types, identity drift, and unknown content;
- mutate only exact manifest-owned entries with expected hashes;
- preserve evidence when safe rollback or cleanup cannot be proved;
- never recursively remove a broad Skills or Task root.

Exact lock formats, hash chains, stage names, mutation ordering, rollback cases,
and diagnostics belong in source and focused tests.

Checkpoint replacement is a third narrow single-file boundary, not a shared
transaction framework. A canonical opaque transition is prepared without
writes, validated again against active Task ownership and unchanged `main`,
then atomically replaces only the checkpoint. Exact repeat is idempotent;
staging occupation, prior-digest mismatch, branch drift, or write uncertainty
stops with bounded recovery evidence.

## 7. CLI and installation boundaries

### 7.1 Runtime and dispatch

The CLI uses Node.js 22 or newer, ESM, and built-in modules. It never changes
the caller's working directory. The supported surface is:

```text
install --scope user|project
update --scope user|project
uninstall --scope user|project [--force]
doctor
--help
--version
```

Argument parsing rejects unsupported combinations before mutation. Stable
numeric exit categories distinguish usage, runtime, scope, conflict, malformed
state, filesystem failure, and recovery-required outcomes.

### 7.2 Scope and containment

User scope resolves below the user's `.agents/skills`. Project scope walks from
the physical current directory to a real Git root and resolves the matching
repository Skills directory. Roots, parents, sources, targets, metadata,
transaction paths, and every recorded relative path are untrusted until
portable identity and physical containment are proved.

Path validation is host-independent. Absolute, traversal, drive-relative,
mixed-separator, duplicate, case/normalization-colliding, prefix-colliding, and
platform-reserved forms fail before resolution. Managed parents and leaves must
be real, supported, link-free objects.

### 7.3 Ownership and mutation

Direct installation stores a versioned ownership manifest beside managed
Skills. It binds package identity, scope, Skill paths, runtime support, and
sorted file hashes. New writes use the current five-Skill inventory; exact
legacy four-Skill metadata remains readable for ownership-safe transition.

Install and update publish metadata last after staged bytes and ownership state
are proved. Normal uninstall removes only unchanged owned files. Force may
remove an existing modified regular file already named by valid ownership
metadata, but preserves unknown entries, unrelated Skills, unsafe links, and
unsupported types. Interrupted mutation is recoverable only from trustworthy
journal and content identity.

### 7.4 Doctor

Doctor is byte-and-metadata read-only. It checks runtime/tool availability,
direct user/project installations, ownership state, permissions, transactions,
and installed plugin-cache Skill sources. Cache presence proves installed
bytes, not enabled session state. Plugin cache traversal follows only the
documented real-directory shape and never follows a linked or unsupported
component.

Duplicate Skill names across direct and plugin sources are reported, not
automatically reconciled. Removal stays with the owning CLI or supported plugin
browser.

### 7.5 Residual filesystem race

Portable standard-library APIs cannot provide the same directory-handle
relative transaction primitive on every supported host. The implementation
narrows same-user replacement races with physical roots, link-free ancestry,
identity reads, exclusive markers, atomic same-root renames, and immediate
mutation-time revalidation. An unprovable state stops and remains inspectable
rather than being repaired optimistically.

## 8. Installation and distribution

### 8.1 Direct Skills

Direct installation copies the five visible Skill directories plus namespaced
runtime support to user or project scope. The hidden runtime carries the one
Task adapter's required core and templates and is managed by the same ownership
metadata. It is not discoverable as another Skill.

### 8.2 Plugin package and cache

The npm tarball is also a complete Codex plugin with a manifest and bundled
Skills. A marketplace may acquire those bytes from npm or GitHub. Per-version
release verification uses the real packed archive through an isolated local
marketplace before registry mutation. Plugin and direct installation are
alternatives; duplicate discovery is diagnosed rather than silently resolved.

Plugins are supported by plugin-capable Codex surfaces. The IDE extension uses
direct Skills. The public package identity, plugin identity, CLI version, and
direct-install metadata derive from one package version.

### 8.3 Package boundary

A positive package allowlist includes runtime, Skills, templates, plugin
metadata, README, and legal notices. It excludes repository Tasks and their
continuity checkpoint state, development tests/evaluators, local marketplace
fixtures, archives, credentials, machine paths, and raw model output. The
package has no production dependency and no installation or publication
lifecycle script.

### 8.4 Publication boundary

Package metadata may be publishable while publication remains unauthorized.
Candidate packing, CI, isolated installation, and registry dry-run are distinct
non-publishing evidence boundaries. Actual registry publication, version
change, tag, GitHub Release, or public plugin submission requires separate
authority plus fresh public-registry, repository-owned publisher-expectation,
and exact-workflow verification. Routine release preflight does not authenticate
to npm account/settings surfaces. Account-side authentication exists only for
initial setup, an explicitly authorized security/configuration audit or change,
or investigation after an actual OIDC/publisher failure.

### 8.5 Trusted publication workflow

One repository-owned expectation defines provider `GitHub Actions`,
owner/repository `kimyeongwoo/kyw-dev`, workflow
`.github/workflows/publish.yml`, environment `npm-production`, and allowed
action `npm publish`. Foundation and workflow validation project that tuple into
the exact workflow bytes without querying authenticated npm account surfaces.
The manual-only workflow is separate from credential-free CI; only its single
GitHub-hosted job receives `contents: read` plus `id-token: write`. Exact event,
repository, `main` ref, input/event/checkout SHA, package/plugin version,
runtime, and public registry identity guards stop before publication on any
mismatch.

The packed-release verifier has two boundaries over the same validation:
ordinary release checking creates and removes a disposable archive, while the
workflow mode retains exactly one archive under a physically contained owned
temporary root and returns bounded machine-readable identity and digest fields.
The workflow passes the independent candidate evidence through the Stable gate
and a fresh registry-absence check, reconfirms the clean exact checkout, and
publishes that real Git directory once with `npm publish .`; the retained
candidate remains the byte expectation for later public-tarball proof and is
then removed by guarded owned-root cleanup. It introduces no token fallback,
account-authentication branch, retry, second dispatch, dist-tag, tag, Release,
or reusable trigger.

OIDC exchanges the GitHub identity for a short-lived npm publishing credential;
no long-lived npm token or interactive OTP crosses the workflow boundary.
The actual successful publish is canonical runtime proof that npm accepted the
configured Trusted Publisher identity; static policy or account inspection is
not runtime proof. Successful trusted publication of the public package from
the public repository creates npm provenance automatically. OIDC/publisher
rejection has one path: the workflow fails and the executing Task records
`BLOCKED`, with no automatic reauthentication or alternate publication.
Source/candidate evidence, workflow registration, an authorized run, registry
state, and later provenance proof remain separate evidence states.

## 9. Validation and CI architecture

### 9.1 Foundation and permanent-document policy

The existing foundation validator is the deterministic owner for package and
plugin identity, five-Skill metadata, canonical templates, legal bytes, package
selection, and permanent-document guardrails. One registry declares exactly
four permanent paths, their roles, byte budgets, canonical rule owners, and
allowed projections.

The policy rejects:

- a missing, renamed, duplicated, or generated permanent-document mirror;
- hard budget overflow or warning overflow without required evidence;
- mutable chronology or copied Task/Test evidence in permanent truth;
- duplicated detailed procedures or an ownerless rule family;
- stale documented npm or repository-relative Node commands;
- permanent-document deltas that do not bind current TEST evidence to actual
  bytes and lines.

Growth thresholds use integer arithmetic. A material per-document increase or
any positive combined increase requires mapped durable necessity and explicit
replacement/absorption evidence. Budget changes are never inferred from
observed bytes; warning or hard policy changes additionally require explicit
acceptance and user approval. Static exact-string and bounded-pattern checks
remain deterministic and do not introduce a fuzzy or model-backed grader.

### 9.2 Verification planning

The development-only planner accepts explicit repository-relative changed
paths and returns, but does not execute, one ordered cumulative tier:

- Focused for bounded documents, Skills, or behavior;
- Stable for runtime, cross-cutting, unknown, or higher-risk changes;
- Release for release-sensitive implementation or immutable candidates.

Mixed or unknown inputs fail upward, never downward. Current Task/Test paths do
not lower or inflate implementation risk. Planning cannot replace
acceptance-specific checks or hosted exact-SHA delivery evidence.

### 9.3 Hosted CI

The credential-free `ci.yml` workflow covers pull requests, `main` pushes, and manual
dispatch with read-only repository permission, bounded timeouts, exact
checkout assertions, and immutable external Action identities.

Behavioral coverage runs `npm test` on Node.js 22 and 24 across Linux, macOS,
and Windows, plus one bounded Linux Node.js 26 compatibility lane. One Ubuntu
Node.js 24 quality job owns platform-independent lint, format, and package
selection; a separate packed job creates and inspects one real archive. Pull
requests also run the distinct synthetic merge-compatibility job, which proves
the exact synthetic/base/head identities and ordered two-parent shape before
the complete combined-state check. An aggregate required job reports only
after the event-appropriate roles succeed.

Public CI contains no npm publication, tag, Release, merge automation, model
authentication, or desktop-only requirement. Exact-head PR and post-merge
`main` evidence remains required even when local checks pass.

The separately authorized trusted-publication workflow is not a CI or delivery
job, has no automatic trigger, and cannot publish merely because `ci.yml` or a
merge succeeds.

### 9.4 Release verification

Stable verification checks the working tree and package selection. Candidate
verification creates one real archive and binds its inventory, hygiene, legal
content, CLI smoke, npm integrity/shasum, and SHA-256. The disposable command
cleans its archive; the publication workflow retains independently verified
candidate bytes only in its owned temporary root while publishing the exact
checkout directory, then uses their digests for later public-byte comparison
and guarded cleanup.
Isolated lifecycle verification exercises direct and plugin paths under owned
temporary state while protecting normal user state. A registry dry-run is a
later distinct boundary.

A development-only integration fixture creates and commits an owned temporary
Git repository, invokes the actual npm CLI against an owned loopback registry,
and captures the raw submitted packument and attachment. It proves that
directory publication supplies the exact commit as `gitHead` with bytes matching
the candidate, while publishing the same prebuilt tarball cannot synthesize
`gitHead`. Its isolated loopback auth value is not a production credential, and
guards reject source-manifest fabrication or post-capture registry rewriting.

The retained-evidence harness may wrap an explicitly approved release command
and retain redacted evidence outside the repository. It is not a runtime
component, release verdict, publication approval, or automatic cleanup system.
Detailed path algorithms, provenance fields, retry behavior, and evidence
format stay in source/tests.

### 9.5 Optional evaluators

Model-backed grilling and audit smoke are development-only and require an
explicit model, reasoning effort, authentication source, and cost gate. They
run in isolated temporary repositories, preserve normal user state, redact
outputs, and never become required public CI. Pure lifecycle tests inject
schedulers and events; retained native smoke accepts only an atomically
published, run-bound readiness record before crossing real console, signal,
stream, or process-tree boundaries. Time bounds stop hangs and emit state
diagnostics rather than defining an elapsed-speed acceptance threshold.

Exact signal handling, timeouts, retry delays, fixture catalogs, schema
versions, and historical benchmark outcomes remain with evaluator source/tests
and historical Task/Test evidence.

## 10. Security and privacy

- No telemetry or hosted project-data service exists.
- Repository contents are not copied outside the user's requested scope.
- Secrets and full sensitive file contents are not copied into reports.
- Package, install metadata, journals, source trees, roots, and external
  evidence are treated as untrusted inputs.
- Containment is lexical and physical; links and unsupported types fail closed.
- Diagnostics expose bounded relative identities and categories, not normal
  absolute paths, credentials, or protected content.
- Temporary/evaluator/release state is removed only when its exact owned root is
  proved; a broad home, repository, Skills, or cache root is never a recursive
  cleanup target.
- GitHub delivery authority is limited to the selected Task's declared ordinary
  lifecycle. It does not imply publication or administrative override.

## 11. Portability and isolation trade-offs

| Concern | Current design | Trade-off |
|---|---|---|
| Task mechanics | One dependency-free adapter/core graph | Markdown remains human-readable; strict parsing rejects ambiguous forms |
| Context | Targeted owner sections with full-read escalation | Smaller routine context; broad/conflicting work deliberately costs a full read |
| Filesystem safety | Portable path rules, physical containment, hash/type/identity revalidation | Fail-closed behavior may require manual reconciliation on hostile state |
| Distribution | Direct Skills and plugin package/cache | Two explicit surfaces; no generic provider framework |
| Delivery | GitHub PR/Actions exact-SHA ledger | No alternate current `STANDARD` backend |
| CI | Credential-free deterministic matrix | Desktop/model checks stay optional and isolated |
| Transactions | Separate Task-batch and installation journals | No generic transaction/filesystem abstraction |
| Evidence | Task/Test for acceptance; GitHub for mutable delivery; one aligned-main rolling checkpoint for prior continuity | Covered expired logs no longer block; uncovered/current proof still fails closed |

## 12. Deliberate scope boundaries

The following exclusions are architectural decisions:

- no delivery-provider interface or alternate current `STANDARD` ledger;
- no per-Task PR chain, correction receipt list, second continuity checkpoint,
  or reopening of a canonically delivered future Task;
- no generic install backend or automatic direct/plugin reconciliation;
- no shared transaction/filesystem framework across Task and installation
  domains;
- no runtime evaluator dependency, mandatory model job, daemon, watcher,
  filesystem/process/OS tracing, ambient process scan, or background repair;
- no generated permanent-document summary, search database, or fuzzy/LLM
  document grader;
- no automatic registry publish, version/tag/Release creation, public
  submission, force push, CI rerun, or branch-protection bypass;
- no first-class non-Codex agent adapter in the current release.

## 13. Deferred architecture

Future product and architecture decisions are required before adding:

- MCP or issue-tracker synchronization;
- telemetry or hosted collaboration;
- npm/plugin lifecycle hooks;
- an alternate delivery ledger;
- automatic PR generation outside selected Task authority;
- a schema-driven Markdown AST editor;
- another installation surface or agent runtime.
