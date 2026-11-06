---
title: Codex review — engine.331 build diff
created: 2026-11-06
updated: 2026-11-06
type: review
tags: [review, engine, sports, feed]
sources:
  - commit 592707c09
  - docs/plans/2026-11-05-sports-feed-triggers.md §Design and §Acceptance
  - output/engine-sheet/2026-11-06-codex-e331-diff-review-brief.md
---

# Codex review — engine.331 build diff

**Target:** `592707c09`, the seven Apps Script files in the stage-38 manifest, their focused tests, and the sports-feed plan's Mechanisms 1–8 and Acceptance 1–14.

**Result:** HOLD

## Findings

1. **High — a PlayerMood clause can change later events and dials, although the plan calls it text only.** `phase05-citizens/applyGameNightMoments.js:227-228,274-278` draws a second time from `safeRand_(ctx)` for each resolved named player on a game row with a dropdown mood. `utilities/safeRand.js:28-29` returns the shared `ctx.rng`. At both entry points, GameNightMoments runs before Household and CitizenEvents (`phase01-config/godWorldEngine2.js:623,646,657,2343,2366,2377`). Household uses that stream to decide whether a citizen gets an event and which tagged pool supplies it (`phase05-citizens/runHouseholdEngine.js:168,527,559,562-576`); CitizenEvents also uses it for participation (`phase05-citizens/generateCitizensEvents.js:640-647,2793`) and admits picked events that move dials (`:3687-3706`). Input: the same Cycle and seed with one resolved player's game-row mood changed from blank to `locked-in`. The added clause consumes a draw before those later rolls; a household or citizen can now get a different event, tag, dial intent, or no event. The direct named line keeps its tag, but the Cycle does not preserve tags and dials. This contradicts the text-only claims in `docs/plans/2026-11-05-sports-feed-triggers.md:80,84`. Resolve the shared-stream effect before treating this as a text-only PROD change. A focused same-seed, mood-only full-phase test could catch it; the current isolated tests do not.

2. **Medium — an Oaks W4 night can now draw baseball-only lines from shared plain-win pools.** The new bucket rule sends `W4` with `hotCold=''` to `win` (`phase05-citizens/applyGameNightMoments.js:107-111`); all three callers use that bucket for Oaks as well as A's (`:260-274`; `phase05-citizens/generateCitizensEvents.js:2187-2229`; `phase05-citizens/runHouseholdEngine.js:413-425`). The inherited shared `win` pools contain “final out” and “at-bat” for named players (`phase05-citizens/applyGameNightMoments.js:38-43`), “ninth” and “final out” for fans (`phase05-citizens/generateCitizensEvents.js:2200-2205`), and “last out” and “late innings” for households (`phase05-citizens/runHouseholdEngine.js:417-420`). Input: an Oaks W4 game row under the bar. Output: basketball players, fans or households can get baseball-specific lines; previously W4 used the sport-neutral `winStreak` bucket. This is a new route onto inherited text, not an objection to the builder's cold or mood wording. `scripts/householdEngine.t4.test.js:175-177` checks only that W4 lines omit “streak,” so it passes with wrong-sport lines. Make the shared plain-win pools sport-neutral or route by club, then assert this Oaks case.

## Verified paths

| Plan mechanism | Source check |
|---|---|
| 1, 2 — current rows, every row | The positive-Cycle reader builds entries and canonicalizes each row (`phase02-world-state/applySportsSeason.js:239-268`); the sole runtime `processFeedSheet_` call passes those entries (`:868`), and `feedMoments_` emits each typed word before hook dedupe (`:1061-1079`, `phase07-evening-media/storyHook.js:616-630`). The reducer retains only sentiment/aftermath fields (`phase02-world-state/applySportsSeason.js:955-967,1105-1143`). |
| 3, 6 — no carry, one pure canonicalizer | Blank, dash and `none` return no word before vocabulary checks (`phase02-world-state/applySportsSeason.js:1089-1095`). Its only source caller is the entry reader, which logs unknown/engine-only words once per Cycle and blanks the shared field for teams other than A's/Oaks (`:266-273`). Raw PlayerMood remains per entry (`:252`) and no longer enters the carried reducer or moment builder (`:955-964,1029-1046`). |
| 4 — one hot/cold decision | `applySportsSeason_` reads the configured bar once and calls `markSportsStreakHeadline_` (`phase02-world-state/applySportsSeason.js:118-126`); that function alone assigns `wk.hotCold` from the same gated `wk.streakHeadline` decision (`utilities/sportsWeekRecord.js:433-461`). `feedMoments_` and all three game-night callers read it (`phase02-world-state/applySportsSeason.js:1073-1077`; `phase05-citizens/applyGameNightMoments.js:274`; `phase05-citizens/generateCitizensEvents.js:2187-2190`; `phase05-citizens/runHouseholdEngine.js:413-416`). |
| 5 — title on clinch row | The inferred `championship` requires an accepted game row's `weekGames > 0` and raw `SeasonType=championship`, regardless of row order (`phase02-world-state/applySportsSeason.js:1063-1077`). |
| 7 — no mood trigger | The moment builder uses canonical EventTrigger and week hot/cold only (`phase02-world-state/applySportsSeason.js:1029-1077`); it no longer makes `player-frustration` or `player-energy`. |
| 8 — game-night buckets and clauses | Result precedes week hot/cold; mood tone applies only without a Streak (`phase05-citizens/applyGameNightMoments.js:93-112`). The lookup uses own keys (`:97-100`); all nine dropdown moods have clause and tone keys (`utilities/setupSportsFeedValidation.js:116-127`; `phase05-citizens/applyGameNightMoments.js:75-91`; `scripts/gameNightMoments.test.js:140-158`). New cold pools exist for named players, fan events and households (`phase05-citizens/applyGameNightMoments.js:62-68`; `phase05-citizens/generateCitizensEvents.js:2220-2229`; `phase05-citizens/runHouseholdEngine.js:422-425`). Direct named tags are unchanged (`phase05-citizens/applyGameNightMoments.js:177-188,278`); Findings 1–2 cover the downstream and shared-line effects. |

