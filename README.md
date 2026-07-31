# kyw-dev

`kyw-dev` is a lightweight, spec-driven development workflow for Codex. It turns an idea into durable product and architecture truth, dependency-aware numbered Tasks, and verification evidence that stays aligned with the final diff.

> Product, plugin, CLI, and preferred npm package name: `kyw-dev`

## Start here

The repository and package metadata identify `kyw-dev@0.1.3`, which the public npm registry serves under `latest`; no public plugin-directory submission has occurred.

### Choose one installation surface

| Use case | Choose | Result |
|---|---|---|
| Codex CLI or IDE extension; one repository or all repositories | [Direct Skills installation](#direct-skills-installation) | Installs the five managed `kyw-*` Skills at project or user scope. |
| ChatGPT desktop Codex or plugin-capable Codex CLI | [Codex plugin installation](#codex-plugin-installation) | Loads the same five Skills from a local or personal marketplace package. |

Use one source for each managed Skill name. Keeping direct and plugin copies together creates duplicate discovery; `doctor` reports every discovered source without deleting one.

### Invoke a Skill explicitly

| Skill | Example | Outcome |
|---|---|---|
| `$kyw-init` | `$kyw-init "adopt this repository"` | Inspect and confirm durable decisions, then create or minimally update the four permanent documents. |
| `$kyw-task` | `$kyw-task "add account lockout"` | Author the smallest dependency-aware complete `READY/READY` Task/Test set, print one next `$kyw-impl NNNN`, and stop. |
| `$kyw-impl` | `$kyw-impl 0007` | Implement or resume one existing Task through verification, document synchronization, repository completion, and ordinary `STANDARD` delivery. |
| `$kyw-audit` | `$kyw-audit 0007` | Independently verify one Task without writes; only `$kyw-audit 0007 --fix` permits bounded repair. |
| `$kyw-grilling` | `$kyw-grilling "stress-test this design"` | Run the read-only, one-question-at-a-time decision interview without creating files. |

All five packaged Skills disable implicit invocation. Use the explicit `$skill-name` form on every surface. Only a loaded kyw-managed `AGENTS.md` may additionally route the three anchored existing-Task aliases described below.

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
Implement → synchronize durable truth → verify → deliver
        ↓
$kyw-audit NNNN
```

Questions and small, clearly bounded changes do not require a Task folder. They still follow the documentation-impact and verification rules in `AGENTS.md`.

## Release status

Version `0.1.3` is the current source/package release and public `latest`; it implements the plugin, five Skills, CLI, installer, CI, and development validation surfaces. Exact historical candidates and results live only in their numbered Task/Test pairs and GitHub.

`kyw-dev@0.1.3` is published to the public npm registry under the `latest` tag; historical versions `0.1.0` through `0.1.2` remain available. Its single authorized publication used the GitHub Actions trusted publisher from the exact Git checkout, so canonical version metadata exposes a `gitHead` field matching the published source commit and carries npm registry signatures plus SLSA provenance bound to the exact workflow and commit. Historical `0.1.2` retains its original signature and provenance, but its immutable canonical metadata lacks `gitHead` because that release published a prebuilt tarball. No version tag, GitHub Release, or public plugin submission has occurred.
The separate `.github/workflows/publish.yml` maintainer workflow is manual-only and is validated against the repository-owned expected publisher `GitHub Actions / kimyeongwoo/kyw-dev / publish.yml / npm-production`. It accepts an exact current `main` SHA and package version, independently inspects one retained candidate, then publishes the exact real Git checkout directory with the publishing job's OIDC permission for one tokenless, OTP-free attempt. A successful actual publish is the runtime proof that npm accepted that identity, and a public-package publish from this public repository receives npm provenance automatically.
Merging the workflow, passing credential-free CI, packing a candidate, or completing `npm publish --dry-run` neither dispatches nor authorizes it. Routine release preflight validates the expected tuple, exact workflow bytes, public package identity, and target-version absence without `npm login`, OTP, security-key authentication, account-settings inspection, or `npm trust list`; account-side authentication is reserved for initial setup, an explicitly authorized security/configuration audit or change, or investigation after an actual OIDC/publisher failure. Each publication or other registry/version/tag/Release/submission mutation still requires separate explicit authority.

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
- `$kyw-impl` never allocates or authors a Task. One Task may be active: exact selection cannot bypass it; automatic selection resumes active work, then resumable `STANDARD` delivery, then the lowest eligible ready Task. Continuous mode remains serial and lasts only for the current invocation.
- `$kyw-audit` is independent. Bare audit is byte-preserving read-only; bounded repair requires a new exact invocation with `--fix`.
- Appended user constraints cannot waive acceptance, truthful evidence, safety, or preservation. The configured model and reasoning effort remain unchanged unless the current user explicitly overrides them; unavailable provenance is recorded as unavailable, never guessed.

Task/Test owns repository outcome and reproducible acceptance evidence. GitHub owns mutable PR, review, merge, and Actions state.
Before selecting a Task, the one-line `$kyw-impl NNNN` path validates previously evaluator-satisfied `STANDARD` continuity from
one fixed-bounded checkpoint in exact aligned `main`, then reconstructs fresh GitHub evidence for at most one uncovered prior
outcome. Users do not supply ledger JSON or run, job, synthetic, anchor, or checkpoint payloads. Expired Actions logs for covered
history no longer block selection; the uncovered outcome still requires `git`, the GitHub CLI, and authenticated repository read
access. Missing/corrupt/stale continuity, a gap larger than one, partial responses, identity drift, or incomplete fresh evidence
stops before selection or implementation mutation and requires explicit migration/rebaseline instead of automatic history replay.
Hardened `STANDARD` delivery keeps actual PR-head jobs, synthetic merge compatibility, the reviewed merge, and post-merge `main`
jobs as distinct exact-SHA roles. Missing, stale, mismatched, reused, or incomplete evidence fails closed, and CI success never
substitutes for behavioral acceptance.

A future-contract `STANDARD` Task has one canonical delivery. Its first complete hardened exact-head graph binds the exact
terminal `TASK.md` and `TEST.md` bytes; later invocations are report-only, and a correction starts with an explicit
`$kyw-task "<correction outcome>"` whose new pair hard-depends on the delivered Task. Editing, deleting, renaming, replacing, or
redelivering the old pair fails before dispatch. Unmarked and prior-contract history remains readable and is not retroactively
rewritten or reclassified.

A selected `IMPLEMENT`, `RESUME`, or `DELIVER` result authorizes ordinary Task delivery: exact-path commit, non-force push,
non-draft PR, exact-head CI observation, expected-head protected merge, post-merge CI observation, and terminal reporting.
Publication, registry mutation, version/tag/Release changes, public submission, force or destructive operations, workflow reruns,
bypasses, branch deletion, and unrelated changes remain separate authority boundaries.

Product behavior is owned by [SPEC](docs/SPEC.md), repository invariants by [AGENTS](AGENTS.md), system boundaries by [ARCHITECTURE](docs/ARCHITECTURE.md), and the detailed implementation procedure by [`kyw-impl`](skills/kyw-impl/references/execution.md).

## Installation details

### Compatibility matrix

| Surface or scope | Recommended surface | Important limit |
|---|---|---|
| Codex CLI | Direct project or user Skills; a configured marketplace plugin is an alternative. | Keep only one source for each Skill name and start a new session after changing it. |
| ChatGPT desktop Codex | Packed plugin from a repository or personal marketplace. | Direct Skills also work, but must not duplicate plugin Skill names. |
| Codex IDE extension | Direct project Skills by default, or user Skills when wanted everywhere. | Plugins are not available in the IDE extension. |
| Repository scope | `install --scope project` | Installs under `<repo>/.agents/skills/`; it does not add `AGENTS.md`. |
| User scope | `install --scope user` | Installs under `~/.agents/skills/` for discovery across repositories. |

The portable `$kyw-grilling`, `$kyw-init`, `$kyw-task "<outcome>"`, `$kyw-impl NNNN`, and `$kyw-audit NNNN` forms work wherever their Skills are loaded.

### Direct Skills installation

Use the published CLI:

```bash
npx --yes kyw-dev@0.1.3 install --scope user
npx --yes kyw-dev@0.1.3 install --scope project
npx --yes kyw-dev@0.1.3 update --scope user
npx --yes kyw-dev@0.1.3 uninstall --scope user
npx --yes kyw-dev@0.1.3 doctor
```

For source-checkout development, clone the repository and substitute `node ./bin/kyw-dev.mjs` for `npx --yes kyw-dev@0.1.3` in the same commands.

- The CLI installs the five workflow Skills only. `$kyw-init`, after confirmation, owns project-document creation.
- Ownership metadata is stored in `.agents/skills/.kyw-dev-install.json`; deterministic Task support is stored under `.agents/skills/.kyw-dev/runtime/`, which is not a discoverable Skill.
- New metadata records all five Skills. Doctor, update, and uninstall also safely read the exact legacy four-Skill inventory.
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

The unscoped `kyw-dev` name is published on the public npm registry. Before every separately authorized future publication, revalidate its public identity and target-version absence plus the repository-owned expected publisher tuple and exact delivered workflow; routine preflight does not reauthenticate to the npm account.

### Codex plugin installation

The package contains `.codex-plugin/plugin.json` and all five `skills/` directories. Per-version release verification installs extracted packed bytes through an isolated local marketplace as `kyw-dev@kyw-dev-local`; that fixture and runner are development-only and excluded from the tarball.

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
node ./scripts/release-gate-isolation.mjs
```

Use the read-only planner with explicit repository-relative changed paths:

| Tier | Trigger | Entry point |
|---|---|---|
| Focused | Documentation, one Skill, or another bounded behavior | `npm run verify:plan -- <changed-path>...`, then its ordered commands |
| Stable | Runtime, cross-cutting, unknown, or higher-risk work; every PR and `main` push | `npm run check`, plus hosted exact-SHA matrix evidence |
| Release | Release-sensitive bytes or an immutable candidate | `npm run release:candidate`, `npm run release:ci`, and isolation as required |

`npm run check` runs tests, lint, format, and package selection. `release:candidate` creates and inspects one real tarball without
publishing; `release:ci` combines Stable verification with that gate. `npm run release:check` additionally performs
`npm publish --dry-run --json` and is a separate registry-evidence boundary, not publication permission.

Hosted PR CI proves actual-head behavioral jobs across every supported OS/runtime, runs platform-independent lint, format, and
package selection once in a quality job, and keeps packed bytes separate. Synthetic merge compatibility runs the complete
combined-state check; `main` jobs prove the exact event SHA. Model-backed evaluators are development-only, explicit-cost checks
and never required by public CI. Validation, evaluator, isolation, and credential boundaries are described in
[ARCHITECTURE](docs/ARCHITECTURE.md).

## Repository map and contributing

- `skills/`: five packaged reasoning workflows and focused references.
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
