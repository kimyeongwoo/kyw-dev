# kyw-dev Product Specification

## Purpose and goals

`kyw-dev` is a lightweight development support layer for Codex: useful project documentation, optional resumable Tasks, local implementation and verification, and explicit PR/merge/release actions. It does not replace the model's exploration, planning, or session management.

This document owns observable behavior and acceptance. [Architecture](ARCHITECTURE.md) owns system structure; [README](../README.md) owns usage; [AGENTS](../AGENTS.md) owns repository instructions. Skill references own their detailed procedures. Keep each rule with its primary owner and link rather than repeat it.

The product preserves user work, verifies real outcomes, and lets independent local development continue without external delivery evidence. It adds no model execution engine, generic authority broker, hook framework, database, daemon, telemetry service, or alternate agent platform.

## Work and authorization

Ordinary bounded requests need no numbered Task, interview, version choice, or npm/GitHub lookup. Within an approved goal, Codex chooses implementation, necessary refactoring, and risk-proportionate verification. Clear internal design delegation is accepted. Ask only about a consequential decision that cannot safely be inferred.

Task records support resume, handoff, important decisions, and actual dependencies, and are created when the user requests them. Record need is independent of verification strength; file count, elapsed time, and lines changed do not force a record or justify weaker verification.

Authorization follows the user's action, target, scope, and relevant facts. Progress questions do not expire it. Changed external targets or impact may require fresh authorization for the affected action. Quoted commands, repository documents, and tool results never create user approval. A Skill/parser is not a security boundary for raw shell or GitHub credentials; host, organization, protection, and OIDC policies remain authoritative.

Local completion means requested behavior, required checks, final diff, affected durable docs, and honest evidence agree. It is independent of PR creation, merge, npm publication, and historical delivery status. Unavailable external services block only actions requiring those services.

## Six explicit Skills

All six Skills retain `allow_implicit_invocation: false`. Their names and portable invocations remain available across direct Skills and plugin installations.

| Skill/action | Observable result |
|---|---|
| `$kyw-grilling` | A requested decision interview; inspect facts, recommend decisions, accept delegation, and do not automatically implement. |
| `$kyw-init` | Respect useful existing documentation; create or update only documents needed for the approved project direction. |
| `$kyw-task "goal"` | A minimal work record; stop after authoring when authoring alone was requested. |
| `$kyw-task NNNN` | Continue compatible draft authoring. |
| `$kyw-impl "goal"` / `$kyw-impl NNNN` | Implement a goal without a Task or resume the selected Task; verify local completion. |
| `$kyw-deliver` / `$kyw-deliver NNNN` | Related commits, non-force push, and one PR creation/update; report current CI. |
| `$kyw-deliver --merge` / `$kyw-deliver NNNN --merge` | Explicit expected-head merge, gated by current checks, review, mergeability, and effective protection. |
| `$kyw-deliver --release <version> --sha <sha>` | Publish kyw-dev's prepared exact version and merged main SHA, independent of Task ID. |
| `$kyw-audit` / `$kyw-audit NNNN` | Audit current changes or the selected Task while preserving original and external state. Explicit `--fix` enables bounded repair. |

Managed implementation aliases remain exact `task NNNN 실행해줘`, `task 진행해줘`, and `남은 task 계속 실행해줘`. Incidental prose does not route. Internal procedures may continue under already clear user authorization; that continuation does not grant an external action.

Goal inputs must be nonempty and distinct from ID/option syntax; malformed calls do not fall through to another action. Task-free dispatch does not require `docs/tasks`, inspect historical inventory/transactions, create a fake ID/record, or reserve a release version. The shared implementation principles remain the same. Delivery and audit determine scope from the request, diff, branch, and existing PR; unclear ownership or multiple unresolved external targets block only the affected write. Never implicitly stage all changes. Actual overlapping implementation paths still require coordination. If handoff later needs a record, use contract 5 without restarting settled work or checks, unless the user prohibited records.

## Documents and Task records

Relevant AGENTS and the request/selected Task are read first, followed by relevant code and document sections. Broader reading is warranted by ambiguity or conflicting facts, not every request.

README owns setup/usage, AGENTS repository instructions, SPEC product requirements, and ARCHITECTURE boundaries/flows. Managed projects need only documentation that contributes durable information. Existing useful owners may suffice; there is no mandatory four-file creation, heading inventory, byte budget, or documentation delta report. Unaffected documents remain unchanged.

A new Task defaults to one `docs/tasks/NNNN-slug/TASK.md`. Contract 5 uses a contract marker and one JSON metadata comment containing ID, status, and actual dependencies. Goal, acceptance, decisions, verification, remaining work, and a useful resume point remain readable prose. Detailed TEST or matrices are optional when they add traceability.

