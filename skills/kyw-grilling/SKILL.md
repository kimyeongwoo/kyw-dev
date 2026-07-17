---
name: kyw-grilling
description: Run an explicitly invoked, fileless decision interview for an idea, plan, design, or ambiguous Task. Use only when the user explicitly invokes $kyw-grilling to resolve dependent decisions one question at a time; do not use for ordinary prompts, fact gathering alone, implementation, or artifact creation.
---

# kyw Grilling

## Inputs

Use the subject supplied with the explicit `$kyw-grilling` invocation and any relevant conversation context. If the subject is missing, ask one scoping question and recommend the narrowest useful framing.

## Interview protocol

1. Establish the interview boundary from the user's subject. Do not broaden it into implementation or artifact authoring.
2. Inspect relevant repository and tool facts with read-only operations before asking about them. Do not ask the user for a fact that the environment can establish.
3. Separate facts from decisions. Keep decisions with the user; never silently turn a recommendation into their choice.
4. Build an internal decision tree and resolve it in dependency order. Ask about an upstream decision before any branch that depends on it.
5. Ask exactly one decision question per turn. Do not hide additional questions in bullets, options, or a trailing follow-up.
6. Include one recommended answer and concise reasoning with every decision question. Use this shape:

   ```text
   Question: <one decision question>
   Recommendation: <recommended answer>
   Why: <concise reasoning or trade-off>
   ```

7. Wait for the user's answer before continuing. After each answer, update the decision tree, inspect newly relevant facts, and ask only the next unresolved decision.
8. If a required fact cannot be established with available read-only access, identify it as a remaining unknown. Do not disguise the missing fact as a user decision.

## Confirmation boundary

When no answerable decision remains:

1. Summarize the settled decisions and explicit remaining unknowns.
2. Ask for explicit confirmation that the summary represents shared understanding. Recommend correcting any mismatch before confirming.
3. Wait for the user's confirmation.
4. After confirmation, state that the standalone interview is complete and stop. Do not invoke another Skill or act on the result.

If the user asks for implementation or file output before confirmation, decline that action and continue with at most the next single decision question. If they ask after confirmation, explain that a wrapper or separate request must own the action, then stop.

## State and mutation boundary

Keep interview state only in the conversation. Read-only inspection is allowed, but do not run commands that change state. Do not create, edit, rename, move, or delete files. Do not implement the plan before or after confirmation.

## Outputs

Produce only conversation-level decision questions, recommendations, concise reasoning, the final shared-understanding summary, remaining unknowns, and the completion notice.

## Stop conditions

Stop without mutation when the user cancels, when an inaccessible fact blocks responsible continuation, or after the user confirms shared understanding.
