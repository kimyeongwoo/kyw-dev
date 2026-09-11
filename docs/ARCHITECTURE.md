# kyw-dev Architecture

## System context and ownership

`kyw-dev` packages six explicit Codex Skills and a dependency-free Node ESM support runtime. Codex owns exploration, planning, conversation state, model selection, and compaction. Session context uses the host's available features, including its optional experimental context management; kyw-dev neither requires activation nor changes Codex configuration. There is no additional LLM engine, database, server, daemon, authority broker, or telemetry service.

[Specification](SPEC.md) owns observable behavior; [README](../README.md) owns usage; [AGENTS](../AGENTS.md) owns repository instructions. Skill references contain mode-specific procedures. Source/tests own deterministic mechanics and legacy contracts. Current Task records retain local evidence; GitHub/npm own external state.

```text
Codex → selected Skill → shared Task adapter → Task core
CLI → installation core → owned direct Skills + hidden runtime
Plugin manifest → packaged Skills + package runtime
Explicit release → exact source/pack validation → OIDC publish workflow
```

## Components and dependency boundaries

- `skills/`: six explicit workflows; implementation, delivery/release, and audit load only their relevant references.
- `skills/kyw-task/scripts/task-artifacts.mjs`: one process adapter, resolving package core or hidden direct-install core.
- `task-artifact-contract`, `queue`, and `creation`: Task metadata, local dependency selection, and collision-safe authored record publication.
- `template-contracts`: new minimal single-Task format and legacy Task/Test readers.
- `task-artifact-delivery`: goal/ID/current-work invocation actions, local preflight, and legacy exact-SHA delivery evaluation.
- `pr-merge`: current target-project PR policy observation and expected-head merge/queue writes; separate from kyw-dev's canonical `ci-evidence` checks.
- `task-artifact-hydration`, `continuity`, and `public-release`: explicit external/historical proof and release state. Ordinary authoring/implementation does not invoke global historical reconstruction.
- `skill-installation-*`: inventory, ownership state, transaction, diagnostics, and CLI dispatch.
- `scripts/` and `test/`: development-only verification and trusted publication helpers; runtime never imports development validation.

The small facades keep shared imports stable. There is no copied per-Skill dispatcher, alternate current delivery provider, or generic transaction framework.

## Task and development flow

```text
ordinary request → relevant implementation + checks → local report
explicit impl(goal) → same implementation + checks → local report
optional Task → local dependency selection → implementation + checks → DONE
explicit PR → related commit + non-force push + PR
explicit merge → current exact-head gates + expected-head merge
explicit release(version, SHA) → prepared source/CI proof → npm → tag → Release
```

Contract 5 defaults to one TASK with `<!-- kyw-task-contract: 5 -->` and one `<!-- kyw-task: {"id":"0007","status":"READY","dependencies":[]} -->` metadata comment. Only essential ID/status/dependency fields are structured. Prose acceptance and verification are not a Markdown database. TEST is optional.

Legacy contracts 1–4 retain readers, state pairs, and historical evidence semantics. Local selection depends on actual prerequisite results, not task number or prior release. Automatic convenience selection does not prohibit independent work in separate copies. Historical continuity and immutable byte checks remain isolated to explicit compatibility/history paths; they are not repeated prerequisites for unrelated development.

The shared adapter branches goal-based implementation and current-work delivery/audit before Task inventory access. It returns explicit action/scope information without creating records or certifying change ownership. Preflight distinguishes input validity from mutation concerns while keeping its direct `safe` result conservative. Only pure `AUDIT` dispatch may retain well-formed concerns as warnings and continue read-only selection; `FIX` and other write actions retain the preflight gate. Skills resolve relevant changes and the external target from the request, diff, branch, and PR. Ambiguous writes require clarification; record absence alone does not. Task and goal paths share the implementation reference.

