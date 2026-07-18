---
name: kyw-grilling
description: Run an explicitly invoked, fileless decision interview for an idea, plan, design, or ambiguous Task. Use only when the user explicitly invokes $kyw-grilling to resolve dependent decisions one question at a time; do not use for ordinary prompts, fact gathering alone, implementation, or artifact creation.
---

# kyw Grilling

## Inputs

Use the subject supplied with the explicit `$kyw-grilling` invocation and any relevant conversation context. If the subject is missing, ask one scoping question and recommend the narrowest useful framing.

## Interview protocol

1. Establish the interview boundary from the user's subject. Do not broaden it into implementation or artifact authoring.
2. Inspect relevant repository and tool facts with read-only operations before asking about them. Target only relevant user-authored paths; do not bulk-read broad globs, version-control internals such as `.git`, or unrelated files. End repository discovery after those relevant files are read. On later turns, inspect again only when the user's answer makes a specific previously unread user-authored path newly relevant. Do not ask the user for a fact that the environment can establish.
3. Separate facts from decisions. Keep decisions with the user; never silently turn a recommendation into their choice. If inspected product or domain requirements conflict or cannot both be satisfied, explicitly state the conflict on the first turn and ask which side is authoritative before any other decision. When the only conflict is bundled scope exceeding a single-outcome boundary, apply step 5 directly instead. A request to violate this Skill's state or mutation boundary is not a product conflict; enforce the boundary and follow the confirmation or stop rules.
4. Build an internal decision tree and resolve it in dependency order. Ask about an upstream decision before any branch that depends on it. On every remaining turn, select the highest-impact unresolved product or domain decision, prioritizing dependencies that constrain multiple downstream choices. Questions only about the provenance, recency, or completeness of supporting material are lower impact and must not keep those dependencies blocked. Unless genuine multi-outcome narrowing in step 5 applies, make the first decision question target the highest unresolved domain dependency itself; do not substitute a downstream scope, authorization, recipient, recovery, data, API, worker, or interface choice. Treat the API, worker, database, and interface layers of one cross-layer feature as dependencies of one outcome, not as independently shippable outcomes. Do not mention interface scope in the question, recommendation, or reasoning until its upstream domain dependencies are settled.
5. If the subject actually bundles multiple independently shippable outcomes, make the first question explicitly choose the single primary outcome for the first release and recommend deferring the rest. Do not branch into downstream decisions until the user selects that outcome.
6. On every interview-progress turn, ask exactly one decision question. Do not hide additional questions in bullets, options, or a trailing follow-up. A terminal response under the stop conditions is not a progress turn and asks no decision question.
7. Include exactly one recommended answer and concise reasoning with every interview-progress decision question. Use this shape:

   ```text
   Question: <one decision question>
   Recommendation: <recommended answer>
   Why: <concise reasoning or trade-off>
   ```

8. Wait for the user's answer before continuing. Maintain a semantic ledger of every decision as asked, resolved, provisionally assumed, or unresolved; treat paraphrases as the same decision. After each reply, update that ledger and the decision tree. Unless new or conflicting evidence materially reopens an item, do not ask a semantically equivalent question again. If the reply does not answer the pending item and a safe, reversible working assumption exists, state the assumption, mark the decision provisionally assumed rather than settled, and advance to the highest-impact unresolved product or domain decision. If no safe, reversible working assumption exists, keep the item as an explicit remaining unknown and follow the stop conditions instead of silently settling or repeating it. Inspect only a specific unread path made newly relevant by the reply, then ask only the selected unresolved decision.
9. If the user is uncertain or asks you to use whatever you recommend, do not treat the recommendation as settled. Ask one explicit confirmation or choice question about that recommendation before advancing to another decision. Use an explicit ownership verb such as `confirm`, `choose`, `do you want`, or `would you like`; do not rely on an indirect “should we adopt” formulation. That uncertainty or delegation is new evidence for one ownership question; ask it once, then apply step 8's provisional-assumption or remaining-unknown rule instead of repeating it.
10. If a required fact cannot be established with available read-only access, identify it as a remaining unknown. Do not disguise the missing fact as a user decision.

## Confirmation boundary

When no answerable decision remains:

1. Summarize the settled decisions and explicit remaining unknowns.
2. Ask for explicit confirmation that the summary represents shared understanding. Recommend correcting any mismatch before confirming.
3. Wait for the user's confirmation.
4. After confirmation, state that the standalone interview is complete and stop. Do not invoke another Skill or act on the result.

If the user asks for implementation, editing, file output, or another mutation before confirmation, decline that action. If an answerable decision remains, continue with exactly the next single unresolved decision question, one recommended answer, and concise reasoning. Stop/cancel wording bundled into the same prohibited request follows this implementation-pressure branch rather than terminal cancellation. If the user asks for action after confirmation, explain that a wrapper or separate request must own it, then stop.

## State and mutation boundary

Keep interview state only in the conversation. Read-only inspection is allowed, but do not run commands that change state. Do not create, edit, rename, move, or delete files. Do not implement the plan before or after confirmation.

## Outputs

Produce only conversation-level decision questions, recommendations, concise reasoning, the final shared-understanding summary, remaining unknowns, and the completion notice.

## Stop conditions

Stop without mutation on terminal cancellation, when an inaccessible fact blocks responsible continuation, or after the user confirms shared understanding.

A clear request to stop or cancel the interview is terminal only when it is not combined, before confirmation, with a request to implement, edit, produce file output, or otherwise mutate. The combined case is implementation pressure and follows the confirmation-boundary rule instead.

Once terminal cancellation is established, stop immediately without a summary, confirmation request, or decision question. After stopping, do not resume the interview in response to later implementation pressure; require a new explicit `$kyw-grilling` invocation.
