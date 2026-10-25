# TASK — adversarial review: Rhea reads the citizens' own page lines (Voices)

- **Lane:** antigravity (read-only review; write only your review file to `output/antigravity/2026-10-25-review-rhea-page-lines.md`)
- **Owner / lander:** research-build
- **Target:** the UNCOMMITTED working-tree diff of `scripts/cron-rhea-gate.js` + `scripts/cronRheaPersonaGate.test.js`. Exact candidate saved at `/tmp/claude-0/-root-GodWorld/78b343cd-2ce6-49d7-ac3f-26f773f60c33/scratchpad/rhea-page-lines.patch` (74 lines). Review that patch, not HEAD.
- **Ruling under review (builder 2026-10-25):** Rhea stays and her verdict blocks, every seat. She is tuned per seat, never softened. A previous cut made her advisory by default ("Delete Rhea", 10-23); that machinery is removed in this candidate — hunt for any remnant.

## What the change does

A Voices (Ines Sorensen) packet carries citizens' own page lines as approved facts; the fact copy is cut at 500 chars, so Rhea called a verbatim page quote "fabricated" (C112 Thu). The candidate adds `pageLinesFromManifest(manifest)`: for each approved fact whose `src` matches `citizen_pages/index.jsonl <customId>` (shape written at `scripts/buildVoicesSlice.js:116`), it loads the page row via `scanCitizenPages.loadIndex(ROOT)` (`scripts/scanCitizenPages.js:201`, rows carry `customId`, `popId`, `content`) and hands Rhea the whole page text under `APPROVED PAGE LINES` in the API prompt, with the instruction that an exact copy attributed to its owner is the citizen's supplied speech. Names resolve through `manifest.approvedSubjects[].id → name` (`scripts/livedExperiencePacketV2.js:343`).

Evidence it worked: `output/cron-compare/culture_c112_ines-sorensen_packet-v2_x-ai-grok-4-3.rhea.json` (Sat 10-24) — 0 flags, 4 quotes matched, 508 words over a 300 floor, contract 4/4.

## Hunts

1. **Regex vs real src.** Does the `src` regex match what `buildVoicesSlice.js` actually writes, including customIds that are not `cp-` prefixed? A silent no-match means the section never renders and the fix is a no-op.
2. **Weakening.** Does the `APPROVED PAGE LINES` instruction let fabricated speech through — a near-copy, a copy attributed to the wrong citizen, a page line of a non-subject citizen? The instruction says "exact copy, attributed to its owner"; is the model held to that?
3. **Prompt size.** Page `content` goes in whole via `JSON.stringify`. How large can a page row be, and can several pages blow the review prompt? Is there a cap anywhere?
4. **Silent failures.** `loadIndex` throws → `[]`; a missing page row → dropped. Should either be loud? Where would the operator see it?
5. **Advisory remnants.** Any path left where a model `high` flag is downgraded or `pass` ignores it. The gate must be the fail-closed S333 shape again (`flagsArr` / `highSevCount` from `verdict.flags` directly).
6. **Test honesty.** The test checks the prompt string contains the section. Does any test exercise `pageLinesFromManifest` against a real-shaped manifest? Weakened or source-text-only assertions count as findings.

## Format

Findings numbered, each with file:line in the patch, severity, and a verified repro or "could not verify". End with one of SHIP / SHIP-WITH-FIXES / HOLD. No code edits, no Sheets, no cron, no network.
