# TASK — codex: review engine.299 Task 1 (every event that fires moves a dial)

Read-only: code + `output/` dumps + tests; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-18-codex-engine299-task1-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~120 lines. Report in one line when done.

**The diff:** engine-sheet's Task 1 commit(s) — the dispatch message names the hashes (`git show <hash>`). Plan: `docs/plans/2026-10-18-event-engines-move-dials.md` §The offenders, §Things to consider, Task 1.
**The builder's scope for the night (2026-10-18, verbatim to rb):** "we aren't rebuilding any systems just cleaning up hardcoded events in the engines that don't fit how the sim works now."

## Hunts
1. **`utilities/citizenDialMap.js`.** No key maps to `{}`. Each of the 20 former `{}` kinds (Civic, Civic Perception, Neighborhood, Team, Season, Lifestyle, Death, Background, Daily, Micro-Event, Life Event, Life, Personal, PrevEvening, FirstFriday, Holiday, CreationDay, Sports, Weather, Faith-Drift) is either a graded family `<Kind>-<Up|Down>-<S|M|L>` with deltas, or STRUCTURAL with a reason. Does `nudgesForEvent_` (and every other `DIAL_MAP` consumer) parse the graded tag the same way at both entry points? Phase 9 folds the cell's tag, not the log's (your 2026-10-17 hunt 1a): does the tag the row keeps carry the grade?
2. **The emitters.** `phase05-citizens/generateCitizensEvents.js`, `phase04-events/generateGenericCitizenMicroEvent.js`, `utilities/tier1EssenceEvents.js`, `phase05-citizens/runNeighborhoodEngine.js`, `generateMediaModeEvents.js`, `generateCivicModeEvents.js`, `phase04-events/generateGameModeMicroEvents.js`. For each `{}` kind it wrote: does it now write a graded tag whose sign comes from a fact on the row or a ledger (hood trend, money, bond, result), or not write the line? Flag any sign drawn at random, any default-up fallback, any graded tag on a line whose fact does not support it (trick code).
3. **Caller graph for every renamed tag.** Grep every consumer of the old exact tag strings (e.g. `'Neighborhood'`, `'Daily'`, `'PrevEvening'`, `'Civic Perception'`): `docs/engine/TAG_REGISTRY.md`, `utilities/compressLifeHistory.js` (incl. `UNLIVED_BRANCH_TAGS` 1603), `phase07-evening-media/buildContractSeeds.js` event hints, world-summary / desk packet builders, `scripts/` audits and scorecards, Ripple_Ledger readers. Name every reader that would now miss a line.
4. **Engine rules.** `ctx.rng` only, no `Math.random()`; `ctx.writeIntents` only; no new file (FIX, don't ADD); truth docs (`TAG_REGISTRY.md`, `EVENT_SYSTEM_MAP.md` §2, STUB_MAP) trued in the same commit.
5. **Owner-engine events stay out of color.** No color pool in the diff throws a divorce, promotion, layoff, marriage, birth, death, hospital stay or move.
6. **Tests.** Run the test the commit names for "every key resolves to ≥ 1 dial or is STRUCTURAL" plus `npm test` (or the suite the commit names). Does the test fail if a `{}` is added back?
7. **Scope.** Against the builder's line above: name any part of the diff that rebuilds a system rather than cleaning up hardcoded events.

Done = the md exists.
