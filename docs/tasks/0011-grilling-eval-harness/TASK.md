# TASK 0011 — Grilling Evaluation Harness

## Status

DONE

## Goal

Create a reproducible, isolated evaluation harness that can compare `kyw-grilling` with a pinned Matt Pocock upstream `grilling` baseline across scripted multi-turn scenarios without modifying evaluated repositories.

## Dependencies

- `0010-continuous-integration`

## In Scope

- Pin the exact upstream `grilling` source revision used as the comparison baseline and preserve its MIT attribution.
- Add development-only scenario fixtures covering greenfield discovery, existing-code facts, conflicting requirements, migrations, multi-layer features, oversized requests, uncertain users, and pressure to start coding early.
- Define a machine-readable rubric for protocol compliance, decision coverage, dependency ordering, unnecessary questions, premature action, premature convergence, turns, and token usage.
- Implement an isolated local runner around current `codex exec` behavior, including JSONL capture and multi-turn `codex exec resume` where supported.
- Use a temporary Git repository, temporary `CODEX_HOME`, read-only sandbox, explicit Skill installation, and no normal user configuration.
- Separate deterministic parser/rubric tests from model-backed evaluations so normal CI never requires Codex credentials.
- Add npm scripts and concise developer instructions for smoke and comparison runs.
- Ensure eval fixtures, raw transcripts, credentials, and generated result artifacts are excluded from the published npm package unless explicitly required.

## Out of Scope

- Tuning or rewriting `kyw-grilling` based on results; that belongs to Task 0012.
- Running model-backed evaluations automatically on public pull requests.
- Committing Codex authentication files, API keys, raw private user configuration, or unredacted sensitive transcripts.
- Building a general-purpose agent-evaluation platform.
- Changing production CLI installation behavior.

## Acceptance Criteria

- [x] AC-01: The harness records an immutable upstream source revision, source path, checksum, and required MIT notice for the baseline.
- [x] AC-02: At least eight focused scenarios contain repository facts, unresolved decisions, scripted user replies, and expected critical behaviors.
- [x] AC-03: A versioned rubric defines critical violations and scored quality dimensions before benchmark results are observed.
- [x] AC-04: The runner creates isolated Git/Codex homes, installs exactly one evaluated Skill variant, uses read-only execution, and proves the evaluated fixture remains unchanged.
- [x] AC-05: Multi-turn runs capture the `thread_id`, resume the same session, store JSONL events, final assistant messages, usage, Codex version, model/config, and timestamps.
- [x] AC-06: Deterministic parsing, grading, redaction, and fixture tests pass without Codex authentication or network access.
- [x] AC-07: Model-backed execution is opt-in, fails clearly when authentication or required Codex capabilities are unavailable, and never invents results.
- [x] AC-08: The development docs explain exact commands, cost-sensitive run counts, generated-artifact locations, and cleanup behavior.
- [x] AC-09: `npm pack --dry-run` confirms development-only eval material does not unintentionally expand the public package.

## Plan

- [x] Inspect current `kyw-grilling`, upstream notices, Codex CLI version/capabilities, and package inclusion rules.
- [x] Pin and verify the upstream baseline without changing production Skill code.
- [x] Define the rubric, critical violations, result schema, and redaction rules.
- [x] Create eight or more bounded scenario fixtures with deterministic scripted replies.
- [x] Implement an isolated runner using JSONL output and session resume when verified by the installed Codex CLI.
- [x] Implement deterministic unit tests for parsing, scoring, isolation, failure reporting, and package exclusion.
- [x] Run one smoke scenario for each Skill variant when local authentication is available.
- [x] Document exact usage and update durable documents only if architecture or support claims changed.

## Decisions

- The upstream baseline must be pinned by commit SHA; comparing against a moving branch would make later results irreproducible.
- Raw model evaluation is a developer/release gate, not a required public-PR CI check.
- The harness must default to read-only and isolated operation. It may not reuse the normal user's project, `.agents`, or `CODEX_HOME` as writable evaluation state.
- Define grading rules before running the comparison to prevent tuning the rubric to a preferred outcome.
- Generated raw transcripts should be ignored by Git by default; commit only deliberately redacted fixtures or compact evidence required by the Task.