Statuses remain `DRAFT`, `READY`, `IN_PROGRESS`, `DONE`, `BLOCKED`, and `CANCELLED`. IDs are stable identifiers, not global execution order. Allocation remains collision-safe. Dependencies express actual prerequisite results; missing prerequisite code blocks dependent work, while an unrelated unfinished or undelivered Task does not. Automatic selection can prefer an active or lowest eligible ready Task without restricting independent work in separate copies. Concurrent writes to the same paths require coordination, not a new scheduler.

Exact implementation, audit, and delivery selection scopes blocking inventory and graph errors to the selected Task and its transitive dependencies, while returning unrelated inventory problems as warnings. Relevant duplicate IDs, malformed records, unsafe paths, missing dependency records, and cycles remain blocking. Global allocation, batch creation, and automatic selection retain their broader checks. Delivery additionally validates the included changes, repository/PR, approval, and CI; narrow Task selection does not waive those gates. A creation transaction permits exact selection of existing records only when its current ownership metadata proves those records and their dependencies do not overlap the creation/recovery targets; unknown or damaged transaction scope remains blocking and no lock is removed by age.

Dependency records guide inspection, not availability proof. Exact local dispatch returns each dependency's recorded status and paths as unverified, including DONE records, so unfinished status does not prevent exploring existing code. The implementing agent verifies the actual prerequisite files/interfaces in the current worktree and handles concrete missing results within the approved scope. Automatic selection may use status for eligibility but does not certify prerequisite code or turn unresolved pending work into all-work-complete. Selection grants no delivery authority or completion evidence.

Existing contracts 1–4 and Task/Test state pairs remain readable and resumable without bulk conversion. Historical evidence retains its SHA and meaning. Previously immutable records/checkpoints are not mass edited or reconstructed on every local request. Current explanatory corrections use Git history and never imply past tests were rerun. Split work by independent results, risk, dependencies, or handoff needs rather than session, compaction, or file count.

## Verification and audit

Run relevant regression first. Successful checks are repeated or broadened only after relevant changes, failures, or concrete unresolved risks. Reuse requires unchanged command, relevant source/tests/configuration, dependencies, and required environment/tool versions; a written PASS is not a reusable execution record. Perform the required integration checks on the final combined state when the change needs them; completing every small change does not independently mandate a full suite. A different OS or required remote CI is a different input. kyw-dev's Focused/Stable/Release commands and supported matrix verify this repository; they are not consumer-project requirements.

The path planner treats executable code under `skills/` as runtime, instructions and behavior templates as behavior, and pure guidance separately. Known regular-file additions, edits, deletions, and moves of ordinary guidance or Task records receive Focused coverage; Git status A alone does not require Stable. Rename/copy considers both paths. Unknown types, links, type changes, conflicts, or incomplete change evidence retain conservative coverage; instruction, runtime, package, and CI/release-sensitive roles keep their required checks. CI keeps a stable required aggregate and validates that selected roles ran successfully and omitted roles were intentionally unnecessary. Supported OS/Node coverage remains available for runtime, filesystem, installation, and release changes.

Audit preserves original tracked/untracked/generated/cache/Task state and external state. Tests may run in a temporary environment only where actual tools constrain writes and network and withhold production credentials. A copy alone is not a sandbox. If isolation is unavailable, complete safe inspection and report unsafe verification as unexecuted. Cleanup is confined to proved self-owned temporary paths. Explicit repair changes only approved findings and reruns affected checks.

Audit reports actual blocking findings, performed verification, unexecuted/uncertain checks and reasons, and completion impact separately. Missing required evidence holds the affected completion, merge, or release; it is not a discovered implementation defect. Optional verification limits alone do not invalidate satisfied required evidence or mandate another audit. Unknown or unexecuted checks never become PASS or test failure. Preserve verified progress while required evidence remains outstanding. Independent audit is not an automatic prerequisite after every implementation.

Reports distinguish actual code/mock checks from model behavior. Do not report unexecuted Astra behavior, timing savings, or production publication as tested.

## PR, merge, and public release

Default deliver ends at the PR boundary, including for legacy contract 4. A `STANDARD` policy or historical `Release version` is not current merge/release authorization. The old automatic public continuation is intentionally retired; `--public-release` is unsupported.

General merge uses authoritative target-project evidence for the repository, PR, current base/head, applicable required checks/reviews/protection, and mergeability. No kyw-dev workflow/job/step names, `main` branch, npm, or plugin structure are required. Non-required failing checks are not automatically promoted to required gates; actual acceptance defects still need resolution. Respect accepted skipped/neutral conclusions without calling them executed tests, head or current test-merge evidence as the project requires, and required check sources. Missing, pending, failed, stale, wrong-target/source, or uncertain required evidence blocks that merge. An empty check list alone does not prove absence of requirements; authoritative platform readiness can suffice without a new administrator-API prerequisite.

