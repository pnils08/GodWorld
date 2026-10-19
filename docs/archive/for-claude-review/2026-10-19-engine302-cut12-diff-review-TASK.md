# TASK — codex: diff review, engine.302 cuts 1 + 2

Read-only: code + tests + docs; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-cut12-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~120 lines. Report in one line when done.

**The diff:** `git show 0125b59a` (cut 1) and `git show 8e77f7a0` (cut 2). **The plan:** `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §Bench soak — rulings 1–12 verbatim, cut 1 design + your folded plan review, cut 2 design + your folded plan review. Your two plan reviews: `docs/research/2026-10-19-codex-engine302-cut{1,2}-plan-review.md`.

## Hunts
1. **Does each fold land as the dispositions say?** Walk every disposition line of both plan-review folds against the diff; name any that the code does not do, or does differently.
2. **Status invariant.** After both cuts, can any runtime path write `partnered`, a blank, a non-`youth` minor or a `youth` adult? Include `wireFamilyMatch_` now writing `married` on the target, `formIntakeHouseholds_`, the GC spouse mints, `createChildRow_`, `youthComesOfAge_` placement.
3. **Widowing + wake + remarriage.** `widowSurvivingSpouse_` (pointer rule, deceased skip, dirty flag), `wakePerception.js` married-to only on `married`, `marryCitizens_` moving the joiner's minors (old HouseholdId match, ParentIds, Members cell write once, interaction with the step-parent loop after it, the non-join path).
4. **`bondCanCourt_` + the pass snapshot.** Truth table, the reciprocal-spouse guard, every gate replaced, the newlywed snapshot update in `processRomanceAndMarriage_`.
5. **Encounters.** `detectNewBonds_` single loop + bare block: every `continue` still lands on the next citizen; self exclusion arithmetic; seen-pair set; `_bondKeySet` check order; draw order on `safeRand_`; `bondDialBand_` cost per citizen; the old cap's readers (none left?); the Logger line. Volume: anything downstream that will now see ~15 new bonds a week instead of 2–4 (Relationship_Bonds full replace `bondPersistence.js:305-340`, `saveV3BondsToLedger_`, story hooks, packets).
6. **Deepening.** Placement as `else if` after the TENSION block; shared-week + ACTIVE + post-step intensity; the FRIENDSHIP_GROWTH change for NEIGHBOR/PROFESSIONAL (and the far hoodless NEIGHBOR −0.1); `deepenBondToFriendship_` life lines (index keys, missing rows); the same-week romance guard (notes stamp).
7. **GC courtship.** Wedding window on step 1 and step 2; the single-Courting-row binding; UNI/MED/CIV `no` + header throw; near/city pools via `bondProximity_`; the 20% gate and draw order; `metWhere` text; anything that still reads the old 20–65 band.
8. **Tests.** `scripts/engine302Marital.test.js` (57) — would each assertion fail on the pre-302 code? Name any that passes trivially. The trued tests (`citizenDerivation.test.js`, `householdIntake.test.js`, `sportsWeekCity.test.js`, `dialWave2Seams.test.js`) — did a truing hide a real regression?
9. **Engine rules.** `ctx.rng` only; no new sheet writes outside the existing direct-write classes in these functions; no new file but the named test; truth docs (SIMULATION_LEDGER V row, STUB_MAP) trued.

Done = the md exists.