The override sets `S.sportsFeedEntries=[]` and `S.sportsWeek={}` before returning (`phase02-world-state/applySportsSeason.js:39-65`); Cycle 0 yields no entries (`:239-240`). The only runtime `processFeedSheet_` caller passes the new fifth argument (`:868`); the two runtime engine entry points order SportsSeason before SportsFeed (`phase01-config/godWorldEngine2.js:567-569,2287-2289`). The three runtime `gameNightBucket_` callers all pass the row's team's `hotCold` (`phase05-citizens/applyGameNightMoments.js:274`; `generateCitizensEvents.js:2187-2190`; `runHouseholdEngine.js:413-416`). No remaining source call to `inferFeedTrigger_` was found. `storyHook` reads the new trigger object's `team`, `trigger`, `neighborhood`, and `streak`, all supplied by `processFeedSheet_` (`phase02-world-state/applySportsSeason.js:1039-1045`; `phase07-evening-media/storyHook.js:565-630`). The new pitches use only those fields. The new cold/mood lines introduce no gendered pronoun or sport-specific wording in a shared pool.

## Tests and proof boundary

Ran locally: `sportsFeedTriggers.test.js` 15/15, `sportsFeedParser.test.js` 73/73, `gameNightMoments.test.js` passed, and `householdEngine.t4.test.js` 21/21. These execute the source with synthetic rows; the new row-gate, bar, clinch, bucket, and mood assertions would fail on the old implementations (`scripts/sportsFeedTriggers.test.js:31-37,42-145`; `scripts/gameNightMoments.test.js:127-158`; `scripts/householdEngine.t4.test.js:147-185`). The household test starts at Household with a supplied week and RNG (`scripts/householdEngine.t4.test.js:156-185`), so its unchanged-count assertion cannot prove that the earlier mood draw leaves later outcomes unchanged. The parser's direct calls without the fifth argument check sentiment/aftermath, while its moment cases pass entries explicitly (`scripts/sportsFeedParser.test.js:30,94-97,122-127`).

`sha256sum --check --quiet output/engine-sheet/stage38-e331.sha256` passed, including `utilities/setupSportsFeedValidation.js`, whose global vocabulary arrays the new canonicalizer reads (`phase02-world-state/applySportsSeason.js:1089-1095`; `utilities/setupSportsFeedValidation.js:136-194`). Apps Script global initialization, sandbox readbacks, PROD push, dashboard restart, sheet validation and first live fire are **unverified here**. This review does not treat the brief's 319/319 claim or a running bench as live proof.

### Source-traced wiring card

`Oakland_Sports_Feed` → `readOaklandFeedEntries_` → current `S.sportsFeedEntries` / accepted WeekRecord → `S.sportsWeek` → `markSportsStreakHeadline_` assigns `hotCold` (`phase02-world-state/applySportsSeason.js:69-74,105-122`; `utilities/sportsWeekRecord.js:454-461`). `applySportsFeedTriggers_` passes current entries and week to `processFeedSheet_` → `S.sportsEventTriggers` → `storyHookEngine_` moment pitches; its separate games sentiment and aftermath feed the sports Ripple rows (`phase02-world-state/applySportsSeason.js:868-920,1029-1049`; `phase07-evening-media/storyHook.js:565-630`). `S.sportsFeedEntries` and `S.sportsWeek` also feed named player, household and fan lines in Phase 5 (`phase05-citizens/applyGameNightMoments.js:257-320`; `runHouseholdEngine.js:401-426`; `generateCitizensEvents.js:2171-2230`). The automated Haiku wiring-card command was not run: `scripts/runEngineAgent.js:321-322` writes a separate `output/agent_*.md`, while this assignment permits writing only this review file.

## Disposition

Claude lane to verify Findings 1–2 and settle them before the PROD candidate proceeds. The earlier engine.333 typed-streak plan conflict remains that sibling plan's read-before task (`docs/plans/2026-11-05-sports-feed-triggers.md:182`); this review introduces no new builder call.

**Reconciled in:** `docs/plans/2026-11-05-sports-feed-triggers.md` §Reviews reconciled (A17, A18), 2026-11-06, engine-sheet.

### Disposition (engine-sheet, 2026-11-06)

- **F1 — verified, fixed in place.** The clause took a second `rng()` per named player before Household and CitizenEvents (`phase01-config/godWorldEngine2.js` order confirmed). Now one draw: `nightPos = rng() * pool.length`, line = `floor(nightPos)`, clause from the fractional remainder. `scripts/gameNightMoments.test.js` §6: same entries, mood blank vs `locked-in` → equal draw counts, byte-identical staff / fan week lines, the named line = the blank line + ` — ` + a `locked-in` clause.
- **F2 — verified; pre-existing on Oaks W1–W3 and L nights, extended to W4 by this row; fixed in place.** Eleven word swaps across the three shared pools (plan §Game-night lines), pinned by `scripts/gameNightFans.test.js` 6.
- **Not seen by this review:** `e36350a88` — the fans' game-night lines carried no sign, so engine.299's admission gate dropped them all (live 0 at C112–C114 though the Oaks played); win night `dial:fandom:up`, loss night `dial:fandom:down`. Goes to the re-review.
