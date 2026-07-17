---
name: kyw-init
description: Initialize, adopt, or intentionally rebaseline a project's four durable kyw-dev documents. Use only when the user explicitly invokes $kyw-init for project discovery and documentation; do not use for ordinary prompts, application implementation, or bulk Task creation.
---

# kyw Init

## Inputs and authority

Use the repository containing the current working directory unless the explicit `$kyw-init` invocation names another target. Treat an optional project brief, redesign goal, or rebaseline request as context, not as permission to skip inspection or confirmation.

Limit final mutations to:

- `README.md`
- `AGENTS.md`
- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`

Creating `docs/` solely to hold the last two files is inside this boundary. Do not modify application code, configuration, tests, package metadata, existing numbered Tasks, or any other path. Do not create proposed Task directories.

## Phase 1 - Inspect without writing

1. Resolve the target repository and applicable repository instructions.
2. Inspect existing files with read-only operations before asking questions. Prefer focused searches and metadata over broad file dumps. Inspect, when present:
   - the four durable document paths and nearby documentation;
   - source and test layout, manifests, lockfiles, runtime declarations, and exact contributor commands;
   - configuration names and secret-handling guidance without exposing secret values;
   - components, dependency directions, storage, external interfaces, and deployment clues;
   - current version-control status and relevant diff when available;
   - existing Task directory names only as needed to make later recommendations.
3. Separate established repository facts from unresolved durable decisions. Record the source of each important fact internally; never ask the user to repeat a fact that inspection can establish.
4. Classify the run and explain the evidence:
   - `new`: little or no application implementation exists and the kyw-dev document contract is absent.
   - `adopt`: meaningful implementation exists, but the document contract is absent or incomplete and no intentional replacement was requested.
   - `rebaseline`: an existing kyw-dev baseline or established design exists and the invocation intentionally requests replacement or reconciliation.
5. Treat ambiguous replacement intent as a decision. Never infer permission to rebaseline solely because existing documents are incomplete, stale, or inconvenient.
6. Identify useful existing sections, incompatible claims, duplicate ownership, and content that must be preserved verbatim or relocated only with approval.

Do not create, edit, rename, move, or delete files during inspection or interviewing. In particular, do not create `docs/` as a pre-confirmation marker.

## Phase 2 - Grill durable decisions

Apply the installed `$kyw-grilling` protocol as this wrapper's interview phase. Preserve its dependency ordering, one decision question per turn, recommended answer with concise reasoning, fact inspection, user-owned decisions, and wait after every question. Its standalone no-write completion returns control to this wrapper; it does not cancel the materialization authority that `$kyw-init` receives only after the confirmation below.

Grill only durable decisions needed to write accurate project documents. Typical branches include purpose and users, visible behavior and non-goals, domain rules, quality constraints, component boundaries, storage or external interfaces, supported environments, and contributor workflow. Skip branches already settled by inspected facts or explicit user context.

When no answerable decision remains, present one shared-understanding summary containing:

- the proposed mode and repository evidence;
- settled decisions and explicit remaining unknowns;
- conflicts and the proposed resolution for each;
- a per-document create/minimal-update/preserve plan;
- the exact four-path mutation boundary;
- an ordered, session-sized Task decomposition as recommendations only.

Ask the user to confirm that summary and write plan explicitly, recommend correcting any mismatch first, and wait. The initial invocation, an earlier general approval, or agreement with one interview answer is not confirmation of the final summary. If the user changes any material decision, revise the summary and ask for confirmation again.

## Phase 3 - Materialize the confirmed baseline

Proceed only after explicit confirmation of the current summary.

1. Re-read the four target paths and relevant version-control diff immediately before editing. If any inspected document changed during the interview, stop, explain the difference, reconcile it through the interview, and obtain confirmation again.
2. Use `templates/project/{README,AGENTS,SPEC,ARCHITECTURE}.md` from the kyw-dev package as the canonical section contract when accessible. Treat templates as responsibilities and authoring guidance, not as text to paste blindly.
3. For an absent document, create complete project-specific content from inspected facts and confirmed decisions. For an existing document, make the smallest semantic update that satisfies its responsibility:
   - preserve unrelated user-authored sections and stable wording;
   - avoid wholesale reformatting, heading churn, or section reordering;
   - reconcile conflicting claims explicitly instead of silently selecting one;
   - do not erase an unknown section merely because it is absent from a template.
4. Keep document ownership clear:
   - `README.md`: purpose, prerequisites, setup, exact commands, configuration, usage, concise repository map, and links to Spec and Architecture.
   - `AGENTS.md`: source-of-truth routing, substantial-versus-small Task rule, documentation-impact routing that also applies to ordinary small changes, repository verification commands, and the completion gate.
   - `docs/SPEC.md`: goals, non-goals, user-visible behavior, domain rules, functional and quality requirements, acceptance criteria, and explicit unresolved decisions.
   - `docs/ARCHITECTURE.md`: system context, component responsibilities, module/dependency boundaries, data/control flow, storage/external interfaces, cross-cutting constraints, and important trade-offs.
5. Keep a newly generated `AGENTS.md` below 4 KiB. When adopting, preserve compatible user rules and report when preservation prevents the 4 KiB target. Warn and obtain renewed confirmation before an edit would make `AGENTS.md` exceed 8 KiB; never delete user rules merely to meet the size target.
6. Resolve every template token and authoring comment. Do not leave `{{...}}`, template HTML comments, or unexplained unfinished markers. Record a genuine unknown as an explicit unresolved decision with its impact and owner rather than as a placeholder.
7. Apply changes only to the four allowed paths. Do not implement application functionality, alter existing Task evidence, or create any recommended Task.

If a write or verification step fails after materialization begins, stop and report the exact paths that changed, the incomplete paths, and the safest recovery action. Do not claim the documents are synchronized.

## Verification and output

After writing:

1. Re-read all four documents and verify they exist, are project-specific, have no unresolved template artifacts, and agree on shared facts.
2. Measure `AGENTS.md` in bytes and apply the 4 KiB target and 8 KiB warning rule.
3. Inspect the final changed-path list and relevant diff. Confirm that only the four allowed paths changed, preserved sections remain, and no numbered Task or application file was created or modified.
4. Report the selected mode, files created or minimally updated, preserved sections, conflict resolutions, remaining unknowns, and recommended first Tasks. Report checks actually performed and any residual risk.

Stop without mutation when the user declines or never gives final confirmation, when replacement intent remains ambiguous, when an existing conflict cannot be resolved safely, or when access is insufficient. Stop after the verified durable documents and Task recommendations; do not continue into implementation.
