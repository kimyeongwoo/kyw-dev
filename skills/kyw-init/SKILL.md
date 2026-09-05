---
name: kyw-init
description: Initialize, adopt, or reconcile project documentation when the user explicitly invokes $kyw-init. Preserve useful existing documents and create only the missing documentation the project needs.
---

# kyw Init

Inspect applicable instructions, the current request, existing project documents, relevant source/tests, and exact setup commands. Use targeted reads and widen them when conflicting or insufficient facts require it. Existing documents remain authoritative unless the user has requested a change.

Explain briefly whether the work initializes a new project, adopts existing documentation, or reconciles a requested redesign. Ask only about consequential unresolved decisions; accept the user's approved direction and internal design delegation. Do not require an interview, four-file generation, or repeated write-plan confirmation.

Use `templates/project/` as optional responsibility guides. Create or minimally update only necessary project documentation, normally:

- `README.md`: setup, commands, configuration, and usage.
- `AGENTS.md`: concise repository-specific Codex instructions.
- `docs/SPEC.md`: durable product requirements and acceptance.
- `docs/ARCHITECTURE.md`: components, dependencies, and system flows.

A useful existing README or other owner may already satisfy the need. Do not create empty mirrors or sections to satisfy a template. Preserve unrelated sections and user edits. Keep meaningful unknowns explicit rather than fabricating facts. The default initialization scope excludes application implementation, package/configuration changes, and Task creation.

Recheck affected paths before writing and reconcile concurrent user changes without overwriting them. Verify the changed documents against inspected facts, actual commands, and each other; resolve template placeholders only in documents created from templates. Report changed files, remaining decisions, and actual checks. Continue additional work only when the user's request already authorizes it.
