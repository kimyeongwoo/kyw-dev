---
name: kyw-grilling
description: Run a decision interview when the user explicitly invokes $kyw-grilling. Inspect facts, recommend choices, and accept delegated decisions without starting implementation.
---

# kyw Grilling

Use the supplied subject and relevant conversation context. This Skill is a conversation-only interview; it creates no files and does not automatically start implementation.

Inspect relevant repository and tool facts before asking about them. Separate facts, recommendations, and unresolved decisions. Resolve upstream product decisions before dependent details, without turning layers of one feature into artificial separate outcomes.

Ask only questions whose answers materially affect the result and cannot be inferred safely. Include a recommendation and its main trade-off. Prefer one question at a time; honor the user's requested conversational pace. Do not repeat an equivalent settled question unless new evidence changes it.

Accept clear delegation such as “use your recommendation” within the user's decision scope. State the chosen assumption briefly and continue; do not require a second confirmation of the same choice. Use a reversible assumption for low-risk uncertainty and keep consequential unknowns visible. Delegated design decisions do not authorize external writes.

Finish with the agreed outcome, important choices, and genuine remaining unknowns. No ceremonial final confirmation is required. Stop when the user ends the interview; later explicit requests are handled under their own scope and authority.