## Risks

- Codex CLI flags and session-resume behavior may differ by installed version and must be detected rather than assumed.
- Model nondeterminism means a single run is not proof of parity.
- An evaluator model can share biases with the evaluated model; critical protocol checks should be deterministic where possible and borderline quality judgments should remain reviewable.
- Transcripts and JSONL can contain repository paths or user configuration if isolation/redaction is incomplete.
- Running many scenarios can consume substantial time and model usage.

## Discoveries and Changes

- Pre-change repository inspection on 2026-07-17 found branch `task/0010-continuous-integration` at `018f18470caa7b2135cfba8e649ce378ece08721`. Task directories 0011 through 0016 are untracked user-authored content; only Task 0011 is in scope and Tasks 0012 through 0016 remain unread and untouched.
- The production `skills/kyw-grilling/SKILL.md` SHA-256 before implementation is `8bc7fbc767f57a27f5346abb5e69a76103ddaf5b6209d4bde1ba82a395b8972d`. Task 0011 will not tune or rewrite it.
- The pinned upstream baseline is `mattpocock/skills` commit `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`, source path `skills/productivity/grilling/SKILL.md`, 843 bytes, SHA-256 `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587`. The existing `licenses/mattpocock-skills-MIT.txt` is byte-identical to the license at that commit: 1,068 bytes, SHA-256 `0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5`.
- The installed `codex-cli 0.144.5` exposes `codex exec --json`, `--output-last-message`, `--sandbox read-only`, `--ignore-user-config`, `--ignore-rules`, and `codex exec resume <SESSION_ID>`. The runner must capability-check these observed interfaces instead of assuming them from version alone.
- Current official Codex guidance confirms that `CODEX_HOME` owns config, auth, logs, and sessions; repository/user Skills are discovered under `.agents/skills`; `shell_environment_policy.inherit=none` prevents environment leakage to tool subprocesses; non-interactive JSONL includes `thread.started` and `turn.completed`; and a session can be resumed by explicit ID.
- `package.json` uses an explicit `files` allowlist, root `.npmignore` and `.gitignore` are absent, and the existing pack check enforces an exact 29-file tarball. Evaluation sources under a new development-only top-level boundary will therefore stay unpacked, while generated results still need an explicit Git ignore rule.
- Normal Codex login is available through file-based ChatGPT authentication, while `CODEX_API_KEY` and `CODEX_ACCESS_TOKEN` are not set. The harness will never consume normal auth implicitly; an opt-in smoke may copy an explicitly named auth file into the temporary `CODEX_HOME`, verify the source stayed unchanged, and delete the copy with the temporary workspace.
- Rubric `kyw-grilling-rubric-v1`, its ten predeclared critical detectors, eight weighted dimensions, both JSON schemas, and all eight scenarios were committed to source before either model-backed smoke. The rubric did not change after model results were observed.
- The runner redirects `HOME`, `USERPROFILE`, `CODEX_HOME`, SQLite state, and temporary paths; installs one variant under the temporary user's `.agents/skills`; sets `shell_environment_policy.inherit=none`; starts with `--sandbox read-only`; resumes by explicit `thread_id`; redacts events/final messages in memory; verifies Git status plus before/after fixture hashes; and atomically publishes only complete artifacts.
- Windows npm exposes Codex through a PowerShell shim that misinterpreted the runner's `-c` argument when launched with `powershell -File`. The Windows launcher now resolves that shim's installed `@openai/codex/bin/codex.js` and invokes it directly with the current Node executable, preserving arguments without a shell.
- A real isolated no-auth run reached Codex and failed with HTTP 401 as `AUTH_UNAVAILABLE`, exit 1, with no `eval/grilling/results` directory. Explicitly copying the normal file-based auth source into each temporary Codex home then enabled one four-turn `gpt-5.6-luna` smoke for each variant; both resumed one thread, kept the fixture hash/Git status unchanged, installed one Skill, recorded usage, left the auth source unchanged, and published nine redacted artifacts with zero sensitive-pattern findings.
- The upstream smoke produced rubric violations, while the kyw smoke did not. Task 0011 records this honestly but makes no parity conclusion and changes neither prompt nor rubric; performance interpretation and tuning remain Task 0012 scope.
- Generated results are ignored under `eval/grilling/results/`, skipped by lint/format source discovery, and absent from the 29-file npm tarball. Capability/auth failures and incomplete comparisons remove staging and partial run output. No dependency or lockfile was added.

