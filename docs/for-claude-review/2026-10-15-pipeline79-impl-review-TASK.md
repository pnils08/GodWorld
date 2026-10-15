# TASK — codex review: pipeline.79 implementation

**Target:** commit `47531b52` (on top of `734db7cd`). Read-only source review; no cron, model, Sheet or canon run.
**Write to:** `docs/for-claude-review/2026-10-15-codex-pipeline79-impl.md`. Gate SHIP / FIX / HOLD per hunt, file:line evidence.

Builder 2026-10-15: every journalist graded; Saturday highlights the best-graded work; printed pieces earn MEDIA tier usage (`byline-published`).

## Hunts
1. **Grade binding.** `stagedGrade` (`scripts/cron-saturday-run.js`) must return only the grade of the loaded Article bytes. Any path where a rerun's grade, a flagged draft's grade, or a backfilled grade attaches to different bytes?
2. **Curation order.** Grade-first sort + storyline dedup + `--top`: can an ungraded or canon-violation entry outrank a graded one; does the publish step and the sweep read the same selected stems?
3. **byline-published rows.** `bylinePublishedRows` + `stepSheets`: idempotence on (name, type, context); name matches what `earnedCitationsByKey_` / `splitUsageName_` (`phase05-citizens/processAdvancementIntake.js`) resolve — titles like "Sgt. Rachel Torres", "Dr. Lila Mezran", "Jordan Velez" (business desk byline). Does a byline that fails to resolve fail loud or silently? Double-credit with any other byline-published writer (`scripts/ingestPublishedEntities.js`)?
4. **All-seat reward loop.** 20 seats newly on `rewardLoop` from the Thu 2026-10-15 06:15 fan-out: any package whose contract the rubric/score path mishandles (`evidence-bounded`, two ranges, SOURCE_BRIEF render mode, the weekly digest `nia-rook-weekly`)? Page carry for seats whose byline has no citizen page?
5. **C111 backfill.** The 12 sidecars edited by the one-time backfill: `rhea.contractScore.draftSha256` equals `rhea.draftSha256` equals the staged bytes?
