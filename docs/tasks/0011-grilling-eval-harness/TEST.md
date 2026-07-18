# TEST 0011 — Grilling Evaluation Harness

## Status

PASSED

## Test Basis

- Task: `./TASK.md`
- Product requirements: `../../SPEC.md`
- Architecture constraints: `../../ARCHITECTURE.md`

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 upstream baseline is immutable and attributed | Verify SHA, checksum, source metadata, and MIT notice | Supply-chain/Audit | PASS | Offline baseline test and exact-commit download agree on commit `9603c1cc...`, source SHA-256 `44331dda...`, and license SHA-256 `0e7ac423...`; packed notice preserves the MIT attribution. |
| T-02 | AC-02 scenario suite covers required decision patterns | Validate scenario schema and manually inspect coverage | Unit/Audit | PASS | Deterministic fixture validation passed for exactly eight requested categories, each with repository files/facts, dependent decisions, sequential replies, critical expectations, and budgets. |
| T-03 | AC-03 rubric is versioned and predeclared | Schema test and git-history/diff review | Unit/Audit | PASS | `kyw-grilling-rubric-v1` validates ten critical detectors, eight weighted dimensions totaling 100, and `frozenBeforeModelRuns: true`; it was unchanged after smoke execution. |
| T-04 | AC-04 runs are isolated, read-only, and leave fixtures unchanged | Run fixture hash/status checks before and after | Integration/Security | PASS | Fake mutation tests detect CV-01/CV-05; both real smokes used temporary Git/HOME/CODEX_HOME, one Skill, read-only sandbox, clean Git status, identical fixture hash `271b2005...`, and unchanged auth source. |
| T-05 | AC-05 multi-turn JSONL/session data is captured completely | Run a scripted smoke conversation and validate result schema | E2E | PASS | Both real four-turn smokes validated schema v1, retained the same explicit thread ID across three resumes, and published four JSONL files, four final messages, `run.json`, timestamps, version/model/config, and per-turn/aggregate usage. |
| T-06 | AC-06 deterministic components need no auth/network | Run unit suite with Codex auth/network unavailable | Unit | PASS | `npm run eval:grilling:unit` passed 13/13 using only local files, Git fixtures, and fake Codex; it invokes neither the real Codex model path nor network. |
| T-07 | AC-07 unavailable model execution fails explicitly | Run missing-Codex and missing-auth failure fixtures | Integration | PASS | Missing-command, missing-capability, fake missing-auth, opt-in, and actual temporary-home 401 paths fail nonzero and publish no result; authenticated runs succeed only with explicit `--auth-file`. |
| T-08 | AC-08 commands, costs, artifacts, and cleanup are documented | Execute documented smoke command and inspect cleanup | Audit | PASS | README commands worked for both variants and document the 4-turn smoke, `2 × scenarios × runs × 4` comparison cost, result paths, redaction, ignored retention, and unconditional temporary/auth cleanup. |
| T-09 | AC-09 eval-only files stay out of npm package | Inspect `npm pack --dry-run --json` | Packaging | PASS | Pack check and direct dry run report the existing 29-file allowlist with zero eval/script/test/result additions and both required legal files present. |

Every acceptance criterion must reference one or more rows before the Task becomes `READY`. Add rows for meaningful behaviors discovered in the final diff.

## Regression Coverage

- [x] Existing `npm test`, lint, format, pack, and check commands remain green.
- [x] Existing Skill/package contents remain byte-for-byte unaffected except for intentional metadata or documentation changes.
- [x] The normal user `CODEX_HOME`, `~/.agents/skills`, and repository working tree are unchanged after eval smoke runs.
- [x] No auth file, API key, raw home path, or sensitive transcript is committed.
- [x] Generated eval output can be safely deleted without affecting source fixtures.

## Commands

Verified command forms; model-backed commands require intentional placeholder substitution and shell-appropriate quoting.

- `codex --version`
- `codex exec --help`
- `codex exec resume --help`
- `npm test`
- `npm run eval:grilling:unit`
- `npm run eval:grilling:smoke -- --allow-model --variant kyw --scenario <id> --model <model> [--auth-file <path>|--use-env-api-key]`
- `npm run eval:grilling:smoke -- --allow-model --variant upstream --scenario <id> --model <model> [--auth-file <path>|--use-env-api-key]`
- `npm run eval:grilling:compare -- --allow-model --scenario <id|all> --model <model> --runs <n> [--auth-file <path>|--use-env-api-key]`
- `npm run check`
- `npm run release:ci`
- `npm pack --dry-run --json`
- `git status --short`

## Results

Record exact Codex/model configuration, commands, exit status, result directory, fixture hashes, and concise outcome. Do not record credentials.

