# PR Delivery and Merge

Use the shared `kyw-task/scripts/task-artifacts.mjs` dispatcher for the selected Task and action. Inspect repository status, branch, remote, scope, evidence, and existing PR before changing external state. Preserve unrelated user changes and legacy historical records.

## PR action

`$kyw-deliver NNNN` authorizes the selected outcome's branch, related commit, non-force push, and PR creation/update. Confirm local acceptance and required validation, commit only related paths, push the intended branch to the verified repository, then create or update one matching PR. Report the real CI status, including pending or unavailable checks. Do not automatically merge, dispatch deployment, publish npm, create tags, or create Releases.

Do not repeat completed commits, pushes, or PR creation on resume. Compare exact remote state. A network outage may block the PR action while leaving completed local work intact.

## Merge action

`$kyw-deliver NNNN --merge` requires a ready PR in the intended repository, explicit merge authority, current exact-head CI and review/mergeability evidence, and satisfied effective protection rules. Preserve distinct actual-head, synthetic merge compatibility, and post-merge main evidence. Use the expected head when merging, without bypass/admin override or force.

Use the shared adapter's read-only `check-ci --repository <owner/name> --sha <sha> --branch <branch> --event <pull_request|push>` command for current canonical CI proof. It uses the same selected-job policy as the publish gate. For a PR use its actual head SHA and branch, adding `--head-repository <owner/name>` from the freshly inspected PR head repository (including a fork). This proves the CI source and exact SHA; it does not identify the selected PR number or prove its base/head relationship. Recheck the selected PR number, repository, base, and head before the expected-head merge, together with review, mergeability, and protection. After merge use the exact main SHA with `--branch main --event push`; push and publication evidence must come from the repository itself. Historical role contracts remain separate.

If the PR head, repository, base, or approved scope changes, resolve that boundary before merging. Missing or ambiguous permission/check state blocks this merge only. After success, observe the exact merged main SHA and report CI. Merge does not authorize release.

## External failure and recovery

Bound transient reads; do not retry authentication or invalid requests indefinitely. After an ambiguous write response, query the exact branch/PR/merge state. Skip an effect already completed. Retry a write only when non-execution is established and current authorization is still valid. An exit code or immediate 404 alone does not establish non-execution.

Historical exact-SHA delivery and continuity queries are compatibility tools, not prerequisites for independent local development. Preserve historical SHAs and immutable contract-3/4 artifacts; do not rewrite past evidence to fit the current action.