The queue separates global inventory diagnostics from exact selection errors, including delivery. Exact traversal reads the selected record and its dependency graph, and returns unverified dependency records through the shared adapter; the implementing agent checks actual worktree results. Allocation, batch creation, and automatic selection retain global inventory validation. Existing batch transaction ownership metadata bounds reserved Task IDs/paths so unrelated existing records can be inspected without recovering or deleting the transaction. Unknown scope still blocks selection, and record non-overlap does not authorize concurrent writes to shared implementation files. PR identity, included changes, CI, and approval remain separate delivery gates.

Artifact creation and installation use separate narrow transactions: validate intended state first, prove physical containment and ownership, reject links/unknown types, publish only exact intended entries, and retain recoverable state when rollback safety is uncertain. Task allocation preserves existing IDs and unknown files. No broad Task or Skills root is a recursive cleanup target.

## External actions and evidence flow

The command parser selects PR, merge, or release intent; it cannot constrain raw shell/GitHub credentials. User scope and trusted tool context remain necessary. Host permissions, repository protection, minimum GitHub permissions, and OIDC enforce the concrete boundaries available in the environment.

Default deliver prepares a PR and reports CI. General merge uses GitHub's authoritative PR policy and current repository/base/head/review/mergeability evidence rather than reimplementing rulesets. Required checks retain source and current head/test-merge attribution; optional failures do not become new gates. A confirmed ready PR with no required CI does not need a harness workflow, while incomplete or unknown policy evidence remains blocking. Re-observe before the expected-head mutation, use normal queue semantics only when authorized, and report queued versus merged effects distinctly. No automatic-merge reservation or bypass is inferred. The existing `check-ci` command retains its canonical kyw-dev meaning for maintenance and compatibility callers; general merge does not call it. Historical role contracts remain readable.

The built-in release route targets only `kimyeongwoo/kyw-dev`, enforced at actual publisher/tag/Release write boundaries as well as routing. Other repositories use their existing approved procedures. Release targets an already prepared stable version and exact merged main SHA independently of Task ID. It validates package/plugin identity, source state, bounded packed inventory/digests, registry history/conflicts, and publisher tuple. The manual trusted publishing workflow retains repository `kimyeongwoo/kyw-dev`, `publish.yml`, `npm-production`, OIDC, least privilege, and concurrency controls.

The final read-only publish helper reads canonical `ci.yml` identity and exact main-push SHA through GitHub API, reconciles the latest run/attempt, and verifies the required aggregate and selected jobs. The adjacent Actions step invokes npm only after that check succeeds. API errors, incomplete pages, ambiguity, and unsuccessful evidence fail closed. Workflow/helper fixtures feed resulting step records through production history interpretation and the runner. Both history readers share the actual publisher-step skipped predicate; historical combined-step failures remain ambiguous.

Public-state classification preserves `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, and `UNKNOWN`. Exact state skips completed effects; absence permits authorized creation; uncertain state requires bounded observation. npm proof precedes tag creation, and npm/tag proof precedes Release. Complete signature/keyid, integrity, gitHead, provenance, workflow, tag, and Release checks bind exact identities. A valid current key set may contain multiple keys; historical frozen tuples remain stable.

Independent release hydration validates the original local target tree and reuses `readWorkflowRuns` from signing recovery for canonical remote main authority. That production reader first revalidates remote ref/type/SHA, target ancestry, and exact target source. Its required `baseHeadSha` supplies `currentMainSha`, `mainContainsTarget`, and base-head diagnostics; no local main lookup, fallback, fetch, or ref mutation is needed. The planner permits an older target only after exact existing npm/workflow proof. `PRE_NPM_WRITE` and actual mutator boundaries still recheck fresh exact remote main for npm. This lets a fresh invocation resume missing tag/Release effects after main advances, including targets with the historical combined workflow layout. Legacy taskId/contract-4 hydration and guarded repository state retain their local main checks.

Workflow semantics use one inspection view that removes only supported YAML comments: standalone lines outside block scalars, safe mapping/sequence inline comments, comments outside clearly closed single-line quoted values, and comments after supported `|`/`>` headers with chomp/indent indicators. Block scalar bodies retain their whitespace, newlines, quotes, escapes, `#`, and executable-language comments. LF and CRLF remain supported; any standalone CR returns the entire original input before comment removal. Complex flow forms, multiline quoted/plain continuations, and ambiguous boundaries return the entire original input for the existing checks; partial views are never mixed with raw input. This helper is not a YAML parser. Source reads, Git identities, packed bytes/digests, frozen tuples, and signatures continue using the original bytes; comments cannot substitute for missing workflow guards.

