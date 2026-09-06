# Public Release and Resume

This procedure is only for maintaining `kimyeongwoo/kyw-dev`, through `$kyw-deliver --release <version> --sha <sha>` with current explicit release authorization. It publishes a prepared version and exact merged main SHA, potentially containing several Tasks. It neither chooses/bumps a version nor merges an unfinished PR. Standalone hydration, the release runner and the actual publisher/tag/Release mutators reject another repository before writing. Historical tuple readers retain their compatibility; they do not authorize a publisher for another project.

For a different project's deployment request, use that project's existing procedure within the current authorization. If the procedure cannot be established, report that external-action limit while preserving completed local work. Do not implicitly apply this npm publisher or create new OIDC/provider infrastructure.

Use the shared Task adapter's `public-release --repository-root <repo> --invocation '$kyw-deliver --release <version> --sha <sha>'` operation at its resolved installed/package path. The `dispatch` operation with the same arguments previews the plan without external writes. Neither operation needs a Task directory. Keep the supplied invocation within the user's established release scope.

Validate repository, main ancestry/target, package/plugin version, clean source, packed inventory and digests, existing registry version/history, publisher workflow/environment, and current trusted signing keys. Read keys by their keyid; multiple valid keys are supported. Keep a previously frozen historical tuple unchanged.

The release action orders npm publication → exact-SHA GitHub tag → GitHub Release. Use the repository-owned manual OIDC workflow for npm. Before its actual publish command, that workflow independently verifies canonical CI identity, exact main-push SHA, authoritative latest run/attempt, and successful required aggregate coverage. A supplied boolean or unrelated success is insufficient.

Before each write, freshly inspect all relevant surfaces. `ABSENT` permits the authorized create; `EXACT_ALREADY_COMPLETE` skips it; `PENDING_PROOF` permits bounded observation; `CONFLICT` and `UNKNOWN` block. Verify complete signatures, integrity, gitHead, provenance, workflow attempt, exact tag target, and Release identity before reporting completion. Preserve minimal permissions, concurrency controls, digest bindings, redaction, and version conflict checks.

Distinguish completed, proven-not-executed, and ambiguous write results. On uncertainty, read the exact target and avoid duplicate effects. A previous failed run is not a permanent ban: a safe fresh attempt requires proof that failure occurred before publishing, the package remains unpublished, and current authorization still applies. Do not automatically republish an ambiguous npm result or use alternate credentials, force, deletion, dist-tag changes, or protection bypass.

These checks observe remote state before mutation; they do not make API reads and publishing atomic or constrain administrators publishing elsewhere. Report that boundary honestly. Release failure does not demote completed local Tasks or rewrite historical evidence.
