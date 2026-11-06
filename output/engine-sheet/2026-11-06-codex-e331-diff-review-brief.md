# Brief — engine.331 diff review (the PROD candidate)

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits.

## What to review

`git show 592707c09` — the engine.331 build. The deploy candidate is PROD stage 37 + these seven Apps Script files at `592707c09` (manifest `output/engine-sheet/stage38-e331.sha256`):
`utilities/setupSportsFeedValidation.js`, `utilities/sportsWeekRecord.js`, `phase02-world-state/applySportsSeason.js`, `phase05-citizens/applyGameNightMoments.js`, `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/runHouseholdEngine.js`, `phase07-evening-media/storyHook.js`. The rest of the commit is tests, the sandbox seeder, docs and the regenerated stub maps.

The plan it implements: `docs/plans/2026-11-05-sports-feed-triggers.md` §Design (Mechanism 1–8, §Vocabulary, §Game-night lines), Acceptance 1–14. You reviewed this plan twice (`docs/research/2026-11-05-codex-engine331-plan-review.md`, `…-plan-rereview.md`). The builder added scope on 2026-11-06 after your re-review: a cold game-night set and every dropdown mood closing the players' night line (Mechanism 8) — review those with the rest.

## Ask

1. **Does the code do what the plan says** — each mechanism, with file:line. In particular: nothing carries a trigger or mood across rows or Cycles; `canonicalFeedTrigger_` is pure and `readOaklandFeedEntries_` is its only caller; `entry.eventTrigger` is `''` off the A's and Oaks; `S.sportsWeek[f].hotCold` is set only in `markSportsStreakHeadline_` and equals the streak-headline decision; the clinch-row `championship`; the override and Cycle-0 paths make no moments.
2. **What it breaks** — every other reader of the fields and functions it changed (`processFeedSheet_`'s new fifth argument, `reduceFeedTeamState_` without `trigger` / `playerMood`, the removed `inferFeedTrigger_`, `gameNightBucket_`'s new second argument at its three callers, the `S.sportsEventTriggers` object shape), at both engine entry points. Anything in Apps Script global scope that now depends on `utilities/setupSportsFeedValidation.js` being loaded.
3. **Game night** — the bucket order (result first, then the week, mood tone only with no Streak), the `hasOwnProperty` guard, the extra rng draw per named player with a dropdown mood, the text-only claim (tags and dials unchanged).
4. **Tests** — do `scripts/sportsFeedTriggers.test.js`, the rewritten `sportsFeedParser.test.js` cases, `gameNightMoments.test.js` §4–5 and `householdEngine.t4.test.js` 5.2b/5.2c prove what they claim, or could they pass on the old code. Name a missing case only if a defect could hide there.
5. Pitch texts and line pools are the builder's color — flag only a mechanical problem (a field the trigger object does not carry, a gendered pronoun, a sport-specific word in a line both clubs draw).

## Output

`docs/for-claude-review/2026-11-06-codex-engine331-diff-review.md`, shape from `docs/plans/PLAN_TEMPLATE.md` §Review: **Result:** SHIP | SHIP-WITH-FIXES | HOLD, then numbered findings with file:line evidence and a severity. Mark anything unverified as unverified.
