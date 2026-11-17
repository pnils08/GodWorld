# Brief for codex-rb — plan review: page labels off citizens' memory (2026-11-16)

Read `docs/plans/2026-11-16-page-labels-off-citizens-memory.md`. Review the PLAN against the code, adversarially. Do not edit code.

Check, with file:line for every claim:
1. Is the writer table complete? Any other code that writes a labelled entry into the `citizen-pages` Supermemory container (lib/citizenPage.js appendReflection_ callers, any direct /v3/documents write with a cp-POP tag)?
2. Is the reader table complete? Any code (scripts/, lib/, dashboard/) that finds, filters, parses or counts page entries by their leading label (TENSION[, TENSION-RESOLVED[, TALK[, stated:, datawake:, filed:, graded:, action:, signal:)?
3. Is the claim "dials do not read these labels" true? Trace Reflection_Intake writers and utilities/compressLifeHistory.js readPendingReflections_; anything else that turns page text into a dial, bond or tension move?
4. Task order: is readers-first then writers safe across a live week where old and new entries coexist?
5. Anything in Task 4 (rewriting ~2,300 stored entries) that would break a customId-keyed reader or the store's same-customId append behavior (lib/citizenPage.js :41, :77-82)?

Write your review to `docs/for-claude-review/2026-11-16-codex-page-labels-review.md`: one numbered finding each, severity, file:line, and what the plan should change. End with SHIP / SHIP-WITH-FIXES / HOLD.
