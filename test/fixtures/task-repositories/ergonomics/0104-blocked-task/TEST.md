# TEST 0104 — Blocked Database Compatibility Check

<!-- kyw-task-contract: 2 -->

## Status

BLOCKED

## Test Basis

- Task: `./TASK.md`

## Model Provenance

- Model identifier: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose a model)
- Requested model alias: `NOT_REQUESTED` (`OBSERVED`: fixture supplies no override)
- Reasoning effort: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose effort)
- Codex surface: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose a surface)
- Codex version: `UNAVAILABLE` (`UNAVAILABLE`: fixture does not expose a version)

## Intent-to-Test Matrix

| ID | Intent / acceptance criterion | Method | Level | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | AC-01 — legacy migration preserves data | Run migration and checksum comparison on the required engine | Integration | BLOCKED | Required legacy engine fixture is unavailable; no substitute proves AC-01. |

## Regression Coverage

- Current supported-engine migrations remain unchanged.

## Commands

- Planned: `node --test test/legacy-migration.test.mjs`

## Results

- The required command could not run because the legacy engine fixture is unavailable.

## Unverified

- AC-01 remains blocked until the required engine fixture exists.

## Final Coverage Review

- [ ] Compare the final diff to the matrix.
- [ ] Map every acceptance criterion to one or more test rows.
- [ ] Add coverage for introduced branches, failures, and compatibility behavior.
- [ ] Confirm PASS evidence is reproducible.
- [ ] Confirm required regressions ran.
