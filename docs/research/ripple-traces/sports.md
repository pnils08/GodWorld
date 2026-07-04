---
title: Ripple Trace — Sports (applySportsSeason, game-mode events, story hooks)
created: 2026-07-04
type: research
tags: [engine, ripples, attribution, sports, trace, reference]
pointers:
  - "[[../2026-07-04-ripple-attribution-trace]] — synthesis doc (findings S1–S5 derive from this trace)"
  - "[[TEMPLATE]] — the trace template this instantiates"
---

# Ripple Trace: SPORTS state changes

> Raw S291 trace, preserved verbatim as reference.

Scope note: `applySportsSeason.js` contains two functions — `applySportsSeason_` (season/feed load) and `applySportsFeedTriggers_` (sentiment/triggers/neighborhood compute). Both are wired at `phase01-config/godWorldEngine2.js:218-219` (production) and `:1562-1563` (cycle-phases).

---

## 1. CAUSAL MECHANISMS

**M1 — Feed load → season state**
`readOaklandFeedEntries_` (`phase02-world-state/applySportsSeason.js:87-152`) reads `Oakland_Sports_Feed` rows for the current cycle. `applySportsSeason_:25-80` sets `S.sportsSeason`, `S.sportsSeasonOakland`, `S.activeSports`, `S.sportsSource`, `S.sportsFeedEntries`. Trigger: feed `SeasonType`/`TeamsUsed` for the cycle. World_Config override (`ctx.config.sportsState_Oakland`) wins first (`:31-48`).

**M2 — Streak/record/season → citywide sentiment scalar (the "+0.11" mechanic)**
`processFeedSheet_` (`:302-501`) builds per-team latest state and computes `teamSentiment = (baseSentiment + streakBonus + fanMod) * seasonMultiplier * mediaScale`, clamped ±0.10 (`:417-419`). Components: win% → base ±0.03 (`:389-392`); `parseStreakBonus_` W6→+0.02 / **W3-5→+0.01** / W1-2→+0.005 and negatives for L (`:535-551`); season multiplier playoffs 2.0 / championship 3.0 / off 0.3 (`:396-405`); `FanSentiment` ±0.02 (`:581-590`); `MediaProfile` 1.5/1.0/0.8 (`:596-603`). Summed into `totalSentiment`.
`applySportsFeedTriggers_:284,290` then sets `S.sportsSentimentBoost = totalSentiment` **and** `S.sentiment = (S.sentiment || 0) + totalSentiment` — the "global add" (`applySportsSeason.js:290`).
Note: a W4 streak yields `streakBonus = +0.01`, not +0.11. The +0.11 figure exists only in the auditor's reconstruction (see GAPS).

**M3 — Streak/mood → story triggers**
`processFeedSheet_:426-463` builds `triggers[]` (`{team, trigger, neighborhood, streak, sentiment, playerMood}`), from manual `EventTrigger`, inferred hot/cold-streak (`inferFeedTrigger_:556-575`), or PlayerMood (`:433-450`). Landed on `S.sportsEventTriggers` (`:285`).

**M4 — Feed columns → neighborhood economic effects**
`processFeedSheet_:466-497` accumulates per-neighborhood `{traffic, retail, nightlife, communityEngagement}` from `teamSentiment`, `FanSentiment`, `EconomicFootprint`, `CommunityInvestment`, `FranchiseStability`. Landed on `S.sportsNeighborhoodEffects` (`:286`). Note: this object has **no `sentiment` field** — sports never reaches per-neighborhood sentiment.

**M5 — Season/streak → game-mode citizen micro-events**
`generateGameModeMicroEvents_` (`phase04-events/generateGameModeMicroEvents.js:34-575`) reads `S.sportsSeason` (`:88`). Effects: adds `sportsSeason:<x>` to `calendarTags` (`:96`); MLB citizens get atmosphere pools (championship/playoff/offseason, `:421-425`, pools defined `:256-272`); season raises event probability (`:503-507`). Writes to `LifeHistory` column (`:527`), `LifeHistory_Log` sheet (`:534-543`, `:567`), and `S.gameModeMicroEvents`/`S.gameModeMicroEventDetails` (`:572-573`).

**M6 — Sports triggers → media story hooks**
`storyHookEngine_` (`phase07-evening-media/storyHook.js:76`, wired via `v3Integration_` at `godWorldEngine2.js:413/1752`) reads `S.sportsEventTriggers` (`storyHook.js:579`) and emits `makeHook('SPORTS', neighborhood, priority, text, …)` where text embeds team + streak (`:582-608`). Assigned to `ctx.summary.storyHooks` (`:1505`).

**M7 — Neighborhood effects → evening crowd map**
`cityEveningSystems.js:443-451` reads `S.sportsNeighborhoodEffects.traffic` → `S.crowdMap`/`S.crowdHotspots`.

**M8 — Fame propagation: NOT PRESENT in current engine.** `citizenFameTracker` exists only under `legacy/engine-snapshots/v*/phase07-evening-media/citizenFameTracker.gs`. No current file, no `safePhaseCall_` wiring. The `.claude/rules/engine.md` exception list still names it — that reference is stale. Sports→fame is a dead/removed chain.

---

## 2. PERSISTENCE (does cause→effect survive?)

