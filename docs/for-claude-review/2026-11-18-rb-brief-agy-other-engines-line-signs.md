# Brief to agy — the other engines' lines signed by what they say, adversarial review (engine.350 Task 7)

Read-only review. Write your findings to `output/antigravity/2026-11-18-review-e350-other-engines-line-signs.md`. Do not edit code or sheets, do not fire the bench or the engine, do not run any model. Unit tests and read-only sheet reads through `lib/sheets` are fine. The candidate is not benched; findings are folded before the bench.

## What was built

Commit `b78af111d` (`git show b78af111d`), on top of `176bd116f` (your review of that one is folded). It follows from your own §4 of `output/antigravity/2026-11-18-review-e350-coded-pool-down-side.md` and gap log C116 G-EC63; the builder's word on it, 2026-11-18: "we fixing all this".

Rule applied in every file: a line is listed under the dial it moves and which way, read off the sentence, and written one step (`<Kind>-<Dial>-<Up|Down>-S`); a plain line (nothing felt or done) is drawn, counted in `S.engine299.noDialBySource` and not written, so the other lines keep their odds.

- `phase05-citizens/runRelationshipEngine.js` — `RELATIONSHIP_SIGN_LINES_`, `relationshipLineTag_`, the tag block after the pick.
- `phase05-citizens/runHouseholdEngine.js` — `HOUSEHOLD_SIGN_LINES_`, `householdLineTag_`.
- `phase05-citizens/runAsUniversePipeline.js` — `POSTCAREER_SIGN_LINES_`, `postCareerLineTag_`.
- `phase04-events/generateGenericCitizenMicroEvent.js` — `KIND_HAS_DELTAS_` emptied.
- `phase05-citizens/runNeighborhoodEngine.js` — `firstFridaySigns`.
- `phase05-citizens/generateCitizensEvents.js` — `Continuity` in `GRADED_ONLY_KIND_`, three follow-up lines signed.
- Tests: `scripts/homeSocialLineSign.test.js` (new), `scripts/householdEngine.t4.test.js`, `scripts/engine32MultiCycle.test.js`.

## Questions

1. **Each sign, by what the sentence says.** Go through the three sign tables and `firstFridaySigns`. List every line whose dial or direction you would dispute and why, and every line listed plain that plainly says something the citizen did or felt (and the reverse). I want the disputed ones, not a recount of the agreed ones.
2. **Readers of what changed.** Every reader, anywhere in `phase*`, `utilities`, `lib`, `scripts`, `dashboard`, of: the bare `Relationship`, `Household`, `PostCareer`, `Cultural`, `Community`, `Continuity` kinds on a life line or a `LifeHistory_Log` row; the calendar-suffixed tags (`Relationship-Holiday`, `-FirstFriday`, `-CreationDay`, `-Weather`, `Household-…`, `PostCareer-…`, `PostCareer-Sports`); `ctx.summary.householdEvents[].tag`; the hood pulse (`recordPulse_` and `neighborhoodPulseMap.js`) for these kinds. Which of them matches the exact old tag and now misses, or now double-counts? Name file:line and say what the reader does with the miss.
3. **The dropped draw.** In each of the three engines a plain draw now writes nothing. Trace what else used to happen on that path and no longer does, or still does without a line: `ctx.summary.cycleActiveCitizens`, `globalEvents` and the caps, `eventsGenerated`, `householdEvents`, the game-night `gameNightTouched` list and its Ripple row, `logRows`, `row[iLastUpd]`, the per-engine story signals. Any counter that now disagrees with what was written.
4. **Lines from outside the lists.** `runRelationshipEngine.js` can still receive a weather line (`getWeatherEvent_`, `weatherEventPools.special`) or a media line (`getMediaInfluencedEvent_`); `runHouseholdEngine.js` and `runAsUniversePipeline.js` take `hoodTexturePool_` lines. Which of those can return a text that is in no list (so it is counted `unlisted` and dropped), from the live `Neighborhood_Map` / canon loader as it stands today? Run `hoodTexturePool_` for each of the 22 live hoods if you can.
5. **Sizes.** For each kind, old size against new, and what the citizen loses or gains in a year of Cycles at the engine's own fire rate. In particular family: `Household` was the only +5 on that dial. With one step a line and the fold in `utilities/citizenMemory.js` (three same-way Cycles, a one-step swing fading in about four), does anything still move family, sociability or warmth for good at today's speed keys (`dialLineScale` 1, `dialDirectShare` 0)? And at the builder's ruled middle row (`dialLineScale` 2, `dialDirectShare` 0.25; `compressLifeHistory.js` `foldNewEntries_`): run the fold and give permanent up : down by share of pushes up (50, 55, 60, 70, 85%), as you did in §7b last time.
6. **What is still out there.** Any other writer in `phase*` that puts a line on a citizen's cell under a kind with a fixed size where the line's own words can say the opposite (bond kinds `Rivalry` / `Alliance` / `Mentorship` / `Arc` in this same engine; the neighborhood engine's holiday and Creation Day pools signed as a pool; anything else). File:line, the kind, its size, two example lines that contradict it, and lines a Cycle if you can count them from `output/beats/LifeHistory_Log.jsonl` or the ledger snapshot.
7. **Trick code.** In the three test files: assertions that prove less than their label, stubs that hide the path, a regex that cannot fail.

Each finding: file:line, what is there, the evidence.
