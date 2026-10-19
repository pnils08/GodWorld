# TASK — codex: diff review of engine.304 cut 1 (the pool)

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine304-cut1-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~80 lines. Report in one line when done.

`git show 25ee233c` against the plan `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §engine.304 design pass D7/D8 and the folded review block after it (your plan review: `docs/research/2026-10-19-codex-engine304-plan-review.md`).

1. **Feeder** (`phase05-citizens/generateGenericCitizens.js`): the age split of the floor counts (BirthYear first, Age only when blank; a row with neither counts adult), `planFeederSlots_` (alternation, youth sex balance, deficits exhausted, hood-shortfall slots), BirthYear relative to the sim year at both ends (an 18-year-old adult, a newborn), `student` for minors, the early-exit and `fillCount` with the youth deficit. rng order change — any replay or test that depended on the old draw order? Anything that reads `sexQueue` as strings elsewhere?
2. **Config** (`phase01-config/engine94SheetContract.js`): two seeds in `ENGINE148_CONFIG_SEEDS` — self-arm at production entry only (`godWorldEngine2.js:495`); the cycle-phases path (dry run / replay) throws on a missing cell — acceptable, or a hazard on bench replay?
3. **Wave** (`phase05-citizens/checkForPromotions.js`): minors out of the preferred line only; `simYearOf_` read only when the BirthYear column is passed; the mint's age now BirthYear-first — does anything downstream of `:333` (education, career years, income, MaritalStatus youth, RoleType student, debt/net worth) now behave differently for existing adult GC rows whose Age disagreed with BirthYear (158 of 276 live)? Name the visible effect.
4. **Courtship** (`phase05-citizens/bondEngine.js:2585`, `:2685`): read order only — confirm no rule changed (R15).
5. **Minors downstream:** a pooled minor taken by the wave or the emergence door — trace to its ledger row (Tier, MaritalStatus youth, RoleType student, no employer, HouseholdId via `formCriteriaHouseholds_` the same Cycle?). Any adult-only assumption on the way (surfacing text naming a 6-year-old as an acquaintance, civic challenger, owner door) that now reaches a child?
6. **Tests:** `scripts/engine304FamilyLottery.test.js` — do they catch a regression in each of the above?

Done = the md exists.
