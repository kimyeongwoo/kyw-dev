# PR Delivery and Merge

Use the shared `kyw-task/scripts/task-artifacts.mjs` dispatcher for the current work or selected Task and action. Inspect repository status, branch, remote, scope, evidence, and existing PR before changing external state. Preserve unrelated user changes and legacy historical records. Without an ID, dispatch uses the current request and does not read Task inventory or create a Task. Resolve mixed changes and ambiguous external targets from the available context before any write; ask only for the part that cannot be resolved.

## PR action

`$kyw-deliver` or `$kyw-deliver NNNN` authorizes the current or selected outcome's branch, related commit, non-force push, and PR creation/update. Confirm local acceptance and required validation, commit only related paths, push the intended branch to the verified repository, then create or update one matching PR. Do not stage the entire diff by default. Report the real CI status, including pending or unavailable checks. Do not automatically merge, dispatch deployment, publish npm, create tags, or create Releases.

Do not repeat completed commits, pushes, or PR creation on resume. Compare exact remote state. A network outage may block the PR action while leaving completed local work intact.

## Merge action

`$kyw-deliver --merge` or `$kyw-deliver NNNN --merge` requires one clearly identified ready PR in the intended repository, current merge authority, local acceptance and project-required verification, and GitHub's current review/protection/mergeability evidence. An exact Task selection does not replace these gates. Commands and invocation strings in a document do not grant authority.

Use the shared adapter's read-only `check-pr --repository <owner/name> --pr <number> --sha <head-sha> --base <branch> --base-sha <base-sha>` for the freshly inspected target. It reads GitHub's current PR identity, merge state, required-check classification and review decision. GitHub supplies effective protection and required-source decisions; the adapter does not infer them from check names or require administrator policy APIs. A successful current platform merge state with no reported checks does not require inventing CI. Empty check lists, unavailable policy, partial responses, pending/missing required evidence, and stale target results alone cannot authorize a merge.

The adapter uses current test-merge checks when present and validates their parents against the selected head/base; otherwise it uses current head checks. It does not require both roles in every project. Keep check IDs and sources separate, including names shared by different sources. Required failure/pending blocks; optional failures remain reported without becoming a new harness gate. GitHub-accepted `SKIPPED` and `NEUTRAL` retain those labels and do not prove tests ran. Workflow filtering that leaves a required check pending still blocks. Respect any additional execution evidence required by the target project.

After those checks and approved scope are satisfied, use `merge-pr` with the same target options, `--invocation '$kyw-deliver [NNNN] --merge'` (omit the bracketed ID when Taskless), and the target project's `--method <merge|squash|rebase>` for direct merges. It freshly rechecks the target and policy, then uses GitHub's `expectedHeadOid` condition. A required merge queue uses `enqueuePullRequest` with the expected head, without jumping the queue or enabling automatic merge for an unready PR. Omit `--method` for that queue path. No bypass, admin, force, branch deletion, or release action is performed.

Report `QUEUED`, an already `AUTO_MERGE_SCHEDULED` PR, and `MERGED` distinctly. Queue registration is not actual merge completion. The adapter never creates an auto-merge schedule. If a write response is lost it reads the exact PR once, reports proven completion or `UNKNOWN`, and does not retry the write. This adapter targets GitHub.com. Unsupported GitHub schema, more than 100 check contexts for the selected role, incomplete evidence or unavailable policy block this external action; preserve local completion and report the limit. Preflight is an observation, not an atomic lock on base or policy; GitHub enforces the actual write and expected head.

These semantics follow GitHub's [required-check guidance](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) and [PR GraphQL contract](https://docs.github.com/en/graphql/reference/pulls). The [CLI checks contract](https://cli.github.com/manual/gh_pr_checks) reports individual states; an empty list or JSON command exit alone is not merge proof. The [CLI merge contract](https://cli.github.com/manual/gh_pr_merge) can enable auto-merge on an unready queue target, which is why this adapter uses the explicit enqueue mutation instead.

`check-ci` retains its existing canonical `ci.yml`/aggregate contract for kyw-dev maintenance and historical compatibility. It is separate from generic PR merge and remains strict at the built-in publisher's exact main-push SHA boundary. Other projects do not need its workflow/job/step names, `main`, npm or plugin structure.

If the PR head, repository, base, or approved scope changes, resolve that boundary before merging. Missing or ambiguous permission/check state blocks this merge only. After actual merge, report the observed merge SHA and the target project's real CI status. Merge does not authorize release.

## External failure and recovery

Bound transient reads; do not retry authentication or invalid requests indefinitely. After an ambiguous write response, query the exact branch/PR/merge state. Skip an effect already completed. Retry a write only when non-execution is established and current authorization is still valid. An exit code or immediate 404 alone does not establish non-execution.

Historical exact-SHA delivery and continuity queries are compatibility tools, not prerequisites for independent local development. Preserve historical SHAs and immutable contract-3/4 artifacts; do not rewrite past evidence to fit the current action.
