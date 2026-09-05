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
- `task-artifact-delivery`: invocation actions, local preflight, and exact-SHA delivery evaluation.
- `task-artifact-hydration`, `continuity`, and `public-release`: explicit external/historical proof and release state. Ordinary authoring/implementation does not invoke global historical reconstruction.
- `skill-installation-*`: inventory, ownership state, transaction, diagnostics, and CLI dispatch.
- `scripts/` and `test/`: development-only verification and trusted publication helpers; runtime never imports development validation.

The small facades keep shared imports stable. There is no copied per-Skill dispatcher, alternate current delivery provider, or generic transaction framework.

## Task and development flow

```text
ordinary request → relevant implementation + checks → local report
optional Task → local dependency selection → implementation + checks → DONE
explicit PR → related commit + non-force push + PR
explicit merge → current exact-head gates + expected-head merge
explicit release(version, SHA) → prepared source/CI proof → npm → tag → Release
```

Contract 5 defaults to one TASK with `<!-- kyw-task-contract: 5 -->` and one `<!-- kyw-task: {"id":"0007","status":"READY","dependencies":[]} -->` metadata comment. Only essential ID/status/dependency fields are structured. Prose acceptance and verification are not a Markdown database. TEST is optional.

Legacy contracts 1–4 retain readers, state pairs, and historical evidence semantics. Local selection depends on actual prerequisite results, not task number or prior release. Automatic convenience selection does not prohibit independent work in separate copies. Historical continuity and immutable byte checks remain isolated to explicit compatibility/history paths; they are not repeated prerequisites for unrelated development.

The queue separates global inventory diagnostics from exact local selection errors. Exact traversal reads only the selected record and its dependency graph, and returns unverified dependency records through the shared adapter; the implementing agent checks actual worktree results. Global and delivery callers retain inventory validation. Existing batch transaction ownership metadata bounds reserved Task IDs/paths so unrelated existing records can be inspected without recovering or deleting the transaction. Unknown scope still blocks selection, and record non-overlap does not authorize concurrent writes to shared implementation files.

Artifact creation and installation use separate narrow transactions: validate intended state first, prove physical containment and ownership, reject links/unknown types, publish only exact intended entries, and retain recoverable state when rollback safety is uncertain. Task allocation preserves existing IDs and unknown files. No broad Task or Skills root is a recursive cleanup target.

## External actions and evidence flow

The command parser selects PR, merge, or release intent; it cannot constrain raw shell/GitHub credentials. User scope and trusted tool context remain necessary. Host permissions, repository protection, minimum GitHub permissions, and OIDC enforce the concrete boundaries available in the environment.

Default deliver prepares a PR and reports CI. Merge evaluates current repository/base/head, reviews, mergeability, protection, and exact workflow evidence. Actual-head, synthetic two-parent merge compatibility, and post-main evidence are distinct. Latest authoritative attempts are evaluated; older success cannot mask a newer failed or incomplete execution. Historical role contracts remain readable.

Release targets an already prepared stable version and exact merged main SHA independently of Task ID. It validates package/plugin identity, source state, bounded packed inventory/digests, registry history/conflicts, and publisher tuple. The manual trusted publishing workflow retains repository `kimyeongwoo/kyw-dev`, `publish.yml`, `npm-production`, OIDC, least privilege, and concurrency controls.

The final read-only publish helper reads canonical `ci.yml` identity and exact main-push SHA through GitHub API, reconciles the latest run/attempt, and verifies the required aggregate and selected jobs. The adjacent Actions step invokes npm only after that check succeeds. API errors, incomplete pages, ambiguity, and unsuccessful evidence fail closed. Workflow/helper fixtures feed resulting step records through production history interpretation and the runner. Both history readers share the actual publisher-step skipped predicate; historical combined-step failures remain ambiguous.

Public-state classification preserves `ABSENT`, `EXACT_ALREADY_COMPLETE`, `PENDING_PROOF`, `CONFLICT`, and `UNKNOWN`. Exact state skips completed effects; absence permits authorized creation; uncertain state requires bounded observation. npm proof precedes tag creation, and npm/tag proof precedes Release. Complete signature/keyid, integrity, gitHead, provenance, workflow, tag, and Release checks bind exact identities. A valid current key set may contain multiple keys; historical frozen tuples remain stable.

Independent release hydration validates the original target tree and its local main ancestry without replacing the observed main SHA. Production reads revalidate remote ancestry; the planner permits an older target only after exact existing npm/workflow proof, while the npm dispatch boundary still requires current main. This lets a fresh invocation resume missing tag/Release effects after main advances, including targets with the historical combined workflow layout.

