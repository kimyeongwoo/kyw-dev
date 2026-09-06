# Independent Audit

Use the shared adapter: `node <skill-root>/kyw-task/scripts/task-artifacts.mjs dispatch --repository-root <repositoryRoot> --invocation '$kyw-audit'`. Pass the exact invocation, including an optional Task ID and `--fix`. The adapter selects a Task or returns the current-request route; selection does not prove scope, permission, acceptance, or sandbox enforcement.

Establish source state, relevant diff, acceptance, existing evidence, and applicable document owners. For an ID, read the selected Task and any relevant dependencies; new Tasks may keep verification in TASK, and legacy TEST files remain valid inputs. Without an ID, establish scope from the current request, diff, branch, and existing PR when relevant. Missing Task folders, unrelated inventory errors, or Task transactions are not prerequisites; do not create a placeholder Task. Preserve mixed user changes and coordinate conflicting edits. If inspection cannot resolve an ambiguous scope, hold only the affected repair or external action and continue independent safe review.

Both routes use the same review: scope, regressions, negative paths, data preservation, documentation drift, and whether evidence supports the intended behavior. Audit is an explicit tool, not an automatic step after every implementation.

## Read-only audit

Preserve original tracked, untracked, generated, cache, and Task bytes, and make no external writes. Read-only inspection needs no temporary copy. Tests may execute arbitrary code: run them only in an available constrained temporary environment whose tools enforce the permitted write root and network restrictions, without production secrets or deployment credentials.

An ordinary temporary copy is not a sandbox. Verify the actual isolation before running untrusted code. If enforcement is unavailable, skip the unsafe verification and report the limitation while completing safe inspection. Remove only a proved self-owned temporary root; never clean a broad repository, home, or shared cache.

The optional [sandbox verifier](../scripts/verify.mjs) uses an already available local Docker image, with no image pull, no network, a read-only root, dropped capabilities, and an unprivileged user. Supply an explicit reviewed file list, excluding embedded secrets as well as credential filenames; the local Docker daemon and image remain trusted. It mounts only its owned temporary copy. Invoke `node <skill>/scripts/verify.mjs <repositoryRoot> <localImage> '<files JSON>' <executable> [args]`. Missing Docker returns `UNAVAILABLE`; never fall back to executing the test on the host. Do not automatically install Docker or pull an image; installing Docker is not an audit prerequisite.

The verifier retains `status`, `executed`, and output fields, with `verificationOutcome`, `attempted`, `completed`, and `exitCode` to distinguish confirmed command success/failure from `UNEXECUTED` or `UNKNOWN` verification. `executed: false` with `UNKNOWN` means execution could not be confirmed; it does not assert that no code started. Docker's reserved startup statuses are not test failures ([Docker exit-status contract](https://docs.docker.com/engine/containers/run/#exit-status)). A nonzero check is evidence to investigate, not automatically a product defect. The verifier does not decide whether that check is required by this work's acceptance.

## Explicit repair

For `--fix` or existing explicit repair authorization, state the finding and bounded change before editing. Fix only unambiguous work inside the approved scope, preserve unrelated user changes, run affected checks, and inspect the final diff. Propose consequential out-of-scope work without silently implementing it.

## Evidence and verdict

Give each actionable finding its affected path, consequence, and supporting evidence. Treat prior PASS statements as claims, checking their source/command/input context before reuse. Do not rerun unchanged successful verification without a concrete concern.

Report these four dimensions explicitly, using the labels below or their translated equivalents:

- **Findings / 판단:** concrete blocking defects with their evidence, or no blocking defect found in the inspected scope. Keep missing evidence distinct from an observed defect.
- **Verification / 검증:** commands actually performed, inputs and results, and separately identified reused evidence with its applicable source/command/input context.
- **Limitations / 한계:** unexecuted or uncertain checks, the reason, and whether each is required or optional under the existing acceptance. State when there are none.
- **Completion impact / 완료 영향:** which local completion, merge, or release condition remains held for a defect or missing required evidence, or why an optional limitation leaves existing required evidence sufficient.

Retain `Verdict: PASS` only when available evidence supports required acceptance and no blocking finding remains. Otherwise retain `Verdict: BLOCKED`, naming whether the cause is a demonstrated defect or missing required evidence and the recovery action. Optional additional checks that cannot run do not automatically block all work or require another audit. Do not reclassify a required check as optional because it is unavailable, or treat an unexecuted check as success or failure. Preserve confirmed implementation and verification when a later condition remains held; do not reset a Task unnecessarily.

Separate code/mock verification from actual model behavior; unavailable isolation or a model run is never reported as tested. No time or token savings are implied by these instructions.
