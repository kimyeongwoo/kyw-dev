# kyw-dev

`kyw-dev` is a lightweight, spec-driven development workflow for Codex. It turns an idea into shared product and architecture truth, dependency-aware numbered Tasks, and test evidence that stays aligned with the final diff.

> Product, plugin, CLI, and preferred npm package name: `kyw-dev`

## Start here

### Choose one installation surface

The current usable source is this checkout; `kyw-dev` has not yet been published to npm or a public plugin directory.

| Use case | Choose | Result |
|---|---|---|
| Codex CLI or IDE extension; one repository or all repositories | [Direct Skills installation](#direct-skills-installation) | Installs the five managed `kyw-*` Skills at project or user scope. |
| ChatGPT desktop Codex or Codex CLI with plugin support | [Codex plugin installation](#codex-plugin-installation) | Installs the same five Skills from a local/personal marketplace package. |

Use exactly one source for the five Skill names. Keeping direct and plugin copies together creates duplicate discovery; `doctor` reports the sources without deleting either one.

### Invoke a Skill explicitly

| Skill | First invocation | Outcome |
|---|---|---|
| `$kyw-init` | `$kyw-init "adopt this repository without replacing existing contributor guidance"` | Inspect, resolve durable decisions, then create or minimally update the four permanent documents only after confirmation. |
| `$kyw-task` | `$kyw-task "add account lockout"` | Atomically author one outcome or the smallest dependency-aware `READY/READY` Task/Test set, report one exact next command, and stop. |
| `$kyw-impl` | `$kyw-impl 0007` | Implement or resume an existing Task through verification, durable-document synchronization, terminal state, and ordinary `STANDARD` delivery. |
| `$kyw-audit` | `$kyw-audit 0007` | Independently verify one Task without writes; the exact `$kyw-audit 0007 --fix` form authorizes bounded in-scope repair. |
| `$kyw-grilling` | `$kyw-grilling "stress-test this account lockout design"` | Run the read-only one-question-at-a-time decision interview without materializing files. |

All five packaged Skills disable implicit invocation. Use the explicit `$skill-name` form on every surface; only a loaded kyw-managed `AGENTS.md` may additionally route the anchored Task aliases in [Task routing and evidence](#task-routing-and-evidence).

### First workflow

```text
Idea or major redesign
        ↓
$kyw-init
        ↓
README.md + AGENTS.md + docs/SPEC.md + docs/ARCHITECTURE.md
        ↓
$kyw-task "one outcome or a dependency-aware set"
        ↓
$kyw-impl NNNN
        ↓
Implement → synchronize docs → verify
        ↓
$kyw-audit NNNN
```

Small questions and narrowly scoped changes do not require a Task folder. They still follow the documentation-sync and verification rules in `AGENTS.md`.

## Release status

Version `0.1.0` has implemented package, plugin, five-Skill, CLI, CI, installer, and development-only validation surfaces, but it has not been published. Historical release evidence remains immutable: Task 0020 is `BLOCKED`; the exact candidates from Tasks 0029 and 0038 reached `READY_FOR_APPROVAL` and were later superseded; Task 0047's exact historical candidate also reached `READY_FOR_APPROVAL`; and Task 0048 found its package-relevant bytes `UNCHANGED` at the audited point. The numbered Task/Test artifacts—not this durable summary—are the authoritative record for exact candidate identities, verdicts, and supersession.

No publication-boundary package version change, version tag, GitHub Release, npm publication, registry mutation, or public plugin-directory submission has occurred. Candidate readiness describes only the exact evaluated bytes and never authorizes publication, registry mutation, a version change, a tag, a GitHub Release, or a public submission. Preparing metadata, packing a tarball, passing CI, or running a dry run does not authorize those actions. Even a later pre-publication verdict does not by itself satisfy the published-tarball licensing requirement in [SPEC §15](docs/SPEC.md#15-mvp-acceptance-criteria).

Source: [kimyeongwoo/kyw-dev](https://github.com/kimyeongwoo/kyw-dev) · Issues: [GitHub issue tracker](https://github.com/kimyeongwoo/kyw-dev/issues)

## Task routing and evidence

The portable existing-Task form is:

```text
$kyw-impl 0006
```

A repository with the managed routing contract loaded also supports exactly:

```text
task 0006 실행해줘
task 진행해줘
남은 task 계속 실행해줘
```

These commands are a concise user projection. [SPEC §6.1](docs/SPEC.md#61-codex-skills) owns product behavior, `AGENTS.md` owns repository invariants, and the packaged [`kyw-impl` execution reference](skills/kyw-impl/references/execution.md) owns the detailed procedure.

- Authoring through `$kyw-task "goal"` turns independent outcomes, separate acceptance sets, dependency ordering, or excess single-Task scope into the smallest justified dependency-aware set. It atomically publishes complete `READY/READY` pairs, reports exactly one next `$kyw-impl NNNN` for the first eligible pair, and stops without implementation or automatic Skill chaining.
- `$kyw-task NNNN` remains only for compatible `DRAFT/DRAFT` authoring or promotion. A non-DRAFT pair is not executed through that form; it receives the exact `$kyw-impl NNNN` migration command.
- Existing execution continues through `$kyw-impl` at the verified `Resume Point` without repeating Completed work. Exact `READY/READY` selection confirms implementation and ordinary `STANDARD` delivery. Automatic selection resumes active work, then resumable delivery, then the lowest eligible ready Task; continuous mode remains serial and current-invocation-only. Invalid states or dependencies fail closed, incidental “task” prose does not route, and a surface without the managed contract uses `$kyw-impl NNNN`.
- Appended user text may constrain the first selected Task but cannot waive safety or evidence. The configured model and reasoning effort stay unchanged unless that user explicitly overrides them. `TEST.md` records model identifier, requested alias, reasoning effort, Codex surface, version, and per-field observability; hidden values remain `UNAVAILABLE`, never guessed.
- Task/Test owns repository outcome; GitHub owns mutable delivery state. The static declaration alone grants no ambient authority, while `IMPLEMENT`, `RESUME`, or `DELIVER` selection authorizes exact-path commit, non-force push, non-draft PR, exact-head CI, expected-head merge, post-merge base-branch CI, and terminal reporting without ceremonial reconfirmation. Publication, registry mutation, tags/releases, public submission, force/destructive operations, reruns, bypasses, and unrelated mutations remain separately authorized.

## Installation details

### Compatibility matrix

Official surface behavior was checked on **2026-07-24** against [Build skills](https://learn.chatgpt.com/docs/build-skills), [Plugins](https://learn.chatgpt.com/docs/plugins), [Build plugins](https://learn.chatgpt.com/docs/build-plugins), and [custom instructions with `AGENTS.md`](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Skills are available in the ChatGPT desktop app, Codex CLI, and IDE extension. Plugins are available in the desktop app and CLI, but not in the IDE extension. Until kyw-dev is actually published or listed in a trusted marketplace, the checkout and local-marketplace commands below remain the usable sources.

| Surface or scope | Primary recommendation now | Supported fallback or limit |
|---|---|---|
| Codex CLI | Install direct Skills from this checkout at exactly one scope: project for one repository, user for all repositories. | A configured marketplace plugin can be installed through `/plugins`; start a new CLI session afterward and remove the direct copy first. |
| Desktop Codex in the ChatGPT desktop app | Install the packed plugin from a repository or personal local marketplace. | Direct repository or user Skills are discoverable, but do not keep the same names installed through both paths. Restart the app or start a new chat after installation changes. |
| Codex IDE extension | Install direct Skills at project scope by default; use user scope only when the workflow should apply everywhere. | Plugins are not available in the IDE extension. The fallback is the other direct-Skill scope, not a plugin install. |
| Repository scope | Run `install --scope project`; Codex discovers `<repo>/.agents/skills/` from that repository context. | A repository marketplace is an alternative for plugin-capable CLI/desktop use. Direct installation does not add `AGENTS.md`, so repository aliases require the managed contract to already exist. |
| User scope | Run `install --scope user`; Codex discovers `~/.agents/skills/` across repositories. | A personal marketplace plugin is an alternative for plugin-capable CLI/desktop use. A same-named project copy creates another discoverable source. |

The portable `$kyw-grilling`, `$kyw-init`, `$kyw-task "<outcome>"`, `$kyw-impl NNNN`, and `$kyw-audit NNNN` forms work wherever the corresponding Skills are loaded. The shorter existing-Task forms are repository routing, not implicit Skill aliases. If that contract is absent, not loaded, or outside the current instruction chain, use `$kyw-impl NNNN`.

### Direct Skills installation

Until the first explicitly approved npm publication, use the checkout entrypoint. After `kyw-dev@0.1.0` is actually present on npm, the same arguments apply to `npx --yes kyw-dev@0.1.0 ...`; do not treat the prepared package as already published.

```bash
git clone https://github.com/kimyeongwoo/kyw-dev.git
cd kyw-dev
node ./bin/kyw-dev.mjs install --scope user
node ./bin/kyw-dev.mjs install --scope project
node ./bin/kyw-dev.mjs update --scope user
node ./bin/kyw-dev.mjs uninstall --scope user
node ./bin/kyw-dev.mjs doctor
```

- `user` installs managed Skills under `~/.agents/skills/`; `project` finds the enclosing Git root and installs under `<repo>/.agents/skills/`.
- The CLI installs workflow Skills only. It does not create project documents or Tasks; `$kyw-init` owns confirmed permanent-document materialization.
- Ownership is recorded in `.agents/skills/.kyw-dev-install.json`, with deterministic Task runtime support under `.agents/skills/.kyw-dev/runtime/`. New install/update metadata records all five Skills; doctor, update, and uninstall also safely read legacy schema-1 metadata that records the former four-Skill set. The runtime directory is not a discoverable Skill.
- Install refuses unmanaged collisions, unsafe roots, links, unsupported types, and non-portable managed paths. Use `update` only for an owned installation.
- Update requires every owned file, parent, and package source to remain confined, link-free, and hash-matching, and refuses unknown managed-container content.
- Normal uninstall removes only unchanged metadata-owned files. `--force` can remove only modified files already named by valid kyw-dev ownership metadata; it still preserves unknown files, unrelated Skills, links/junctions, and unsupported types.
- Mutating commands recover only ownership-proven interrupted transactions. `doctor` is byte-and-metadata read-only and reports unsafe state, version drift, partial transactions, permissions, and duplicate direct/plugin sources.

To resolve a duplicate:

1. Choose the one source recommended by the matrix for the surface you use.
2. Remove an unchanged direct copy with `uninstall --scope user` or `uninstall --scope project`.
3. Remove a plugin through the desktop Plugins Directory or the CLI `/plugins` browser; do not manually delete the broad plugin cache.
4. Preserve and inspect unmanaged, modified, linked, or unknown files. `--force` can remove only modified files already named by valid kyw-dev ownership metadata.
5. Restart the affected Codex surface or start a new session, then rerun `doctor` from the target repository.

CLI exit codes are stable:

| Code | Meaning |
|---|---|
| `0` | Command succeeded, or doctor found no error. |
| `1` | Command usage error. |
| `2` | Unsupported Node runtime. |
| `3` | User/project scope could not be resolved. |
| `4` | Unsafe overwrite, local modification, or duplicate-install conflict. |
| `5` | Malformed package or installation metadata/state. |
| `6` | Filesystem or permission failure. |
| `7` | A partial transaction needs recovery or manual inspection. |

If a command returns 4 through 7, run `doctor`, inspect the named paths, and preserve unknown files and links. Do not delete the broad `.agents/skills` directory or point `--force` at an unsafe link. Retry a mutating command only when its ownership-proven journal is valid; otherwise reconcile the reported state manually.

The preferred pre-publication npm name is the unscoped `kyw-dev`, but it is not reserved by repository configuration or prior checks. Recheck it only at a separately approved publication boundary. If unavailable, stop and choose a real owner scope rather than inventing one.

### Codex plugin installation

The npm package contains `.codex-plugin/plugin.json` and all five `skills/` directories. Pre-publication verification extracts the real package into an isolated local marketplace and installs `kyw-dev@kyw-dev-local`; the fixture and runner are development-only and excluded from the tarball.

An npm marketplace entry can replace the local source only after publication. Plugin and direct-Skills installation are alternatives. See [Architecture §11](docs/ARCHITECTURE.md#11-installation-and-distribution-architecture) for package, marketplace, cache, duplicate, and release-gate boundaries.

## Development

Prerequisite: Node.js 22 or newer with npm. Node.js 22 and 24 are fully tested on Linux, macOS, and Windows; Node.js 26 Current has one bounded Ubuntu compatibility lane. The repository has no package dependencies or lockfile, so no install step is required before checks.

```bash
node ./bin/kyw-dev.mjs --help
node ./bin/kyw-dev.mjs --version
npm run verify:plan -- README.md
npm test
npm run lint
npm run format:check
npm run pack:check
npm run check
npm run release:candidate
npm run release:ci
npm run release:check
node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures
node ./scripts/release-gate-isolation.mjs
```

### Development-only release evidence harness

`scripts/release-evidence-harness.mjs` retains one run's release evidence beneath an existing caller-owned root outside the repository. Run it from the repository root after creating the named sibling directory:

```bash
node ./scripts/release-evidence-harness.mjs --self-test --repository . --allowed-parent .. --evidence-root ../kyw-dev-release-evidence
node ./scripts/release-evidence-harness.mjs --dry-validate --repository . --allowed-parent .. --evidence-root ../kyw-dev-release-evidence
```

`--self-test` runs only harmless children, including the deliberate exit-7 durability check. `--dry-validate` validates the exact `npm run release:check` plan, external paths, protected/config state, and npm provenance without running that release command, a standalone dry run, release isolation, or a registry/auth probe. Both modes retain a new unpredictable run directory containing preflight, command-plan, npm/Node provenance, postflight, and atomic redacted summary evidence. Child stream files are unparsed but redacted before storage; the harness never copies normal npm credentials or config contents.

Blocked Task 0051 can reuse the following exact command only after separate approval of the release boundary and creation of a fresh empty sibling root:

```bash
node ./scripts/release-evidence-harness.mjs --run --allow-release-command --repository . --allowed-parent .. --evidence-root ../kyw-dev-task0051-release-evidence
```

Actual mode invokes the reviewed composite once through the proved exact npm CLI and has no retry or additional standalone dry run. The double flag is an execution guard, not publication approval: registry mutation, actual publish, version/tag/Release changes, and public submission remain separate actions. Evidence is never automatically deleted; cleanup is permitted only for the exact owned run after its sanitized result has been preserved.

Use the read-only planner with explicit repository-relative paths:

| Tier | Trigger | Maintainer entry point |
|---|---|---|
| Focused | Documentation, one Skill, or another bounded behavior change | `npm run verify:plan -- <changed-path>...`, then run the ordered commands it prints |
| Stable | Runtime, cross-cutting, unknown, or higher-risk change; every PR and `main` push | `npm run check`; hosted CI runs the complete supported Node/OS matrix |
| Release | Release-sensitive implementation, an immutable candidate, registry dry run, or publication boundary | `npm run release:candidate`, `npm run release:ci`, isolation, and `npm run release:check` as the named boundary requires |

`npm run check` runs test, lint, format, and package-selection checks. `npm run release:candidate` creates and inspects one real tarball without publishing; `npm run release:ci` combines Stable with that candidate gate. `npm run release:check` additionally runs `npm publish --dry-run --json`, which does not publish but remains a distinct registry evidence boundary. The planner never replaces acceptance-specific verification or exact-head PR/`main` CI. See [Architecture §11.5–11.6](docs/ARCHITECTURE.md#115-credential-free-continuous-integration) for the immutable-Action CI and tier design.

### Development-only evaluators

Deterministic evaluator tests are part of `npm test`. Model-backed commands are never required by public CI and require an explicit cost gate, exact model, reasoning effort, and authentication source:

```bash
npm run eval:grilling:unit
npm run eval:grilling:smoke -- --allow-model --variant kyw --scenario existing-code-facts --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
npm run eval:grilling:compare -- --allow-model --scenario existing-code-facts --model MODEL_ID --reasoning-effort EFFORT --runs 3 --auth-file PATH_TO_AUTH_JSON
npm run eval:grilling:report -- --comparison PATH_TO_COMPARISON_DIRECTORY
npm run eval:audit:smoke -- --allow-model --mode readonly --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
npm run eval:audit:smoke -- --allow-model --mode fix --model MODEL_ID --reasoning-effort EFFORT --auth-file PATH_TO_AUTH_JSON
```

Replace every uppercase placeholder. Start with one smoke per grilling variant: a smoke uses four model turns, while a comparison uses `2 × scenarios × runs × 4` turns and caps `--runs` at 10. Generated grilling results are ignored and excluded from the package; the audit smoke publishes no repository result artifact.

The release-isolation command is also development-only. `CLEAN` is its only success; `ISOLATION_VIOLATION` and `AMBIENT_STATE_CHANGED` are nonzero, and no result is itself release approval. Evaluator ownership, authentication, redaction, interruption/cleanup, sandbox, protected-state, retry, and result-publication constraints are authoritative in [Architecture §13](docs/ARCHITECTURE.md#13-validation-architecture).

## Repository map and contributing

- `skills/`: five packaged reasoning workflows and their focused references.
- `src/` and `bin/`: dependency-free CLI and deterministic core modules.
- `templates/`: canonical four-document and Task/Test section contracts.
- `docs/SPEC.md`: product behavior and requirements.
- `docs/ARCHITECTURE.md`: components, boundaries, flows, validation, and security constraints.
- `docs/tasks/`: numbered work contracts and retained repository evidence.
- `test/`, `scripts/`, and `eval/`: development-only verification surfaces, excluded from the npm package.

The exact package tree and dependency directions are in [Architecture §4](docs/ARCHITECTURE.md#4-top-level-package-structure). Use the active numbered Task rather than an old chronological list to determine current scope. Recommended maintainer invocations are in `CODEX_PROMPTS.md`.

The four permanent documents are README, AGENTS, SPEC, and ARCHITECTURE. Do not add Plan, Progress, Status, Handoff, Verification, or Test Plan documents when their content belongs in the current Task/Test pair.

## Reference standards

- Codex plugin authoring: https://learn.chatgpt.com/docs/build-plugins
- Codex Skill authoring: https://learn.chatgpt.com/docs/build-skills
- Project instructions with `AGENTS.md`: https://learn.chatgpt.com/docs/agent-configuration/agents-md
- npm `package.json`: https://docs.npmjs.com/cli/v11/configuring-npm/package-json

## Licensing

`kyw-dev` is licensed under MIT with `Copyright (c) 2026 Kim Yeongwoo`.

The `$kyw-grilling` interview method is adapted from Matt Pocock's `mattpocock/skills` project under MIT. Preserve the upstream notice in the distributed package; see `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt`.