- Pre-implementation inspection: `codex --version` exited 0 with `codex-cli 0.144.5`; `codex exec --help` and `codex exec resume --help` exited 0 and exposed JSONL, final-message, read-only sandbox, isolated-config, and explicit session-ID resume support.
- Upstream verification: `git ls-remote https://github.com/mattpocock/skills.git refs/heads/main` resolved `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`; streaming the exact-commit raw Skill and license through SHA-256 produced `44331dda57f461db4fec3f2efb6ddabe7aaaa0a57ae0f88a883bc61aed8a0587` and `0e7ac423bf2c6e223b7c5b156f8cf72da49d748e56a1641402c31f22ad07dbb5`. The local upstream license copy matched the latter exactly.
- Auth preflight inspection: `codex login status` exited 0 and reported ChatGPT login; a normal file-based auth source exists, while `CODEX_API_KEY` and `CODEX_ACCESS_TOKEN` are absent. No credential contents or hashes were printed or recorded.
- Initial focused `node --test test/grilling-eval.test.mjs`: exit 1 with 9/11 passing. Windows exposed two local runner defects: `copyFileSync` treated a POSIX permission as a copy flag, and non-recursive `rmSync` could not remove an empty directory. Replacing the copy flag with post-copy `chmod` and using `rmdirSync` fixed both; the immediate rerun passed 11/11.
- First actual no-auth command published no result but exited `CODEX_EXEC_FAILED` before auth because the Windows npm PowerShell shim interpreted the runner's `-c` argument. Resolving and invoking the installed Codex Node entrypoint directly fixed the shell boundary; focused tests remained 11/11.
- Actual unavailable-auth smoke, `npm run eval:grilling:smoke -- --allow-model --variant kyw --scenario existing-code-facts --model gpt-5.6-luna`: exit 1 with `AUTH_UNAVAILABLE` after HTTP 401 in the temporary Codex home; `eval/grilling/results` did not exist afterward.
- Authenticated kyw smoke used an explicitly named source copied only into temporary `CODEX_HOME`: exit 0, result `20260717042155252-kyw-existing-code-facts-49403a40`, status `completed`, four turns on one thread, fixture before/after SHA-256 `271b20056caff884539caa3255d2372ecded6962015314bcb62be1e0740f8344`, clean Git status, one Skill, unchanged auth source, nine artifacts, and usage 528,715 input / 457,216 cached input / 4,641 output / 1,338 reasoning-output tokens.
- Authenticated upstream smoke used the exact same scenario/model/config and explicit temporary auth copy: exit 0, result `20260717042308944-upstream-existing-code-facts-afbab07a`, status `completed_with_violations`, four turns on one thread, the same unchanged fixture hash and clean Git status, one Skill, unchanged auth source, nine artifacts, and usage 325,601 input / 291,328 cached input / 4,575 output / 1,284 reasoning-output tokens. Its six rubric violations are retained in the ignored result but are not interpreted or used to tune Task 0011 sources.
- Independent artifact validation parsed both `run.json` files, confirmed version `codex-cli 0.144.5`, model `gpt-5.6-luna`, persisted read-only resume config, usage, fixture/auth invariants, and zero sensitive-pattern findings across all 18 artifacts. `git check-ignore -v eval/grilling/results` matched the root ignore rule.
- Final `npm run eval:grilling:unit`: exit 0; 13/13 passed after adding explicit wrong-thread and two-variant atomic-comparison coverage. The successful fake comparison is descriptive only and requires no model or network.
- First full `npm run check`: exit 1 with 91/92 passing because Node's default discovery also ran the fake executable with no CLI arguments. Making that discovery path exit harmlessly fixed the fixture without changing runner behavior.
- Repeated `npm run check`: exit 0; 92/92 tests, lint over 29 modules, format over 129 source text files, and the exact 29-file/48,098-byte package check passed. Ignored model results were excluded from lint/format source discovery.
- Direct `npm pack --dry-run --json`: exit 0; 29 files, 48,098 packed bytes, zero `eval/`, grilling-runner, test, Task, result, or `.gitignore` paths, and both `THIRD_PARTY_NOTICES.md` and `licenses/mattpocock-skills-MIT.txt` present.
- `npm run release:ci`: exit 0; repeated the complete stable gate and created/extracted/inspected a real 29-file, 48,098-byte tarball with SHA-256 `245830546b39f9d44ff956bfaa4fdcc138115b19ce8030729f1eb9bc0ad87b41`. No publish command ran.
- Final scope/security review: 28 Task-owned paths; `git diff --check` exited 0; `skills/kyw-grilling/SKILL.md` has no diff and retains SHA-256 `8bc7fbc767f57a27f5346abb5e69a76103ddaf5b6209d4bde1ba82a395b8972d`; SPEC and AGENTS have no diff; Tasks 0012 through 0016 remain untracked; scoped secret/home-path scan found no committed value.

## Unverified

- Full parity comparison is intentionally deferred to Task 0012.
- Model-backed evidence is one Windows `codex-cli 0.144.5` smoke per variant on one scenario/model, not a statistical or cross-platform performance claim. Cross-platform deterministic coverage remains part of normal CI.

## Final Coverage Review

Before marking this Test `PASSED`:

- [x] Compare the final diff to the matrix.
- [x] Confirm each required scenario field is schema-validated.
- [x] Confirm a resumed conversation uses the original thread ID.
- [x] Confirm read-only runs produce no evaluated-repository diff.
- [x] Confirm deterministic tests pass with model execution disabled.
- [x] Confirm package contents remain minimal.
