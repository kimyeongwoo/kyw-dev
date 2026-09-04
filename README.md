# kyw-dev

`kyw-dev` is a lightweight, spec-driven development workflow for Codex. It turns an idea into durable product and architecture truth, dependency-aware numbered Tasks, and verification evidence that stays aligned with the final diff.

> Product, plugin, CLI, and preferred npm package name: `kyw-dev`

## Start here

The repository and package metadata identify `kyw-dev@0.1.4`, which the public npm registry serves under `latest`; no public plugin-directory submission has occurred.

### Choose one installation surface

| Use case | Choose | Result |
|---|---|---|
| Codex CLI or IDE extension; one repository or all repositories | [Direct Skills installation](#direct-skills-installation) | Installs the six managed `kyw-*` Skills at project or user scope. |
| ChatGPT desktop Codex or plugin-capable Codex CLI | [Codex plugin installation](#codex-plugin-installation) | Loads the same six Skills from a local or personal marketplace package. |

Use one source for each managed Skill name. Keeping direct and plugin copies together creates duplicate discovery; `doctor` reports every discovered source without deleting one.

### Invoke a Skill explicitly

| Skill | Example | Outcome |
|---|---|---|
| `$kyw-init` | `$kyw-init "adopt this repository"` | Inspect and confirm durable decisions, then create or minimally update the four permanent documents. |
| `$kyw-task` | `$kyw-task "add account lockout"` | Author the smallest dependency-aware complete `READY/READY` Task/Test set, print one next `$kyw-impl NNNN`, and stop. |
| `$kyw-impl` | `$kyw-impl 0007` | Implement or resume one Task through verification, truth synchronization, and `DONE/PASSED`; then stop. |
| `$kyw-deliver` | `$kyw-deliver 0007` | Plain form is `STANDARD`-only; exact `$kyw-deliver 0007 --public-release` first finishes it, then resumes npm→tag→Release. |
| `$kyw-audit` | `$kyw-audit 0007` | Independently verify one Task without writes; only `$kyw-audit 0007 --fix` permits bounded repair. |
| `$kyw-grilling` | `$kyw-grilling "stress-test this design"` | Run the read-only, one-question-at-a-time decision interview without creating files. |

<!-- kyw-active-skill-guardrails:v1 -->

All six packaged Skills disable implicit invocation. Only exact Skill syntax or the three implementation aliases below starts an active kyw workflow; completion, stop, cancellation, or expiry ends it.

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
Implement → synchronize durable truth → verify → DONE/PASSED → stop
        ↓ explicit next invocation
$kyw-deliver NNNN
        ↓
$kyw-audit NNNN
```

Outside an active workflow, ordinary prompts get no kyw block, warning, Task creation/selection, or redirect; changed durable meaning still updates its owner. Inside one, aligned work needs no duplicate guardrail confirmation. A material baseline, Task, acceptance, scope, action, target, or attempt change warns and waits; only the immediately next exact reconfirmation on unchanged facts permits truth sync then those bounds. See [SPEC](docs/SPEC.md#63-activation-scoped-guardrails-and-ordinary-prompts).

## Release status

Version `0.1.4` is the current source/package release and public `latest`; this source projects six Skills while package/publication version state remains unchanged. Exact historical results live only in numbered Task/Test pairs and GitHub.

`kyw-dev@0.1.4` is published to the public npm registry under the `latest` tag; historical versions `0.1.0` through `0.1.3` remain available. Its single authorized publication used the GitHub Actions trusted publisher from the exact Git checkout, so canonical version metadata exposes a `gitHead` field matching the published source commit and carries npm registry signatures plus SLSA provenance bound to the exact workflow and commit. The `v0.1.4` Git tag identifies the published source commit, and the corresponding GitHub Release uses that tag. Historical `0.1.2` retains its original signature and provenance, but its immutable canonical metadata lacks `gitHead` because that release published a prebuilt tarball. No public plugin submission has occurred.
The separate `.github/workflows/publish.yml` maintainer workflow is manual-only and is validated against the repository-owned expected publisher `GitHub Actions / kimyeongwoo/kyw-dev / publish.yml / npm-production`. Ten required inputs bind current `main` SHA/version, packed bytes/digests/entry set, prior npm versions/`latest`, and the sole current registry signing key. The sole OIDC job fails closed on identity or checkout drift, frozen registry/pack mismatch, another target run, or an existing target tag/Release, then publishes the exact real Git checkout directory once in one tokenless, OTP-free attempt. Required candidate and exact-SHA CI evidence stays outside this workflow. A successful actual publish is the runtime proof that npm accepted that identity, and the public repository receives npm provenance automatically.
Merging the workflow, passing credential-free exact-SHA CI, packing a candidate, or completing `npm run release:check` cannot execute it. Routine release preflight validates the expected tuple and exact workflow bytes; only the requested workflow validates public package identity and target-version absence, freshly rechecking its frozen packed/prior state before publication. Neither needs `npm login`, OTP, security-key authentication, account-settings inspection, or `npm trust list`; account authentication is reserved for setup, an explicit security/configuration audit/change, or actual OIDC failure. Only exact `$kyw-deliver NNNN --public-release` supplies the fixed npm→exact-SHA tag→GitHub Release attempt after `STANDARD FINAL`; implementation/tests perform zero live writes. Version change, submission, retry/fallback, force/destructive, bypass/admin/account, and deletion remain separate bounds; failure grants no retry.

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

Incidental prose containing `task` does not route. A surface without the managed contract uses `$kyw-impl NNNN`.

- `$kyw-task "goal"` authors only complete Task/Test pairs and stops. `$kyw-task NNNN` handles only a compatible existing `DRAFT/DRAFT` pair; implementation belongs to a later `$kyw-impl NNNN`.
- `$kyw-impl` never allocates, authors, selects, or executes delivery. It resumes the active Task, otherwise the lowest eligible ready Task. Pending delivery blocks with exact `$kyw-deliver NNNN`; a completed `STANDARD` Task prints exactly `다음 단계: $kyw-deliver NNNN` and stops, including continuous mode.
- Exact `$kyw-deliver NNNN` retains `STANDARD`-only behavior. The sole suffix is exact `$kyw-deliver NNNN --public-release`; every other suffix and every bare/Korean, implicit, continuous, chained, or background form is unsupported. Reasoned `NONE` remains local.
- `$kyw-audit` is independent. Bare audit is byte-preserving read-only; bounded repair requires a new exact invocation with `--fix`.
- Appended user constraints cannot waive acceptance, truthful evidence, safety, or preservation. The configured model and reasoning effort remain unchanged unless the current user explicitly overrides them; unavailable provenance is recorded as unavailable, never guessed.

Task/Test owns repository outcome and reproducible acceptance evidence. GitHub owns mutable PR, review, merge, and Actions state.
Before implementation selection, `$kyw-impl NNNN` read-only validates prior `STANDARD` continuity from one fixed-bounded checkpoint in exact aligned `main` and at most one freshly reconstructed uncovered predecessor. Users supply no ledger/checkpoint/evidence payload. Missing, stale, over-gap, or incomplete proof blocks before mutation and requires explicit rebaseline, never automatic replay. `$kyw-deliver NNNN` separately hydrates current delivery. Its hardened graph keeps actual PR-head jobs, synthetic merge compatibility, reviewed expected-head merge, and post-merge `main` jobs as distinct exact-SHA roles; invalid evidence fails closed and CI never substitutes for acceptance.

Public opt-in reuses that graph and permits no public write before its exact merge/post-main `FINAL`. It freezes repository, workflow, package/plugin, tarball, merge, tag, and Release identity; fresh npm/run/tag/Release reads classify absence, exact completion, pending proof, conflict, or unknown. Only absence creates once in npm→tag→Release order. Resume skips exact stages; pending observes; failure/ambiguity blocks with redacted recovery and never retries. Final proof is fresh canonical npm and GitHub state, while terminal Task/Test and continuity bytes stay unchanged.

A future-contract `STANDARD` Task has one canonical delivery. Its first complete hardened exact-head graph binds the exact
terminal `TASK.md` and `TEST.md` bytes; later invocations are report-only, and a correction starts with an explicit
`$kyw-task "<correction outcome>"` whose new pair hard-depends on the delivered Task. Editing, deleting, renaming, replacing, or
redelivering the old pair fails before dispatch. Unmarked and prior-contract history remains readable and is not retroactively
rewritten or reclassified.

A selected implementation action owns repository mutation through `DONE/PASSED`; selected delivery owns only its separate aligned GitHub lifecycle. Changed bounds use the warning/reconfirmation transition; later post-terminal prompts are ordinary.

Product behavior is owned by [SPEC](docs/SPEC.md), repository invariants by [AGENTS](AGENTS.md), and system boundaries by [ARCHITECTURE](docs/ARCHITECTURE.md). Detailed procedure belongs only to [`kyw-impl`](skills/kyw-impl/references/execution.md), [`kyw-deliver`](skills/kyw-deliver/references/delivery.md), or its conditionally loaded [public-release reference](skills/kyw-deliver/references/public-release.md).

## Installation details

### Compatibility matrix

| Surface or scope | Recommended surface | Important limit |
|---|---|---|
| Codex CLI | Direct project or user Skills; a configured marketplace plugin is an alternative. | Keep only one source for each Skill name and start a new session after changing it. |
| ChatGPT desktop Codex | Packed plugin from a repository or personal marketplace. | Direct Skills also work, but must not duplicate plugin Skill names. |
| Codex IDE extension | Direct project Skills by default, or user Skills when wanted everywhere. | Plugins are not available in the IDE extension. |
| Repository scope | `install --scope project` | Installs under `<repo>/.agents/skills/`; it does not add `AGENTS.md`. |
| User scope | `install --scope user` | Installs under `~/.agents/skills/` for discovery across repositories. |

The portable `$kyw-grilling`, `$kyw-init`, `$kyw-task "<outcome>"`, `$kyw-impl NNNN`, `$kyw-deliver NNNN`, and `$kyw-audit NNNN` forms work wherever loaded.

### Direct Skills installation

Use the published CLI:

```bash
npx --yes kyw-dev@0.1.4 install --scope user
npx --yes kyw-dev@0.1.4 install --scope project
npx --yes kyw-dev@0.1.4 update --scope user
npx --yes kyw-dev@0.1.4 uninstall --scope user
npx --yes kyw-dev@0.1.4 doctor
```

For source-checkout development, clone the repository and substitute `node ./bin/kyw-dev.mjs` for `npx --yes kyw-dev@0.1.4` in the same commands.

- The CLI installs the six workflow Skills only. `$kyw-init`, after confirmation, owns project-document creation.
- Ownership metadata is stored in `.agents/skills/.kyw-dev-install.json`; deterministic Task support is stored under `.agents/skills/.kyw-dev/runtime/`, which is not a discoverable Skill.
- New metadata records all six Skills. Doctor, update, and uninstall safely read the exact prior five- and original four-Skill inventories.
- Install and update refuse unmanaged collisions, modified or missing owned content, unsafe roots, traversal, links or junctions, unsupported types, and unknown content in managed containers.
- Normal uninstall removes only unchanged metadata-owned files. `--force` may remove modified regular files already named by valid ownership metadata; it never broadens ownership to unknown files, unrelated Skills, links, or unsupported types.
- Interrupted mutation is recovered only from complete ownership, path, type, identity, and hash proof. Unknown or replaced state fails closed for inspection.
- `doctor` is byte-and-metadata read-only. It reports version drift, permissions, unsafe or partial state, and duplicate direct/plugin sources without enabling, disabling, repairing, or deleting them.
- No plugin installation or publication depends on npm lifecycle scripts. Never delete the broad `.agents/skills` directory.

CLI exit codes are stable:

| Code | Meaning |
|---|---|
| `0` | Success, or healthy diagnostics. |
| `1` | Usage error. |
| `2` | Unsupported Node runtime. |
| `3` | User/project scope could not be resolved. |
| `4` | Unsafe overwrite, local modification, or duplicate conflict. |
| `5` | Malformed package or installation state. |
| `6` | Filesystem or permission failure. |
| `7` | Recovery or manual inspection is required. |

For codes 4–7, run `doctor`, inspect only the reported paths, and preserve unknown files and links. Resolve duplicates by uninstalling an unchanged direct copy with the CLI or removing a plugin through the supported plugin browser, then restart the affected Codex surface and rerun `doctor`.

The unscoped `kyw-dev` name is public on npm. A future exact public-release invocation revalidates identity, version absence, publisher tuple, and delivered workflow without routine npm-account reauthentication; it never selects the next version.

### Codex plugin installation

The package contains `.codex-plugin/plugin.json` and all six `skills/` directories. Package/tarball inspection covers its manifest, Skills, runtime, and legal bytes; development fixtures stay outside.

The npm package is available to configured marketplace sources, but no public plugin-directory submission has occurred. Direct Skills and plugin installation are alternatives, not layers to combine. See [ARCHITECTURE](docs/ARCHITECTURE.md) for package, marketplace, cache, duplicate-source, and release boundaries.

## Development

Prerequisite: Node.js 22 or newer with npm. Node.js 22 and 24 are tested on Linux, macOS, and Windows; Node.js 26 Current has one bounded Ubuntu compatibility lane. The repository has no package dependencies or lockfile, so checks require no install step.

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
node ./scripts/spec-behavioral-acceptance.mjs --validate-fixtures
```

Use the read-only planner with explicit repository-relative changed paths:

| Tier | Trigger | Entry point |
|---|---|---|
| Focused | Documentation, one Skill, or another bounded behavior | `npm run verify:plan -- <changed-path>...`, then its ordered commands |
| Stable | Runtime, cross-cutting, unknown, or higher-risk work; every PR and `main` push | `npm run check`, plus hosted exact-SHA matrix evidence |
| Release | Release-sensitive bytes or explicit candidate intent | `npm run release:ci` |

`npm run check` runs tests, lint, format, and package selection. `release:candidate` creates and inspects one real tarball without
publishing; `release:ci` is exactly Stable plus candidate verification and is the sole Release planner command. Together,
`npm run check`, one real `npm run release:candidate`, and `npm run release:ci` form the complete required local release graph.
`npm run release:check` is only an optional thin maintainer alias for `npm publish --dry-run --json`; it neither reruns required
gates nor supplies required evidence or publication authority, and the planner, CI, and publication workflow never invoke it.

Hosted PR CI proves actual-head behavioral jobs across every supported OS/runtime, runs platform-independent lint, format, and
package selection once in a quality job, and keeps packed bytes separate. Synthetic merge compatibility runs the complete
combined-state check; `main` jobs prove the exact event SHA. Model-backed evaluators are development-only, explicit-cost checks
and never required by public CI. Validation, candidate, evaluator, and credential boundaries are described in
[ARCHITECTURE](docs/ARCHITECTURE.md).

## Repository map and contributing

- `skills/`: six packaged reasoning workflows and focused references.
- `src/` and `bin/`: dependency-free CLI and deterministic core modules.
- `templates/`: canonical project and Task/Test shapes.
- `docs/SPEC.md`: observable product behavior and requirements.
- `docs/ARCHITECTURE.md`: components, boundaries, flows, and trade-offs.
- `docs/tasks/`: current work contracts and retained historical evidence.
- `test/`, `scripts/`, and `eval/`: development-only verification, excluded from the npm package.

The four permanent documents are README, AGENTS, SPEC, and ARCHITECTURE. Current scope and evidence belong in the active Task/Test pair; do not add separate Plan, Progress, Status, Handoff, Verification, or Test Plan documents. Maintainer prompt examples are in `CODEX_PROMPTS.md`.

## Reference standards

- [Codex plugin authoring](https://learn.chatgpt.com/docs/build-plugins)
- [Codex Skill authoring](https://learn.chatgpt.com/docs/build-skills)
- [Project instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)

## Licensing

`kyw-dev` is licensed under MIT with `Copyright (c) 2026 Kim Yeongwoo`.

The `$kyw-grilling` interview method is adapted from Matt Pocock's `mattpocock/skills` project under MIT. Preserve its notice in distributed bytes; see `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt`.