Read retries are bounded and exclude authentication/invalid requests. Ambiguous writes reconcile exact remote state before any repetition. A failed pre-publish attempt with proved absence may permit a fresh authorized attempt; an ambiguous npm result is never automatically republished. Remote reads and writes are not atomic, and this design does not claim exactly-once delivery or constrain out-of-band administrators.

## Verification and CI

The path planner distinguishes pure guidance, behavior instructions/templates, and executable code. Hosted selection reads Git changes with before/after file modes and both rename/copy paths, allowing known regular guidance and Task records to stay Focused while unsafe or incomplete type evidence fails upward. Runtime scripts under Skills use conservative Stable coverage; unknown/mixed inputs fail upward. The local path-only planner remains a planning convenience, not a filesystem type check. It returns commands without executing them. These commands and the hosted OS/Node matrix belong to kyw-dev development, not every consumer project. Final Release verification is `npm run release:ci`, already composed of Stable checks and one real candidate inspection.

CI has no workflow-wide path filter that could leave required checks permanently pending. Its stable aggregate validates selected jobs and reasons for omission. Pure guidance uses lighter checks, instructions use related behavior checks, and common runtime, filesystem/installation, and release changes retain required platform/integration coverage. Node.js 22/24 across Linux/macOS/Windows and the bounded Node.js 26 Linux lane remain supported. Actual-head and synthetic compatibility are different roles.

Foundation validation retains package/plugin metadata consistency, six explicit Skill metadata, local reference integrity, templates, dependency/lifecycle exclusions, and legal hashes. Exact prose, four-document generation, byte/growth approvals, and repeated evidence ledgers are removed. Document size is an observation, not a hard gate.

Verification reuse is local and narrow: command, relevant code/tests/configuration, dependencies, environment, and required tool versions must match. Uncertain relevance reruns; written PASS text does not prove reuse. No persistent generic evidence database is introduced, and local reuse does not replace hosted CI.

Audit reads the original tree without writes. Executable checks require a temporary environment with actual write/network enforcement and no production secrets. An ordinary copy only protects against some accidental source edits; it does not isolate test code. Without suitable enforcement, unsafe checks are omitted and reported. The optional verifier distinguishes an executed check failure from unavailable or uncertain execution. Its separate cleanup result retains incomplete cleanup diagnostics and residual paths without replacing the verification outcome or output; overall status and CLI exit remain unsuccessful until cleanup completes. Reports keep findings, performed verification, limitations, and their required/optional completion impact separate while retaining compatible status fields. Cleanup validates ownership and containment; explicit repair stays within approved findings.

Optional model evaluators remain development-only and outside public CI, with owned fixture/control state. They require explicit cost/authentication scope and distinguish requested configuration from unavailable or observed provenance. Mock behavior is not a model smoke. Session-local progress remains with Codex.

The synthetic audit smoke imports the trusted repository `verifyInAuditSandbox` for its final fix check. It copies exactly `package.json`, `src/greeting.mjs`, and `test/greeting.test.mjs` and fixes argv to `["node", "--test", "test/greeting.test.mjs"]`; model output cannot expand either input. The local `node:22` image is resolved to its inspected identity with pull forbidden. The verifier retains network denial, a separate copy mount, nonprivileged execution, resource limits, and ownership-checked cleanup. No original repository, Git metadata, installed Skills/runtime, model control directory, or authentication enters that copy. The model outer profile is not this verification boundary, and the protocol does not technically prevent arbitrary model tool execution. Readonly omits independent execution; missing Docker/image/boundary evidence never selects a host fallback.

