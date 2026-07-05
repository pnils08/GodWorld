---
title: Game-Night Connection Design — one moment, all the way through the city
created: 2026-07-05
updated: 2026-07-05
type: plan
tags: [engine, sports, connection-design, draft]
sources:
  - S296 close verdict (claude-mem S9978) — build moratorium until a connection design traces one moment end-to-end
  - phase05-citizens/applyGameNightMoments.js (S296, commit ebce9d2d)
  - phase02-world-state/applySportsSeason.js, applyCityDynamics.js (T3a commit b5dadb67)
  - MEMORY.md — project_universal-protagonism-doctrine
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.47)"
  - "[[../../schemas/SCHEMA_HEADERS]] — Business_Ledger + Neighborhood_Map columns cited below"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — registered same commit"
---

# Game-Night Connection Design Plan

**Goal:** One game Mike plays produces attributed, row-level effects at every layer of the city it actually touches — players, watching citizens, households, bars, neighborhoods, evening media, and the next morning — with a Ripple row naming the game as cause at each hop.

**Architecture:** No new files. The sports feed spine already runs Phase 2 → Phase 7; this design completes it by extending four existing engines (`generateCitizensEvents`, `runHouseholdEngine`, `economicRippleEngine`, `applyCityDynamics`) so the game's reach matches its real-world shape: the most connected moment in Oakland. S296's verdict — game night was built as a private note on a handful of players' rows — is fixed by wiring the layers, not by another sibling engine.

**Terminal:** engine/sheet

