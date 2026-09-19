---
title: Sports lane — engine routing cuts (hook theme monopoly, S.*-only stadium data)
created: 2026-09-15
updated: 2026-09-15
type: reference
tags: [research, sports, newsroom, pipeline68, active]
sources:
  - S443+ kimi session — sports-lane audit + scripts-side fix (builder-directed lane program; scope FULL COURSE ruled 2026-09-15)
  - docs/plans/2026-09-07-beat-slices-from-sheets-plan.md — pipeline.68
  - Builder ruling 2026-09-15 (this conversation): "Chicago no longer exists in the sim" — Chicago_Sports_Feed is dead legacy (Bulls rows end C91); the Oaks live on Oakland_Sports_Feed
pointers:
  - "[[../plans/2026-09-07-beat-slices-from-sheets-plan]] — the plan this extends"
  - "[[../SIM_DOCTRINE]] §13 — gate the facts, not the color"
---

# Sports lane — engine routing cuts

**Verdict: adopt.** Sports has the newsroom's best input path; the failures
are routing and one dead tab.

## What landed scripts-side (kimi, this session)

- `scripts/dumpBeatTabs.js` — `Oakland_Sports_Feed` added as an OPTIONAL tab
  (221 rows live: A's, Oaks, NBA). `Chicago_Sports_Feed` was considered and
  rejected — dead legacy (87 Bulls rows, cycles 40–91); dumping it would print
  C91 as news, the same defect class as the Youth_Events ruling.
- All five existing builders now consume the decks (soft attach — the sports
  substrate's spine stays the world summary; missing/stale dump = empty decks,
  never a throw): `sportsSubstrate.js` gains `loadBeatDecks` / `sportsHooks` /
  `sportsSeeds` / `loadRawFeedRows`; Anthony (with the unnamed-SPORTS catch-all
  — he is the signal map's sports seat), P Slayer, Hal, Tanya each get
  name-matched SPORTS hooks + sports-desk seeds; Simon additionally gets
  `civicFacts` — FranchiseStability / EconomicFootprint / EventTrigger /
  HomeNeighborhood from the raw feed, the columns the world-summary
  distillation drops. His stated beat (sports as civic architecture) finally
  has a data path. Live-verified C107: P Slayer received his 2 named hooks +
  1 seed, Hal 1 seed.
- Two new slices (the Oaks were packless, writing from the generic lane):
  - `buildOaksBeatSlice.js` (Selena Grant, POP-00591) — the Oaks rows raw:
    record, streak, stats, trigger, franchise stability. Live C107: "The Oaks
    are a full go for opening night", franchise stability **uncertain**,
    Wilson Shepard + Adash Stanley resolved.
  - `buildOaksGroundSlice.js` (Talia Finch, POP-00592) — fan sentiment,
    player mood, notebook, home neighborhood lead; record as context.
  Both Oaks-only (the feed is A's-dominated; an Oaks-quiet week is an empty
  slice, never A's rows in their mail), 6-cycle window (the Oaks feed is
  sparse), name-matched hooks only.
- Wired into `newsroom-fanout.js` + `cron-desk-run.js` BEAT_BUILDERS /
  BEAT_NAME_RE / beatSlugForName, with STANCE lines for both.

## Proposed engine cuts (gated — phase*/utilities land through engine-sheet)

**Cut 1 — the SPORTS hook theme monopoly.**
`suggestStoryAngle_` (`phase07-evening-media/storyHook.js:192-195`) scores
hooks against journalist theme lists, and P Slayer's themes (Heartbeat, Pulse,
Fight, Loyalty, Noise — `utilities/rosterLookup.js:95-96`) out-score every
sports colleague on every sports hook: 32 of 38 all-time SPORTS hooks name
him; Anthony, Hal, Tanya, Simon, Selena, Talia have **zero**. The roster
signal map says `"sports": "Anthony"` (:311) and is overridden. Proposed:
cap per-journalist hook assignment per cycle (1–2), or honor the signal map
before theme scoring, or rotate within the desk like the seed engine's
usage-rotation (buildContractSeeds.js:267-290 already does this for seeds —
the same shape works for hooks).

**Cut 2 — stadium/civic-sports state is S.*-only.**
`deriveBaylightOpenings_` / `deriveSportsZones_`
(`phase02-world-state/applySportsSeason.js:52-53`) produce
`S.baylightOpenings` / `S.sportsZones` — stadium openings and zone effects
that never persist to a tab, never reach the world summary, never reach Simon
(his beat) or the civic desk. Proposed: persist as feed rows on
Oakland_Sports_Feed (they are sports events) or surface through the hook
deck as CIVIC/SPORTS hooks.

**Housekeeping — `Chicago_Sports_Feed` is a dead tab.** 87 Bulls rows,
cycles 40–91, nothing since; Chicago is retired from the sim (builder,
2026-09-15). Recommend archiving the tab out of the active sheet the way
Storyline_Tracker was retired — it currently sits beside live tabs where a
future reader can mistake it for a live feed.

## Wiring card status

Both sports-feed card runs died on the OpenRouter 403 (key limit, same wall
as the Cultural_Ledger attempt) — no card attached. Feed contract verified by
direct code read: `scripts/sportsFeedContract.js:8-13` (FEED_HEADERS),
`scripts/sportsFeedWriter.js:16` (writer), `applySportsSeason.js:6` ("ALL
sports data comes from Oakland_Sports_Feed"). Re-run when quota resets if the
reviewer wants it.

## Note — 2026-09-15 (kimi)

Wiring card landed after the OpenRouter limit was lifted:
`output/agent_engine-wiring_2026-09-15T22-03-40.md` (Oakland_Sports_Feed). The
"wiring card status" section above is superseded.

## Review — research-build, 2026-09-19 (S467)

Accepted into docs/research. The scripts-side slice work stands as landed. Disposition of the proposed engine cuts:

- **Cut 1 (sports hook theme monopoly): already shipped.** engine.232 / engine.232b (S463, `ecf6d5ce`, `512ca101`, live on PROD @96) added a desk-scoped theme scorer, domain seat before the hookType signal, and a 25% per-Cycle cap on hook naming (`storyHook.js:234-241`, `suggestStoryAngle_` at `utilities/rosterLookup.js:904`). The report's `storyHook.js:192-195` pointer predates that cut. The monopoly is verified in the historical deck: 32 of 38 SPORTS hooks named P Slayer, 6 unnamed, C80–C107. The first Cycle fired under the cap is the one to check.
- **Cut 2 (stadium state is S.*-only): folds into engine.204.** Same gap as [[2026-09-18-sports-intensity-and-game-day-economy]] §1.6-1: `S.baylightOpenings` and `S.sportsSeasonByTeam` are orphaned writes. Task 3 derives per-franchise venue from them, so no separate row.
- **Chicago_Sports_Feed archive:** a sheet-structure change on a retired tab. The builder's go is needed; no row filed.