The model and long `docker run` are sequential children of the existing evaluator scope. A small adapter converts nonzero child results to the verifier's exception contract while preserving spawn, interruption, timeout, output-limit, and completed-test distinctions. Bounded image/container inspection and container removal stay with the verifier's existing runner, so a failed child does not disable cleanup deadlines. Docker CLI termination does not prove daemon-container cleanup. Physical noncontainment keeps verifier temporary roots outside the outer evaluator's recursive cleanup scope; incomplete verifier cleanup retains its original check outcome, reason, and residual paths while safe model-control cleanup can complete. The smoke observes repaired state before verification and rechecks original fixture bytes, Git metadata, and authentication-source preservation after the last child. It compares the full synthetic `.git` tree, including config/hooks, before invoking post-child Git status; changed metadata withholds that Git command. Its limited recognizer records unverified commands separately from write attempts and final changes, and explicit plan/Skill-read statuses preserve uncertainty without treating marker text as semantic proof. The model's `verdict` and requested model/effort/provenance fields retain their meanings; `evaluatorOutcome` records PASS, VIOLATION, or UNVERIFIED. Rejections retain structured `error.evidence`, including the separate `independentVerification` outcome and cleanup. `AUDIT_SMOKE_UNVERIFIED` identifies an evaluation limit, while confirmed violations keep their specific failure codes.

## Installation and distribution

The Node.js 22+ CLI parses `install/update/uninstall --scope user|project`, read-only `doctor`, help, and version without changing working directory. Numeric exit categories remain stable.

User scope resolves under `.agents/skills`; project scope resolves from the physical Git root. Portable path checks reject absolute/traversal/drive-relative/colliding/reserved forms. Link-free ancestry, supported types, expected file identity, and hashes are revalidated before mutation.

The ownership manifest binds package version, visible Skills, hidden `.kyw-dev/runtime/` files, and hashes. Install/update stage exact owned bytes and publish metadata last. Normal uninstall removes unchanged owned files; force only expands removal to already owned modified regular files. Unknown content, unrelated Skills, links, and unsupported types remain protected. Previous four-/five-Skill manifests remain compatible.

Doctor is byte-and-metadata read-only. It checks direct user/project sources and plugin cache candidates, duplicates, version drift, permissions, malformed or interrupted state, and reports rather than automatically repairs. Duplicate classification keeps direct user/project overlaps as conflict errors and reports cache-involved overlaps separately as potential-conflict warnings with active state unknown. Cache path/name/version evidence is preserved; cache bytes do not prove enabled session state. Warnings alone retain exit 0 and a warning result; actual error categories are unchanged. Direct Skills and plugins are alternative sources for the same names.

The package allowlist includes runtime, Skills, templates, manifest, README, and legal notices; excludes repository Tasks, development briefs/evaluators/tests, secrets, machine configuration, and generated artifacts. Neither surface depends on npm lifecycle scripts. Plugin/direct runtime inventories and real tarball checks protect installed adapter imports.

## Trade-offs and remaining boundaries

Small local workflows avoid external dependencies; explicit delivery pays for current remote proof. Legacy readers retain compatibility complexity while current Task records and development paths remain small. Separate Task/install transactions preserve focused ownership reasoning.

Portable filesystem APIs cannot eliminate every same-user replacement race. Physical root and identity checks, exclusive markers, same-root atomic renames, and immediate revalidation narrow the boundary; uncertain ownership stops for inspection. Likewise, API preflight is an observation before a non-atomic external write. No fallback credentials, protection bypass, force push, or broad cleanup is inferred from a failure.