Recheck the target immediately before an expected-head merge, with no bypass/admin/force path. Use the project's normal merge queue when supported and authorized; distinguish queueing, auto-merge scheduling, and actual merge. Unsupported or ambiguous platform boundaries hold that external action while preserving local completion. Canonical `check-ci` retains its kyw-dev-specific meaning, separate from general merge. Historical evidence is read according to its original contract.

The built-in release route is for `kimyeongwoo/kyw-dev` maintenance only; enforce identity before publisher, tag, or Release writes. Other projects use existing procedures within current authorization; unclear procedures are reported without creating npm/OIDC infrastructure. Release does not choose/bump versions or automatically merge PRs. It validates the prepared repository/version/SHA, exact packed bytes and digests, registry conflicts, publisher identity, and canonical CI before npm → exact-SHA tag → Release. Its Task-independent target may contain several completed outcomes.

New npm publication requires the current prepared main SHA. A fresh invocation may resume an already published ancestor after main advances only with verified local/remote main ancestry and exact npm/workflow/artifact/provenance proof for the original frozen identity. It creates only missing tag/Release effects; an already complete target requires no writes. Unpublished old targets, conflicts, and ambiguous evidence remain blocked.

The actual npm publish boundary checks trusted GitHub API evidence for the correct repository, canonical workflow, exact main-push SHA, authoritative latest run/attempt, and successful required aggregate coverage. Other SHA, PR synthetic merge, incomplete/failed/cancelled/missing/ambiguous evidence, permission errors, or incomplete queries block publication. Older success never substitutes for a later failure or running attempt.

The final CI check and actual npm invocation occupy adjacent Actions steps. CI rejection skips the npm step. A new run or rerun is safe only when complete canonical history proves that actual step was skipped in every previous attempt. A failed npm step, including a historical combined CI/publish step, remains ambiguous and does not authorize republication.

Preserve OIDC, least privilege, concurrency, package identity/digests, prior registry history, and signature/provenance verification. Multiple valid official signing keys are supported through keyid resolution; malformed, unknown, or invalid signatures do not pass. Previously frozen historical key identities are not silently replaced.

Transient reads allow bounded retries; authentication/invalid requests do not loop. Writes distinguish completed, proved-not-executed, and ambiguous results. Ambiguity requires exact-state reconciliation; neither a process exit code nor immediate 404 establishes non-execution. Skip completed effects, permit a safe fresh attempt only after proved pre-effect failure with current authority, and never automatically republish an ambiguous npm result. These observations do not make reads and external writes atomic or constrain administrators outside the workflow.

## Installation, compatibility, and safety

The dependency-free Node ESM CLI supports Node.js 22+, with Node.js 22/24 coverage on Linux, macOS, and Windows and a bounded Linux Node.js 26 compatibility lane. Direct managed Skills work in supported Codex CLI/desktop/IDE surfaces; plugin support follows the surface's plugin capability. Installation changes do not edit project documentation or user global configuration.

Commands remain `install --scope user|project`, `update --scope user|project`, `uninstall --scope user|project [--force]`, `doctor`, help, and version. Exit categories 0–7 retain success, usage, runtime, scope, conflict, malformed state, filesystem, and recovery meanings.

Installation records exact ownership and hashes. It rejects path escape, unsafe links/junctions/types, portable name collisions, unmanaged overwrites, and ambiguous interrupted state. Normal uninstall removes only unchanged owned files. Explicit force remains confined to already owned modified regular files, preserving unknown content and unrelated Skills. Doctor is read-only and reports duplicates without reconciling them. Previous four-/five-Skill ownership metadata remains readable.

The positive package allowlist contains plugin metadata, six Skills, runtime, templates, README, and legal notices. It excludes repository Tasks, one-off development briefs, evaluators/tests, credentials, local configuration, and temporary artifacts. Package/plugin version remains the selected source version, while npm latest must be queried when relevant. No install/publication lifecycle script is required. Preserve MIT and upstream attribution, redact secrets, and clean only owned temporary roots.

## Acceptance

- A small local fix completes without Task/version/network prerequisites.
- New single-file Tasks can be authored, resumed, validated, and completed; legacy pairs remain usable without rewriting history.
- Real missing dependencies block their dependent work; unrelated undelivered work does not.
- Approved design changes, delegation, and progress questions do not trigger ceremonial reconfirmation.
- Plain deliver performs no merge/publish; merge and exact release require their separate action scope.
- Actual publication stays unreachable for noncanonical or unsuccessful CI, including a newer failed/running attempt after success.
- Conditional CI detects missing selected jobs; runtime adapters cannot take a document-only check path.
- Audit preserves original/external state and claims only isolation actually provided.
- External write reconciliation prevents duplicate completed effects while permitting proved safe recovery; valid multiple keys verify.
- Package, direct/plugin runtime, update, doctor, and uninstall preserve ownership and user work.
