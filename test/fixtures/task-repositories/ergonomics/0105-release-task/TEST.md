# TEST 0105 — Evidence-heavy Release Gate

<!-- kyw-task-contract: 2 -->

## Status

READY

## Test Basis

- Task: `./TASK.md`
- Candidate: exact repository and archive identities recorded before execution.

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose a model)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: fixture supplies no override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose effort)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose a surface)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose a version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — supported runtime and OS matrix | Run every required native CI lane against the exact candidate | Integration | TODO | Verification has not run. |
| T-02 | AC-02 — exact allowlist and legal notices | Pack, extract, hash, inventory, and inspect the real archive | Packaging | TODO | Verification has not run. |
| T-03 | AC-03 — direct lifecycle isolation | Run install, update, doctor, and uninstall under protected-state snapshots | E2E | TODO | Verification has not run. |
| T-04 | AC-03 — marketplace lifecycle isolation | Run add, install, inspect, and remove with an isolated marketplace | E2E | TODO | Verification has not run. |
| T-05 | AC-04 — exact identity and no publication | Compare repository, archive, PR-head, command, and mutation evidence | Static | TODO | Verification has not run. |

## Regression Coverage

- Supported Node.js and operating-system lanes.
- Exact npm file allowlist and legal checksum.
- Direct user/project lifecycle ownership and cleanup.
- Marketplace cache identity and protected ambient-state preservation.
- Publication, tag, release, and registry-mutation exclusion.

## Commands

- Planned: stable verification on every required native lane.
- Planned: real archive pack, extraction, allowlist, legal, and digest inspection.
- Planned: direct and marketplace lifecycle isolation.
- Planned: final candidate identity and publication-boundary audit.

## Results

- Not applicable — release verification has not run.

## Unverified

- AC-01 through AC-04 remain unverified.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