**Pointers:**
- Prior work: `phase05-citizens/applyGameNightMoments.js` (players' going-home moments, S296); T3a sports→sentiment (`applyCityDynamics.js:1393-1400`); T3b crime carry (carryover pattern this design reuses)
- Related plan: [[2026-07-04-ripple-ledger-attribution]] (engine.45 — the attribution spine every hop below records into)
- Research basis: universal-protagonism doctrine (Mike verbatim, S296): every line item affects what happens to that entity; nothing happens in isolation

---

## The moment, traced

Mike plays a game. One row lands in `Oakland_Sports_Feed` (result, streak, playerMood, namesUsed, storyAngle). What should happen, hop by hop — **WIRED** = exists with file evidence; **GAP** = the missing connection and which existing engine carries it.

### Hop 1 — Feed intake · WIRED
`phase02-world-state/applySportsSeason.js:39-56` reads the feed into `S.sportsFeedEntries`; `:249-284` computes `S.sportsSentimentBoost`. If Mike didn't write it in the feed, it doesn't exist (no invented games — rarity is structural).

### Hop 2 — City mood · WIRED (S296 T3a)
`phase02-world-state/applyCityDynamics.js:1393-1400` folds `sportsSentimentBoost` into city sentiment; the boost propagates to per-neighborhood Sentiment via the base + neighborhoodMod + variance formula (file header, v-fix note). Verified exact +0.11 at C109-C111.

### Hop 3 — The players go home · WIRED (S296)
`phase05-citizens/applyGameNightMoments.js` — `namesUsed` players get a going-home LifeHistory moment on their own ledger row, streak/mood-bucketed; Ripple row carries the exact POPIDs. Fires only on cycles with feed entries.

### Hop 4 — The town watched · GAP
The whole town experiences the game only as anonymous ambient mood: `phase05-citizens/generateCitizensEvents.js:1434-1442` emits "felt uplifted by the city mood" with `source:sentiment` — no citizen event ever names the game. A win streak and a good weather day are indistinguishable on a citizen's row.
**Carrier:** `generateCitizensEvents.js`. When `S.sportsFeedEntries` has a game this cycle, add a game-night pool (watched the ninth at a packed bar, radio on the porch, wore the cap to work the next morning, avoided the score after the loss) tagged `source:sports|gameNight|streak:<X>` — pressure-weighted by `sportsSentimentBoost` magnitude, same ATTACHED-signal pattern as the crime weighting shipped S296. Sample stays 1:443 qualitative — a handful of citizens carry the town's night, not a headcount.

### Hop 5 — Households bend around the score · GAP (partial)
`phase05-citizens/runHouseholdEngine.js` already integrates City Dynamics + Sports Season (header, v2.2), but its notes are generic seasonal flavor — no household note ever moves because of tonight's result.
**Carrier:** `runHouseholdEngine.js`. Game-cycle household notes bucketed by the same `gameNightBucket_` logic (`applyGameNightMoments.js:51-59`, exported): dinner moved to the couch for the broadcast; kid stayed up past bedtime for extra innings; the loss made the house quiet. Fires only when feed entries exist.

### Hop 6 — Bars fill · GAP
`Business_Ledger` (71 rows: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel) has hospitality rows whose fate never feels a game night — the single largest recurring commercial event in the city is invisible to every business row.
**Carrier:** `phase06-analysis/economicRippleEngine.js` — it already reads Business_Ledger and resolves BIZ-ID → neighborhood (`:124-126`, `:959`). On game cycles: hospitality/food-sector rows in nightlife-profiled neighborhoods (Neighborhood_Map col D `NightlifeProfile`, col H `EventAttractiveness`) get a small attributed Growth_Rate/Annual_Revenue nudge, win > loss, streak amplifies. Each nudged BIZ_ID lands in a Ripple row → a bar's season shows up in its line items, and the seed deck can name the bar.

### Hop 7 — Neighborhood texture · GAP (partial)
Per-neighborhood `Sentiment` (Neighborhood_Map col I) absorbs the boost via Hop 2. But `NoiseIndex` (E) and `RetailVitality` (G) — the columns that ARE a game night in a nightlife district — don't respond; `SportsSeason` (O) is a season label, not a game.
**Carrier:** `applyCityDynamics.js` cluster dynamics (it already owns `S.neighborhoodDynamics` and the per-cluster formula). Game cycles bump NoiseIndex/RetailVitality in nightlife clusters for that cycle only, feeding the existing phase08 `v3NeighborhoodWriter` path — no new write path.

### Hop 8 — Evening media · WIRED
`phase07-evening-media/buildEveningMedia.js:375` + `sportsStreaming.js:33-35` — the game is what the city watched that evening, built from the actual feed entries (storyAngle first).

### Hop 9 — The next morning · GAP
`sportsSentimentBoost` is recomputed from the feed each cycle: no feed row next cycle → boost = 0 → the win evaporates overnight. Real streaks have afterglow; real losses linger.
**Carrier:** the T3b crime-carry pattern (`applyCityDynamics` + `finalizeCycleState` serialization, shipped S296, verified C112-C113). A decaying sports residue: carry ~half the prior cycle's boost into the next cycle, decay to zero in 1-2 cycles, streak extends the tail. Same serialization, one more field.

### Hop 10 — Proof-of-why · WIRED spine, must be used at every gap
`recordRipple_` (engine.45 ledger) carries causeId + targetScope + targetIds. Hop 3 already records. Hops 4-7 each record their own Ripple row with `causeId: Oakland_Sports_Feed.gameNight` and exact target IDs (POPIDs / BIZ_IDs / neighborhood names) — the causal chain from Mike's one feed row to every touched entity is queryable, and desk seeds name real rows.

**The quiet case is load-bearing:** no feed entry → hops 3-7 and 9 emit nothing. A game only exists when Mike played one.

**Universal-protagonism test, per hop:** each hop writes to a row that drives a fate — a citizen's LifeHistory line the dials compress, a household note on the row, a business's Growth_Rate, a neighborhood's vitality — never a log that merely observes. The bar that fills on game night has a better year; that is the whole point.

---

## Tasks

All tasks gated on Mike's approval of this design (S296 build moratorium — no code until the design is approved). Statuses stay `not started` until then.

### Task 1: Citizens watch the game (Hop 4)

- **Files:**
  - `phase05-citizens/generateCitizensEvents.js` — modify
- **Steps:**
  1. Where the sentiment pools build (~L1431-1442), add a game-night pool gated on `S.sportsFeedEntries` containing a game-type entry (same eventType check as `applyGameNightMoments.js:102`), entries tagged `source:sports|gameNight|streak:<streak>`, win/loss text split via exported `gameNightBucket_`.
  2. Weight by `Math.abs(S.sportsSentimentBoost)` using the crime-pressure weighting shape already in this file (S296).
  3. Record one Ripple row: causeId `Oakland_Sports_Feed.gameNight`, targetScope `citizen`, targetIds = POPIDs of citizens who drew a game-night event.
- **Verify:** node unit test — feed entry present → game-night entries appear in pool with tags; feed empty → pool absent; asserts on both.
- **Status:** [ ] not started

### Task 2: Households bend around the score (Hop 5)

- **Files:**
  - `phase05-citizens/runHouseholdEngine.js` — modify
- **Steps:**
  1. Add game-cycle household note pool (win/loss/streak buckets via `gameNightBucket_`) alongside the existing holiday/sports-season conditioning; fires only when `S.sportsFeedEntries` has a game entry.
  2. Ripple row per Task 1 pattern, targetScope `citizen`.
- **Verify:** node unit test — bucketed notes on game cycles only.
- **Status:** [ ] not started

### Task 3: Bars fill (Hop 6)

- **Files:**
  - `phase06-analysis/economicRippleEngine.js` — modify
- **Steps:**
  1. On game cycles, select Business_Ledger rows where Sector is hospitality/food AND Neighborhood maps to a nightlife-profiled Neighborhood_Map row (read NightlifeProfile col D via existing neighborhood resolution `:124-126`).
  2. Apply a small attributed Growth_Rate nudge (win > loss; magnitude from `sportsSentimentBoost`), via the file's existing write path.
  3. Ripple row: targetScope `business`, targetIds = nudged BIZ_IDs.
- **Verify:** node unit test with fixture ledger — only nightlife-neighborhood hospitality rows move; loss < win; no game → no writes.
- **Status:** [ ] not started

### Task 4: Neighborhood game-night texture (Hop 7)

- **Files:**
  - `phase02-world-state/applyCityDynamics.js` — modify
- **Steps:**
  1. In cluster dynamics, on game cycles bump NoiseIndex + RetailVitality for nightlife clusters (single-cycle, no carry), flowing through the existing `S.neighborhoodDynamics` → phase08 writer path.
- **Verify:** node unit test — nightlife cluster values differ game-cycle vs quiet-cycle; non-nightlife clusters unchanged.
- **Status:** [ ] not started

### Task 5: The morning after (Hop 9)

- **Files:**
  - `phase02-world-state/applyCityDynamics.js` — modify
  - `phase02-world-state/finalizeCycleState.js` (or wherever T3b serializes crime carry — confirm exact file at build time) — modify
- **Steps:**
  1. Serialize `sportsResidue = sportsSentimentBoost * 0.5` at cycle end via the T3b carry mechanism.
  2. Next cycle, fold residue into sentiment alongside any fresh boost; decay ×0.5 per cycle, floor at 0.
- **Verify:** two-cycle sandbox sequence — game at C(n), no feed at C(n+1): sentiment shows decayed residue, C(n+2) ≈ 0.
- **Status:** [ ] not started

### Task 6: Sandbox end-to-end verification

- **Files:** none (sandbox run + reads)
- **Steps:**
  1. Deploy Tasks 1-5 to sandbox; enter one game feed row; run a cycle.
  2. Read back: player LifeHistory moments (Hop 3), ≥1 citizen game-night event with sports tags (Hop 4), household notes (Hop 5), nudged hospitality BIZ rows (Hop 6), nightlife NoiseIndex/RetailVitality delta (Hop 7), Ripple rows at every hop naming `Oakland_Sports_Feed.gameNight` (Hop 10).
  3. Run the next cycle with an empty feed: residue decays (Hop 9) and hops 3-7 stay silent (quiet case).
- **Verify:** every acceptance criterion below observed in live sandbox sheet data, not script output.
- **Status:** [ ] not started

---

## Acceptance criteria

1. One feed row → attributed effects on ≥4 entity classes (citizen, household note, business, neighborhood) in one sandbox cycle, each with a Ripple row naming the game as cause and listing exact target IDs.
2. Quiet case: a cycle with no feed entry produces zero game-night writes at every hop.
3. Next-cycle residue: sentiment carry visible one cycle after the game, gone within two.
4. No new .js files; all changes land inside the four named existing engines.

---

## Open questions

- [ ] Task 3 magnitude: what Growth_Rate nudge is small enough to not distort the 71-row business economy over a 30-game season? Propose at build time from live Growth_Rate distribution; blocks Task 3.
- [ ] Task 5: exact file owning T3b's carry serialization (named from memory as finalizeCycleState — confirm before edit; blocks Task 5).

---

## Changelog

- 2026-07-05 — Initial draft (S297, engine-sheet). Written to satisfy the S296 build moratorium: connection design tracing one moment end-to-end before any build. Awaiting Mike's approval.