| Effect | Lands on | Persisted to | Attribution survives? |
|---|---|---|---|
| M1 season state | `S.sportsSeason`, `S.sportsFeedEntries` | cyclePacket / world_summary inputs | Season label persists; it IS the cause |
| **M2 sentiment scalar** | `S.sentiment` | **nowhere — DEAD WRITE** | **Lost.** No code reads `S.sentiment` (grep: only comments + `routePatternSeeds.js:374`). `applyCityDynamics.js:1332-1334` folds only `S.editionSentimentBoost` into `finalCity.sentiment`; sports scalar is not folded. Confirmed by memory obs 34422/34423 and `applyCityDynamics.js:11-12` ("no consumer read S.sentiment downstream"). |
| M2 `sportsSentimentBoost` | `S.sportsSentimentBoost` | evaporates | Computed, no consumer (grep: only self-assignment). Lost at cycle end. |
| M3 triggers | `S.sportsEventTriggers` | consumed by M6 only (transient) | Cause (team/streak) carried in the object, but object itself not persisted |
| M4 neighborhood effects | `S.sportsNeighborhoodEffects` | consumed by M7 crowd map (transient); folded into traffic/retail as anonymous numbers | Cause lost — deltas merge into neighborhood metrics with no "sports" label |
| M5 micro-events | `LifeHistory_Log` sheet + `LifeHistory` col | **Persisted** (`generateGameModeMicroEvents.js:534-543`) | Partial — season stored as tag on `details`, but the logged row `Category="GAME-Micro"` + free text; season cause not in a queryable column |
| **M6 story hooks** | `S.storyHooks` | **Persisted to `Story_Hook_Deck` sheet** via `v3StoryHookWriter.js:23/52-54` (Domain='SPORTS', Neighborhood, Priority, HookText) + `buildCyclePacket.js:541,578` | **Attribution survives** — HookText embeds team + streak ("A's on a W4… Fan energy rising"). This is the strongest surviving cause→effect record. |
| M8 fame | — | — | Chain does not exist |

---

## 3. MEDIA SURFACE

- **`engine_audit_c99.json`**: `"streak"` count = **0**. `SportsSeason` present as a state label; `"sports": null` appears only as an empty `storyHandles` coverage slot (`:93` etc.), auditor-generated, not engine data. `sportsSentimentBoost`/`sportsEventTriggers`/`sportsNeighborhoodEffects` do **not** appear. Per-neighborhood `"sentimentDelta"` values exist (`:413,508…`) but as bare numbers with **no sports cause attached**.
- **`baseline_briefs_c99.json`**: neighborhood lines show sentiment deltas ("sentiment 0.79 (+0.54)") with **no streak/sports attribution** — the delta is uncaused in the record. A's *residents* and a `sports-news` domain event (`event-sports-2-c99`) appear (that world event comes from `recordWorldEventsv3.js` / `mediaFeedbackEngine.js`, a separate feed→worldEvent path, M-independent). The sentiment→sports link is absent.
- **`Story_Hook_Deck` sheet**: the one surface where the sports driver is written with its cause intact (M6).
- **Streak text** ("Fan energy rising", "winning stretch", "hot streak") appears in **no** `output/*.json` — confirmed by grep. It lives only on the sheet + transient cyclePacket.

---

## 4. GAPS (computed-but-unattributed / dead / hollow)

1. **`S.sentiment += totalSentiment` is a dead write** (`applySportsSeason.js:290`). Nothing reads `S.sentiment`; it is not folded into `cityDynamics.sentiment` (only `editionSentimentBoost` is, `applyCityDynamics.js:1332-1334`). CitySentiment deprecated v3.5 (memory obs 25871). The sports→citywide-sentiment chain **does not actually move the persisted city sentiment.**
2. **`S.sportsSentimentBoost` is orphaned** — computed at `:284`, zero downstream consumers.
3. **The `routePatternSeeds.js` WHY layer reconstructs the driver after the fact, not from persisted attribution.** `scripts/engine-auditor/routePatternSeeds.js:374-421` comments its own anchor as based on `S.sentiment += totalSentiment`, but derives the A's streak by regex-scraping `world_summary_c{N}.md` markdown (`Streak (W\d+|L\d+)`, modal value, `:397-401`) and pairs it with the cross-hood sentiment number. The engine persists no sports→sentiment attribution, so the "+0.11 ← W4 streak" claim is a post-hoc guess reconstructed from markdown, **never a value the engine recorded**. And since Gap 1 shows the sports scalar doesn't drive `cityDynamics.sentiment`, the actual +0.11 uniform lift originates from `editionSentimentBoost`/holiday/weather in `applyCityDynamics.js`, not sports — the WHY layer attributes it to the wrong driver.
4. **`S.sportsNeighborhoodEffects` loses its cause** — merges into anonymous traffic/retail/crowd numbers (M4/M7); no reader can tell a retail bump came from a game day.
5. **Sports→fame chain (M8) is fully removed** — `citizenFameTracker` legacy-only, unwired; the `.claude/rules/engine.md` exception entry is stale documentation.
6. **`cycleId` vs `cycle` mismatch (UNVERIFIED impact)**: `applySportsSeason_:53` reads `S.cycleId || S.cycle` while `applySportsFeedTriggers_:267` reads `S.cycle || 0`. If only one is populated, the two functions may operate on different cycle numbers. Flagged, not traced to which field is set upstream.

Bottom line: Of the sports-driven effects, only **M5 micro-events** (to `LifeHistory_Log`, cause weakly tagged) and **M6 story hooks** (to `Story_Hook_Deck`, cause intact in text) are persisted with any recoverable attribution. The headline sentiment chain (M2) is computed, added to a dead scalar, and evaporates — and the only place it "appears" (the engine.35 WHY layer) is a markdown-scraped reconstruction, not engine-persisted attribution.
