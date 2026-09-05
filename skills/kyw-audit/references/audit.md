# Independent Task Audit

Establish the selected Task, source state, relevant diff, acceptance, existing evidence, and applicable document owners. New Tasks may keep verification in TASK; legacy TEST files remain valid inputs. Review scope, regressions, negative paths, data preservation, documentation drift, and whether the evidence supports the intended behavior.

## Read-only audit

Preserve original tracked, untracked, generated, cache, and Task bytes, and make no external writes. Read-only inspection needs no temporary copy. Tests may execute arbitrary code: run them only in an available constrained temporary environment whose tools enforce the permitted write root and network restrictions, without production secrets or deployment credentials.

An ordinary temporary copy is not a sandbox. Verify the actual isolation before running untrusted code. If enforcement is unavailable, skip the unsafe verification and report the limitation while completing safe inspection. Remove only a proved self-owned temporary root; never clean a broad repository, home, or shared cache.

The optional [sandbox verifier](../scripts/verify.mjs) uses an already available local Docker image, with no image pull, no network, a read-only root, dropped capabilities, and an unprivileged user. Supply an explicit reviewed file list, excluding embedded secrets as well as credential filenames; the local Docker daemon and image remain trusted. It mounts only its owned temporary copy. Invoke `node <skill>/scripts/verify.mjs <repositoryRoot> <localImage> '<files JSON>' <executable> [args]`. Missing Docker returns `UNAVAILABLE`; never fall back to executing the test on the host. Installing Docker is not an audit prerequisite.

## Explicit repair

For `--fix` or existing explicit repair authorization, state the finding and bounded change before editing. Fix only unambiguous work inside the approved scope, preserve unrelated user changes, run affected checks, and inspect the final diff. Propose consequential out-of-scope work without silently implementing it.

## Evidence and verdict

Give each actionable finding its affected path, consequence, and supporting evidence. Treat prior PASS statements as claims, checking their source/command/input context before reuse. Do not rerun unchanged successful verification without a concrete concern.

Report `PASS` only when available evidence supports the required acceptance and no blocking finding remains. Otherwise report `BLOCKED` with the missing evidence or recovery action. Separate code/mock verification from actual model behavior; unavailable isolation or a model run is never reported as tested.