Read retries are bounded and exclude authentication/invalid requests. Ambiguous writes reconcile exact remote state before any repetition. A failed pre-publish attempt with proved absence may permit a fresh authorized attempt; an ambiguous npm result is never automatically republished. Remote reads and writes are not atomic, and this design does not claim exactly-once delivery or constrain out-of-band administrators.

## Verification and CI

The path planner distinguishes pure guidance, behavior instructions/templates, and executable code. Hosted selection reads Git changes with before/after file modes and both rename/copy paths, allowing known regular guidance and Task records to stay Focused while unsafe or incomplete type evidence fails upward. Runtime scripts under Skills use conservative Stable coverage; unknown/mixed inputs fail upward. The local path-only planner remains a planning convenience, not a filesystem type check. It returns commands without executing them. Final Release verification is `npm run release:ci`, already composed of Stable checks and one real candidate inspection.

CI has no workflow-wide path filter that could leave required checks permanently pending. Its stable aggregate validates selected jobs and reasons for omission. Pure guidance uses lighter checks, instructions use related behavior checks, and common runtime, filesystem/installation, and release changes retain required platform/integration coverage. Node.js 22/24 across Linux/macOS/Windows and the bounded Node.js 26 Linux lane remain supported. Actual-head and synthetic compatibility are different roles.

Foundation validation retains package/plugin metadata consistency, six explicit Skill metadata, local reference integrity, templates, dependency/lifecycle exclusions, and legal hashes. Exact prose, four-document generation, byte/growth approvals, and repeated evidence ledgers are removed. Document size is an observation, not a hard gate.

Verification reuse is local and narrow: command, relevant code/tests/configuration, dependencies, environment, and required tool versions must match. Uncertain relevance reruns; written PASS text does not prove reuse. No persistent generic evidence database is introduced, and local reuse does not replace hosted CI.

Audit reads the original tree without writes. Executable checks require a temporary environment with actual write/network enforcement and no production secrets. An ordinary copy only protects against some accidental source edits; it does not isolate test code. Without suitable enforcement, unsafe checks are omitted and reported. Cleanup validates ownership and containment; explicit repair stays within approved findings.

Optional model evaluators remain development-only, isolated, and outside public CI. They require explicit cost/authentication scope and report actual model provenance. Mock behavior is not a model smoke. Session-local progress remains with Codex.

## Installation and distribution

The Node.js 22+ CLI parses `install/update/uninstall --scope user|project`, read-only `doctor`, help, and version without changing working directory. Numeric exit categories remain stable.

User scope resolves under `.agents/skills`; project scope resolves from the physical Git root. Portable path checks reject absolute/traversal/drive-relative/colliding/reserved forms. Link-free ancestry, supported types, expected file identity, and hashes are revalidated before mutation.

The ownership manifest binds package version, visible Skills, hidden `.kyw-dev/runtime/` files, and hashes. Install/update stage exact owned bytes and publish metadata last. Normal uninstall removes unchanged owned files; force only expands removal to already owned modified regular files. Unknown content, unrelated Skills, links, and unsupported types remain protected. Previous four-/five-Skill manifests remain compatible.

Doctor is byte-and-metadata read-only. It checks direct/project/plugin sources, duplicates, version drift, permissions, malformed or interrupted state, and reports rather than automatically repairs. Plugin cache bytes do not prove enabled session state. Direct Skills and plugins are alternative sources for the same names.

The package allowlist includes runtime, Skills, templates, manifest, README, and legal notices; excludes repository Tasks, development briefs/evaluators/tests, secrets, machine configuration, and generated artifacts. Neither surface depends on npm lifecycle scripts. Plugin/direct runtime inventories and real tarball checks protect installed adapter imports.

## Trade-offs and remaining boundaries

Small local workflows avoid external dependencies; explicit delivery pays for current remote proof. Legacy readers retain compatibility complexity while current Task records and development paths remain small. Separate Task/install transactions preserve focused ownership reasoning.

Portable filesystem APIs cannot eliminate every same-user replacement race. Physical root and identity checks, exclusive markers, same-root atomic renames, and immediate revalidation narrow the boundary; uncertain ownership stops for inspection. Likewise, API preflight is an observation before a non-atomic external write. No fallback credentials, protection bypass, force push, or broad cleanup is inferred from a failure.
