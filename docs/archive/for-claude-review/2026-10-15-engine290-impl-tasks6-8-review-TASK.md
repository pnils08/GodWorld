# TASK — codex review: engine.290 implementation, Task 6 + the Tasks 1–5 fold + Tasks 7–8

**Target:** `git diff f495246c..f72efb8f -- phase* utilities scripts data dashboard docs/engine` (Task 6 f50903cd, the fold of your Tasks 1–5 review 254163a6, Task 7, Task 8 f72efb8f). Read-only source review; no cron, model, Sheet, bench or canon run.
**Plan:** `docs/plans/2026-10-15-engine-290-transit-rides-the-sim.md` + the es changelog entries (Task 6 note is deliberate: commute rows held to one line's mass).
**Write to:** `docs/for-claude-review/2026-10-15-codex-engine290-impl-tasks6-8.md`. Gate SHIP / FIX / HOLD per hunt, file:line evidence. Do not commit.

## Hunts
1. **Fold check.** Your four Tasks 1–5 findings: `getTransitSummary_`, dashboard/packet N/A, rebase either direction, corridor city mean. Fixed as you meant, or a new hole?
2. **ECL exposure (Task 6).** The transit gate in `generateCitizensEvents.js` must keep today's draw and odds (0.30 affected / 0.12 elsewhere) and only add the chaos-train hood case. `transitCommuteMass_` must hold the `occupation.transit` rows to 1.15 total and keep them out of `balanceContentLedgerPoolWeights_`, the exclusive-pool drop, and the engine.67 hard gate's surprises. Any path where commute lines draw without the flag, or a non-working citizen draws one? `transitdisrupted` in `CONTENT_LEDGER_DSL_FIELDS`. The 40-draw row cap interaction.
3. **Pool file.** `scripts/transitEclPool.js` rows vs the loader (Tags, Conditions grammar, `occupation=<title with spaces>`), `undockedEclPoolApply.js --pool transit`. Crew rows must be writable separately later (the BART titles await the builder) — does `--match` cover a commute-only apply?
4. **Hiring (Task 7).** `MINT_KEYWORD_RULES` / `employer_mapping.json` lockstep and order; any existing title that the new substrings now capture (e.g. a non-BART "Transit Dispatcher" at AC Transit, "Track" or "Train Operator" inside another role); `DEMOGRAPHIC_VOICE_ROLES` hash-mod shift; the BIZ-00014 settle line in `runCareerEngine.js`.
5. **Docs (Task 8).** `ENGINE_COUPLING_MAP.md` / `EVENT_SYSTEM_MAP.md` claims vs code.