## Documentation Impact

- SPEC: Unchanged. The harness is development-only and creates no public product behavior or guarantee.
- ARCHITECTURE: Updated with the development-only eval boundary, isolation model, generated-artifact policy, package exclusion, and Codex JSONL/resume flow.
- README: Updated with working deterministic/smoke/comparison commands, explicit model/auth selection, cost-sensitive run counts, artifact paths, and cleanup behavior.
- AGENTS: Unchanged. Evaluation remains an opt-in development workflow and does not change the four stable repository-wide commands or completion rules.

Update these impact decisions before completion. `Reviewed` is not a reason to edit an unaffected document.

## Completed

- Read the four permanent documents, Task 0011 pair, completed Task 0010 dependency, current `kyw-grilling` files/tests/fixture, third-party notice and upstream license copy, package allowlist/checker, formatting/lint boundaries, and root ignore/lockfile state.
- Verified installed Codex version, non-interactive JSONL flags, explicit read-only sandbox, isolated-config flags, final-message output, and explicit-ID session resume through actual help commands and current official Codex guidance.
- Resolved and verified the immutable upstream source revision, raw source checksum, and byte-identical MIT license checksum without changing production Skill bytes.
- Added pinned baseline metadata and exact source bytes, preserved/expanded the packed MIT notice, froze rubric/schema version 1, and added eight synthetic multi-turn scenarios covering every requested category.
- Implemented the dependency-free isolated runner, deterministic parser/grader/redactor/validators, CLI cost/auth gates, atomic smoke/comparison publication, temporary-state cleanup, Windows Codex launcher, and ignored result boundary.
- Added 13 deterministic tests for baseline/scenario/rubric validation, JSONL parsing, grading, redaction, capability/auth failures, isolation, fixture mutation, thread discontinuity, comparison, opt-in behavior, and package exclusion. Fake-Codex tests require no real auth or network.
- Ran real no-auth failure and authenticated kyw/upstream smoke paths with `codex-cli 0.144.5` and `gpt-5.6-luna`; retained only redacted ignored local artifacts and compact operational evidence in `TEST.md`.
- Synchronized README, Architecture, third-party notice, package scripts, source-discovery exclusions, legal checksum validation, and the existing README regression assertion. SPEC and AGENTS remain unchanged by reviewed impact decision.
- Passed the complete 92-test stable gate, lint over 29 modules, format over 129 source text files, the exact 29-file package check, direct `npm pack --dry-run --json` exclusion audit, and the real packed release gate.
- Reviewed all 28 Task-owned paths against AC-01 through AC-09 and T-01 through T-09. `skills/kyw-grilling/SKILL.md` remains SHA-256 `8bc7fbc767f57a27f5346abb5e69a76103ddaf5b6209d4bde1ba82a395b8972d`; Tasks 0012 through 0016 remain untracked and untouched; no secret-shaped value or normal-home path was found in Task-owned source.

## Remaining

- None. Full statistical comparison, parity judgment, and any prompt tuning remain outside this Task.

## Resume Point

Task 0011 is complete. Local smoke artifacts remain ignored under `eval/grilling/results/` for deliberate review or individual deletion; they are not required source state.

## Blockers

- None. Explicit temporary auth copies enabled both required smoke runs, and the unavailable-auth path was also demonstrated without publishing a result.
