# Offline evaluator contracts

The grilling and audit evaluators record the requested model and reasoning effort. They do not discover model capabilities or select substitute settings. Every model command still requires explicit cost/auth authorization; none of the offline regression fixtures establishes real model support or behavior.

## Inputs and reports

```bash
node ./scripts/grilling-eval.mjs report --comparison <directory> --benchmark <file>
```

Both explicit relative paths resolve from the caller's current working directory. The named benchmark bytes are used as supplied and their SHA-256 is recorded in `benchmarkConfigSha256`. Omitting `--benchmark` retains the repository's `benchmark.v11.json`: the historical fixed `gpt-5.6-luna` / `high` experiment, not a current-model default. `--comparison` and `--benchmark` are report-only; smoke/compare reject them.

A separately declared benchmark can select fewer scenarios or repetitions if it satisfies the existing scenario, rubric, thresholds, run order/count, configuration, and original-artifact checks. The reporter does not generate a benchmark from results, adjust acceptance thresholds, or upgrade its result schema version. A benchmark declaring result v3 rejects result v4. Missing or malformed benchmark files and mismatched summaries/artifacts remain errors.

`--reasoning-effort` accepts a nonempty ASCII token beginning with a letter or digit, followed by letters, digits, `_`, or `-`. The parser and direct runners share this syntax. Whitespace, control characters, quotes, and backslashes are rejected before execution. Accepted strings, including `max`, `ultra`, and case-sensitive custom tokens, are passed unchanged in the initial command and every grilling resume. Syntax acceptance is not a claim that Codex or a model supports the setting. Codex rejection is reported with the original redacted diagnostic; there is no effort conversion or fallback retry. Audit has one invocation and no resume path.

## Configuration evidence and compatibility

| Surface | Configuration meaning | Compatibility |
| --- | --- | --- |
| Grilling result v1-v3 and report v1 | Historical `model`, `reasoningEffort`, and `exactModel`/`exactReasoningEffort` retain their original requested-value meaning | Original readers, schema digests, report bytes, and conflict checks are retained; no disk migration |
| New grilling result v4 and summaries | Existing model/effort aliases plus `configurationProvenance` | Requires `result.schema.v4.json` and an explicitly compatible benchmark |
| Report v2 for result v4 | `requestedModelMatches` and `requestedReasoningEffortMatches` compare evaluator inputs with the declared benchmark | These checks do not verify an observed model or server snapshot |
| Audit output | Existing `model`/`reasoningEffort` remain requested aliases; `configurationProvenance` is added | Existing consumers can retain their fields |

`configurationProvenance.requested` contains `model`, `reasoningEffort`, and `source`. Source is `cli` for parsed command options and `direct-call` for direct runner calls. Each report run preserves its own input source. The report's separate `configuration` describes the expected contract with `source: "benchmark"`; it does not replace the runs' requested values. Alias disagreement is invalid in v4.

`observed` and `serverExecution` each contain `status: "UNAVAILABLE"` with null `model`, `reasoningEffort`, and `source`. This version implements no observation collector. The v4 validator rejects populated or available observation claims, including copying requested values into them. An unavailable observation neither passes nor fails evaluated Skill behavior. Supporting observations in a future format will require independently sourced evidence and handling disagreements with requests.

The existing `codex.version` remains the version obtained by preflighting the launcher used for that run. It is not a Desktop version or proof of the server snapshot/effective effort. No user session database, global configuration, or private history is inspected for provenance.

The synthetic legacy oracle under `test/fixtures/grilling-eval-legacy/` records reports produced by the pre-change reporter. Fake launcher results and the oracle are mock test evidence only. Historical schema and benchmark files are immutable; new real model experiments require separately approved execution and a predeclared compatible benchmark.
