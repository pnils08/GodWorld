---
title: Dials as a Game — six cuts (engine.176–181)
created: 2026-09-08
updated: 2026-09-08
type: plan
tags: [engine, citizens, dials, contests, citizen-loop, active]
sources:
  - docs/research/2026-09-08-dials-as-a-game.md — research.28, the measure + the six cuts + kimi's review (§Applications 2026-09-08)
  - docs/engine/ROLLOUT_PLAN.md — engine.176–181
  - builder direction 2026-09-08 (S437): "how the dials can determine outcomes and decide between 2 wanting the same thing … create something truly unique for our sim"
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout, engine.176–181"
  - "[[research/2026-09-08-dials-as-a-game]] — research basis; review notes live there"
  - "[[SIM_DOCTRINE]] — §2, §3, §10, §11, §13, §The test"
  - "[[plans/2026-09-02-bloodline-ascent]] — engine.157 posture/goal, the seam Cut E reads"
  - "[[plans/2026-06-19-living-city-full-population-coverage]] — engine.38 Phase B, absorbed by engine.176"
  - "[[reference/DEPLOY]] — bench protocol; one unbenched change in flight"
  - "[[index]] — registered same commit"
---

# Dials as a Game — six cuts (engine.176–181)

**Goal:** a citizen's dials cost something, close doors, and decide contests, on a feed that reaches every citizen every cycle and carries both signs.

**Architecture:** six serial cuts inside files that exist. engine.176 gives the feed a negative pole from the S436 money collisions and retunes ambient tags to tints. engine.177 folds every cycle behind a sim-cycle watermark and lets mood decay. engine.178 puts one band gate in each outcome engine that has none. engine.179 adds a dial-gap contest roll at four contested-resource sites. engine.180 hands the cron the game state as words and lets a wake push posture one notch, clamped. engine.181 is the citywide floor, filed as a watch. No ninth dial (engine.157), no raw float in a prompt (research.22), no new file, no character scan at a GC door (§10).

**Terminal:** engine-sheet (kimi advisory on review; the apparatus of engine.175 is kimi's, not this).

**Ordering rule:** 176 and 177 land in the SAME bench cycle on a fresh re-sync from live (177 alone hardens the city toward saint on today's diet). 178, 179, 180 one bench cycle each. 181 waits on what 176 shows. The bench is occupied by engine.175 (S438) at filing; nothing here fires until that clears. Every calibration value is a World_Config key self-armed at open (ADR-0015, the `phase01-config/engine94SheetContract.js` pattern, `ensureEngine160Config_` :89).

**Acceptance criteria (bench, 12 cycles on the 176+177 state):**
1. All-neutral share (eight dials in 40–60) falls from 60% (546/911); reported as the number.
2. Composure and integrity show non-zero counts below 40; `crimeReachable` is true for at least one citizen.
3. Negative share of net nudges ≥ 15% (today 2.5%: 366 / 14,816). Kimi's exit measure for "the feed is one-signed".
4. **Hard fail:** any citizen pinned at 0 or 100 on any dial.
5. Wake-eligible share (`deviation ≥ 60`, base+mood) rises without touching the gate.
6. Unlived capture count per cycle ≥ today's (engine.38 B3 not silently killed).
7. 0 `Engine_Errors`; `citizenDialMultiCycle.test.js` and the dial/bond/grief/unlived suites green against the new fold.

---

## engine.176 — the negative pole from causes + ambient as tint (Cut B)

**Doctrine test:** a renter whose rent eats half the household's income lives that pressure on the row; the world is allowed to hurt people (§3). Cause, then the fold.

**Design decisions (engine-sheet):**
- One pressure tag per citizen per cycle, first writer wins: `S.pressureTagged[popId]` set by whichever emitter fires first. Kimi's exclusivity rule — the same rent pressure must not land as Friction AND a tinted Neighborhood line.
- Recurrence decay (kimi's ratchet): the first cycle a collision is breached emits **Friction** (`composure −2`); every following breached cycle emits **Strain** (`composure −1`). Breach state is read off the citizen's own recent LifeHistory lines (a `[Friction]`/`[Strain]` in the last 3 stamped cycles = ongoing), no new column.
- Ambient tags go to ±1 (research §Cut B; kimi's arithmetic: +1/cycle equilibrates mood near 5 under 0.8 decay, a band crossing takes ~15 cycles of one-direction living).
- The hood sign comes from the **persisted** `Neighborhood_Map` (`HousingPressure`, `CrimeIndex`) via `S.neighborhoodState` (`phase02-world-state/loadNeighborhoodState.js:36-51`), never from the same-cycle `S.neighborhoodPulse` (kimi: circular edge).

### Task 1: retune the ambient map
- **Files:** `utilities/citizenDialMap.js` — modify `DIAL_MAP`
- **Steps:**
  1. Set `Neighborhood {sociability:1}`, `Daily {composure:1}`, `Personal {openness:1}`, `PrevEvening {outabout:1}`, `Background {composure:1}`, `Micro-Event {composure:1}` (unchanged), `Civic {sociability:1}`, `Civic Perception {sociability:1}`, `Sports {outabout:1}`, `Holiday {outabout:1}`, `FirstFriday {outabout:1}`, `CreationDay {outabout:1}`, `Weather {composure:1}` (unchanged). `Money` both directions untouched (`c0820e79`).
  2. Header comment: ambient tags tint (±1); named events reshape. Cite research.28.
- **Verify:** `node scripts/citizenDials.test.js` green; a one-off replay of the C106 snapshot through `nudgesForEvent_` shows Neighborhood total delta = count × 1.
- **Status:** [ ] not started

### Task 2: World_Config keys
- **Files:** `phase01-config/engine94SheetContract.js` — add `ensureEngine176Config_(ss)` beside `ensureEngine160Config_` (:89); the Phase-1 open call site that arms the others.
- **Keys:** `dialFrictionRentBurden` 50 (renters, unbuffered, matches `RISK_WEIGHTS.RENT_BURDEN_HIGH` at `migrationTrackingEngine.js:260`), `dialStumbleUnemployedCycles` 1, `dialSetbackLossPct` 5, `dialHoodPressureBar` (HousingPressure at or above which a hood tints), `dialHoodCrimeBar` (CrimeIndex likewise). Retreat debt reuses `maneuverRetreatDebt` (6) — no second key for the same bar.
- **Verify:** bench open: `World_Config` +5 rows; a missing key throws (engine.160 pattern).
- **Status:** [ ] not started

### Task 3: the rent collision emits
- **Files:** `phase05-citizens/migrationTrackingEngine.js` — modify the renter burden block (:246-267)
- **Steps:**
  1. When `rentBurden > dialFrictionRentBurden` and unbuffered and `!S.pressureTagged[pop]` for each adult member of the unit: emit `[Friction]` (first breach) or `[Strain]` (ongoing) with a rent line from a small pool; set `S.pressureTagged[pop]`; `LifeHistory_Log` append intent as the file already does for its own lines.
  2. Breach-state read: scan the member's last 3 stamped cycles of LifeHistory for `[Friction]`/`[Strain]`.
- **Verify:** helper-level unit proof shipped (`scripts/pressureTags.test.js`); SITE proof moves to the bench — read `S.pressureCounts` in the Phase 9 log line. Was: a seeded renter at burden 60 gets Friction cycle 1, Strain cycle 2; a buffered renter gets nothing; an owner gets nothing.
- **Status:** [ ] not started

### Task 4: the debt collision emits
- **Files:** `phase05-citizens/generationalWealthEngine.js` — the DebtLevel step (`iDebt` :1053 region, after the cycle's debt move)
- **Steps:** when `DebtLevel ≥ maneuverRetreatDebt` and not pressure-tagged: Friction/Strain by breach state, debt pool text.
- **Verify:** helper-level unit proof shipped (`scripts/pressureTags.test.js`); SITE proof moves to the bench — read `S.pressureCounts` in the Phase 9 log line. Was: DebtLevel 6 → Friction; 7 next cycle → Strain; 5 → nothing.
- **Status:** [ ] not started

### Task 5: the unemployment collision emits
- **Files:** `phase05-citizens/runCareerEngine.js` — `matchUnemployedToOpenings_` (:1134), after the slice
- **Steps:** every pool member NOT hired this cycle and not pressure-tagged: `[Stumble]` (`composure −2, drive −1`, already mapped) on the first unmatched cycle, `[Strain]` ongoing.
- **Verify:** helper-level unit proof shipped (`scripts/pressureTags.test.js`); SITE proof moves to the bench — read `S.pressureCounts` in the Phase 9 log line. Was: an unemployed adult unmatched two cycles carries Stumble then Strain; a hired one carries the hire line only.
- **Status:** [ ] not started

### Task 6: money losses carry the sign
- **Files:** `phase05-citizens/casinoLedgerEngine.js` (:480 LifeHistory write on resolve), `phase05-citizens/applyBusinessDynamics.js` (layoff lines, :325-339)
- **Steps:**
  1. Measure first: replay the live `[Money]` lines through `nudgesForEvent_`; if a casino loss text already routes negative through `CONTENT_RULES` (`/invest|lost money|…/`), no change there.
  2. A resolved casino loss ≥ `dialSetbackLossPct` of NetWorth tags `[Setback]` instead of `[Money]`; a layoff line tags `[Setback]` (`composure −5`, mapped) — only if the measure shows them landing positive or ambient today.
- **Verify:** `[Money]` measured balanced on live (342 pos / 313 neg), untouched; casino text routing + `[Setback]` unit-proven; layoff lines on the bench.
- **Status:** [ ] not started

### Task 7: the hood tint
- **Files:** `phase05-citizens/runNeighborhoodEngine.js` — the Neighborhood line emit
- **Steps:** when the citizen's hood in `S.neighborhoodState` sits at or above `dialHoodPressureBar` or `dialHoodCrimeBar`, and `!S.pressureTagged[pop]`: the line is tagged `[Friction]` from a hood-strain pool (rents on the block, the corner, the noise) and the citizen is pressure-tagged; otherwise the ordinary `[Neighborhood]` line. Neighborhoods runs before Career/Migration in Phase 5 (`godWorldEngine2.js:346` vs `:357`, `:380`), so the tint claims first and the collision emitters skip — one cause, one tag.
- **Verify:** helper-level unit proof shipped (`scripts/pressureTags.test.js`); SITE proof moves to the bench — read `S.pressureCounts` in the Phase 9 log line. Was: a citizen in a hood at pressure 9 gets one Friction; the same citizen over the rent bar gets no second tag that cycle.
- **Status:** [ ] not started

**Bench (with 177):** acceptance 3 and 4 above; log per-emitter counts to the phase log.

---

## engine.177 — fold every cycle behind a watermark; mood decays (Cut A)

**Doctrine test:** the 75% of rows nothing has ever moved start moving from what they lived. No outcome is set; the fold reads the row.

**Design decisions (engine-sheet):**
- **Watermark = absolute sim cycle.** 13,883 of 14,966 live lines carry `Y<n>C<m>` and `parseHistoryLine_` already resolves it to `entry.cycle` (`compressLifeHistory.js`, inWorldMatch). `DialState.folded` = the highest cycle folded. Each cycle: fold every entry with `cycle > folded`; set `folded`.
- **Legacy rule (kimi):** entries with `cycle == null` (913 timestamp-prefixed + 170 bare lines, the archive era) fold ONCE via the trim path exactly as today — `foldAgedOutEntries_` gets a predicate and folds only `cycle == null` entries; stamped entries at trim are skipped (already folded by the watermark). Explicit, not a silent default.
- **Mood persists and decays.** `serializeDialState_` adds `mood`; `deserialize_` reads it; `settleCycle_` (`citizenMemory.js:146`, `MOOD_DECAY 0.8`) runs once per citizen per cycle BEFORE new events land. `zeroMood_` is retired from the per-cycle path (kept only where a full re-seed legitimately zeroes).
- **Unlived capture moves to arrival** (kimi hazard): the watermark fold captures `UNLIVED_BRANCH_TAGS` entries into `regs.unlived` when it folds them; the trim path keeps capture for legacy entries only.
- **Cadence:** the watermark fold runs every cycle; the face rewrite and the trim keep `MIN_CYCLES_BETWEEN_COMPRESS = 5` (`Updated:cN` is the guard the wake journal and the face readers rely on).
- **Harden semantics change:** streak counts consecutive same-direction events; under per-cycle folding that is roughly three cycles, closer to the DF intent. Not tuned by guess — the multi-cycle harness decides.

### Task 1: the watermark fold
- **Files:** `utilities/compressLifeHistory.js` — modify the per-row loop (:462-601), `foldAgedOutEntries_` (:1373), `serializeDialState_` (:1184), `deserialize_` path; `utilities/citizenMemory.js` — `settleCycle_` gains a caller.
- **Steps:**
  1. Per row: `dialRmwNeeded` is true whenever stamped entries newer than `folded` exist (or pending reflections/bias/grief as today).
  2. Order inside the fold: deserialize → `decayChaosExposure_` → `settleCycle_` → `foldNewEntries_(c, entries, folded, regs)` (new helper in this file: applies `applyEvent_` per entry with `cycle > folded`, captures unlived, returns the max cycle) → set `c.folded` → reflections → bias → (if compressEligible) trim with the legacy-only predicate + face rewrite → serialize.
  3. `serializeDialState_`: `{base, streak, mood, folded, chaosExposure?, maneuver?}`. Additive; old rows deserialize with `mood` zero and `folded` = 0 (first watermark run folds everything stamped — the one-time catch-up, same as the backdate did, now on live history).
  4. Comment sweep (kimi): `serializeDialState_` header (:1181 "never stored"), the S269 rationale on `accreteReflectionsIntoBase_` (`citizenMemory.js:116-125`), the fold/trim agreement header (:1360). Bump `COMPRESS_VERSION` to `3.0` and the `@version` tag (:63, stale at 1.4).
- **Verify:** `node scripts/citizenDialMultiCycle.test.js` (never-erase, bounded, harden-on-pattern, crime-locks-on-pattern) rewritten for per-cycle folding; `compressLifeHistory.dial/bond/unlived/bias`, `griefPeriod`, `chaosTrauma` suites green; a seeded citizen with 12 stamped lines and `folded` unset folds all 12 once, then 0 on a re-run.
- **Status:** [ ] not started

### Task 2: catch-up sizing
- **Files:** none (measure)
- **Steps:** replay the C106 snapshot through the new fold offline: the first-cycle catch-up folds ~13,900 stamped entries across 911 citizens in one Phase 9. Report the band table after catch-up and after 12 further cycles with 176's emitters modelled at their bench rates.
- **Verify:** acceptance 1, 2, 4 hold on the offline replay before the bench fire.
- **Status:** [ ] not started

**Bench (with 176):** one re-synced C106 → 12 cycles; the acceptance block above.

---

## engine.178 — dials close doors (Cut C)

**Doctrine test:** a principled citizen who never sits at the table; a homebody who turns down the move; a warm spouse whose marriage holds through the debt year. The dice are the same dice.

Each read is one `getCitizenDialBands_` call at a roll that already exists. Bars are World_Config keys (`ensureEngine178Config_`).

### Task 1: relocation — openness
- **Files:** `phase05-citizens/migrationTrackingEngine.js:681` (the lane chance × maneuver factor)
- **Steps:** misfit lane: `bands.openness ≤ −2` → chance 0 (refuses the move); `≥ +2` → the income threshold for the misfit lane × `dialOpenMoveThresholdMult` (0.8). Pressure lane untouched (displacement is a cause, not a want).
- **Verify:** unit: a rich homebody at openness 15 never takes the misfit lane in 50 seeded rolls; an open citizen moves at 2.0× hood median.
- **Status:** [ ] not started

### Task 2: casino — integrity and composure, composed with posture
- **Files:** `phase05-citizens/casinoLedgerEngine.js:685-701`
- **Steps:** gate AROUND the engine.157 posture factor (kimi): `bands.integrity ≥ +2` → placement `p = 0` (does not sit down); `bands.composure ≤ −2` → the tilt band: stake draw `weekly × (0.12 + 0.18·rng)` regardless of posture, under the existing 25% cap. No re-read of raw drive beside the posture factor.
- **Verify:** unit: an incorruptible never appears in `Casino_Ledger`; a volatile citizen's stake sits in the tilt band.
- **Status:** [ ] not started

### Task 3: bonds — warmth and family, consolidated to bands
- **Files:** `phase05-citizens/bondEngine.js` — `bondWarmthFactor_` (:1911), `bondFamilyFactor_` (:1917), `bondTraitOf_` (face regex), the intensity drift step (:641-846 per kimi's read)
- **Steps:**
  1. Replace the `TraitProfile` face regex in both factors with the band surface: factor = `1 + 0.125 × avg(signed band A, signed band B)` → the same 0.75–1.25 envelope off live base, not the cadence-lagged face. `bondTraitOf_` retired.
  2. Warmth as **maintenance**: the per-cycle intensity drift of an established bond is scaled by the pair's warmth factor (a cold pair's bond decays faster; a warm pair's holds). Growth on formation keeps the one factor — no stacking (kimi: friendship must not carry warmth twice).
- **Verify:** `compressLifeHistory.bond.test.js` + bond suites green; unit: identical pairs at warmth 80/80 vs 20/20 diverge on intensity over 10 quiet cycles; §11 shape holds (establish → maintain → mature → marry, no formation shortcut).
- **Status:** [ ] not started

### Task 4: business — the owner's composure and drive
- **Files:** `phase05-citizens/applyBusinessDynamics.js` — the streak/closure step (:325-339)
- **Steps:** owner `bands.composure ≥ +1` → the closure streak bar `bizClosureStreak` +1 for that business (survives one more bad quarter); `≤ −1` → −1. Owner `bands.drive ≥ +2` → expansion roll ×1.25.
- **Verify:** unit: two identical failing businesses, steady vs volatile owner, close one cycle apart.
- **Status:** [ ] not started

### Task 5: civic — integrity on the scandal ceiling
- **Files:** `phase05-citizens/runCivicElectionsv1.js:334` (the engine.94 27.10 ceiling)
- **Steps:** scandal odds × `BAND_MULT` inverted on integrity (band −2 → ×1.5, +2 → ×0.5).
- **Verify:** unit over 200 seeded rolls: low-integrity incumbents scandal ~3× high-integrity at the same approval.
- **Status:** [ ] not started

**Bench:** one cycle; per-gate counts in the phase log; 0 errors.

---

## engine.179 — contests resolved by character (Cut D)

**Doctrine test:** two citizens wanted the same job, storefront, seat, person; character and dice said who. Causes, then dice (§2). The underdog can always win.

**Design decisions (engine-sheet), kimi's conditions pinned:**
- `contestRoll_(ctx, aBands, bBands, dials)` in `utilities/citizenMemory.js`: exactly two dials per contest, weight 1 each; `gap = Σ(bandA − bandB)` over the two dials (−8..+8); `p(a) = clamp(0.5 + 0.08 × gap, 0.2, 0.8)`; roll `ctx.rng()`. Pins at 0.8 from gap ≥ 3.75 — the fully polar mismatch caps at 4:1.
- Credential enters on the band scale, never as an ordinal: `none −2, hs-diploma −1, some-college/associates 0, bachelors +1, masters/doctorate +2` (a small map in the same file).
- Every contest logs `{site, a, b, gap, p, winner}` to `S.contests` and one phase-log line; the bench reports the gap distribution beside the underdog rate.
- **Fenced (§10):** the family-match lottery (`processAdvancementIntake.js:1638`) and the GC marriage lottery (`bondEngine.js:2396`) — two reels and a miss, no new character term, no scan. engine.59's fitness/family factors there are Mike-ruled and stay. The spouse-merge target is structural; untouched.

### Task 1: the helper + credential map
- **Files:** `utilities/citizenMemory.js` — add `contestRoll_`, `CREDENTIAL_BAND`; export both.
- **Verify:** unit: gap 0 → p 0.5; gap +4 → 0.8; gap −8 → 0.2; 10,000 rolls at gap +2 land 0.66 ± 0.02.
- **Status:** [ ] not started

### Task 2: the job slot
- **Files:** `phase05-citizens/runCareerEngine.js:159-166, :1189` (`hireSlotOrder_` + the slice); `phase05-citizens/educationCareerEngine.js:1270` (adult intake random pick)
- **Steps:** the need sort stays (poorest first is the cause). Among candidates tied on the need band for the last open slot, `contestRoll_` on `[drive, credential]`; the loser stays in the pool. Adult intake: among businesses with room, the citizen's `[drive, composure]` against the room-holder's next applicant when two land on one slot in the same cycle; otherwise unchanged.
- **Verify:** unit: two unemployed at the same income band, drive 80 vs 30, one slot: the driven one wins ~66% over 1,000 seeds.
- **Status:** [ ] not started

### Task 3: the heritage storefront stake
- **Files:** `phase05-citizens/generationalWealthEngine.js:2416-2427`
- **Steps:** among living members over the $100k stake floor, `contestRoll_` on `[drive, integrity]` pairwise (bracket, deterministic order by POPID); wealth is the floor, not the pick.
- **Verify:** unit: a line with a rich idle heir and a driven cousin over the floor: the cousin stakes ~66%.
- **Status:** [ ] not started

### Task 4: the civic challenger
- **Files:** `phase05-citizens/runCivicElectionsv1.js:282-296`
- **Steps:** the tier-weighted pool stays; the final pick among the top-weighted two is `contestRoll_` on `[sociability, integrity]`.
- **Verify:** unit over seeds: the sociable principled candidate is picked ~66% against an equal-tier rival.
- **Status:** [ ] not started

### Task 5: the romantic triangle, the flagship
- **Files:** `phase05-citizens/bondEngine.js:2529-2560` (`detectTriangleRivalries_`), the maturation step
- **Steps:** the RIVALRY bond still forms at collision. From the next cycle, while both suitors hold a ROMANTIC bond to the same citizen, each maturation tick runs `contestRoll_` on `[warmth, sociability]`; the winner's bond takes the tick, the loser's does not. The loser keeps the rivalry; the +1.5 co-active drift (`:656-677`) means it self-reinforces — intended, confirmed here.
- **Verify:** unit: a triangle resolves within 10 cycles ~80% of seeds; the warm suitor wins ~66%; §11 shape unchanged (maturation pace only, no formation, no marriage shortcut).
- **Status:** [ ] not started

**Bench:** one cycle on the 176+177 state; `S.contests` count > 0; gap distribution + underdog rate 20–40% reported.

---

## engine.180 — the cron reads the game, and pushes one notch (Cut E)

**Doctrine test:** the citizen wakes knowing what they are playing for and what the cycle threw; what they say can lean the next cycle, never steer it (§13: color, not fact).

### Task 1: `stance()` beside `disposition()`
- **Files:** `lib/citizenDials.js` — add `stance(json)` → `{goal, posture, since}` off `DialState.maneuver {p, g, a, c}`; add `thrown(lifeHistory, sinceCycle)` → the tag words folded since the last wake (negative tags named as words: "a rent squeeze", "a cycle without work"), never a number.
- **Verify:** `lib/citizenDials.test.js` extended; null-safe on rows without `maneuver`.
- **Status:** [ ] not started

### Task 2: three fact lines in every voice
- **Files:** `scripts/citizen-wake.js:199`, `scripts/citizen-exchange.js:107`, `scripts/citizenVoice.js:132` — beside the temperament line: `What you are playing for: <goal>. How you are playing it: <posture>. What the cycle threw at you: <thrown>.`
- **Verify:** a dry-run wake prints the three lines; grep the prompt for digits → none from dials.
- **Status:** [ ] not started

### Task 3: the posture-changed wake slot
- **Files:** `scripts/citizen-wake.js:174-183` (the voiced-slot pattern)
- **Steps:** a second special slot: any citizen whose LifeHistory carries a `[Maneuver-*]` line stamped the current cycle and who has not woken since → eligible regardless of deviation, least-recently-woken first. One per wake.
- **Verify:** `logs/citizen-wake-offered.jsonl` shows the slot; the deviation gate untouched for the ordinary draw.
- **Status:** [ ] not started

### Task 4: the one-notch push, clamped
- **Files:** `utilities/compressLifeHistory.js` (the Phase 9 drain, `readPendingReflections_` :284), `phase05-citizens/maneuverEngine.js` (posture set, :214)
- **Steps:**
  1. Drain: a `Resolves` (col K) whose text names an action (a bounded verb list: look for / apply / open / move / save / stop) writes `DialState.maneuver.push = {dir: +1 | −1, until: cycle + 1}`.
  2. Maneuver, next cycle, AFTER computing posture from causes: apply the push one notch only if no cause-held retreat (DebtLevel ≥ bar, standing near the bar) and only while `cycle ≤ until`; then clear `push`. A wake never lifts a cause-held retreat (kimi; §13).
- **Verify:** `maneuverEngine.test.js`: hold + push → climb for one cycle then hold; retreat-by-debt + push → retreat.
- **Status:** [ ] not started

### Task 5: render what the desk already computes; drop the orphan
- **Files:** `scripts/cron-desk-run.js:1085` (quote render gains the temperament phrase); `scripts/buildWorldState.js:162-175, :201` (remove the `dispositions` write — no reader).
- **Verify:** a desk packet shows `— name (temperament): "quote"`; `world_state.json` no longer carries `dispositions`.
- **Status:** [ ] not started

**Bench:** the next three scheduled wakes after deploy (no manual demo); the C+1 maneuver phase log shows pushes applied/blocked.

---

## engine.181 — the citywide floor (Cut F) — WATCH

Filed, not designed. Trigger: after 176+177 have run three live cycles, read the citywide negative share and `Crime_Metrics`. If the negative share climbs past 35% or any hood's mean composure band drops to −1, design the RimWorld floor (ambient tint leans positive citywide) as its own cut. Until then, nothing.

---

## Status log

### engine.176–181 — filed 2026-09-08 (S437/S438, engine-sheet)
Plan ignited from research.28 after kimi's review (adopt, order endorsed, conditions folded in above). Bench occupied by engine.175 at filing.

### engine.176 + engine.177 — CUT LOCALLY 2026-09-08 (S438, builder go), UNBENCHED
Code + unit proof landed; waits for a fresh SANDBOX re-sync from live once engine.175's bench cycle clears. Decisions made in the cut (engine-sheet):
- **177 watermark = absolute sim cycle off `entry.cycle`**; entries with cycle null OR ≤ 0 (`C0`, `C?`, timestamp-era) are legacy and fold once at trim (`foldAgedOutEntries_(…, unstampedOnly=true)`). `DialState` persists `{base, streak, mood, folded}`; `settleCycle_` runs once per row per cycle before new events; a row with residual mood is settled even on a quiet cycle. Unlived capture moved to arrival (`foldOneEntry_`). `COMPRESS_VERSION` 3.0.
- **Edge-damped hardening** (`applyEvent_`): hardening toward an edge has room `1 − |base−50|/50`, back toward the middle full room. Reason: the offline C106 catch-up (13,924 entries in one Phase 9, no double count) tipped 16 seed-era citizens at 91–99 to 100; with the damp the pin count holds at the 5 that live already carries (POP-00001 drive, four sociability). Acceptance 4 is now structural, both directions.
- **176 pressure tags** (`emitPressureTag_`, `utilities/citizenDialMap.js`): first breach Friction (Stumble for unemployment), ongoing Strain, **adapted after `PRESSURE_ADAPT = 6` consecutive tagged cycles** (Dwarf Fortress desensitization — answers kimi's ratchet without a floor cap; a clean cycle resets). One tag per citizen per cycle, first writer wins: the hood tint in Neighborhoods (before Career/Money/Migration), then unemployment (Career), debt (Money loop), rent (Migration risk walk). Breach state read off the row's own last 24 LifeHistory lines. Casino loss text routes −3; a loss ≥ `dialSetbackLossPct` of net worth or a borrow-to-walk-home logs `[Setback]`. `Career-Layoff` mapped −5/−2. World_Config +4 (`ensureEngine176Config_`); `maneuverRetreatDebt` reused for the debt bar. `[Money]` lines were already balanced on live (342 pos / 313 neg) — no change there.
- **Ambient retune** to ±1 across Neighborhood/Daily/Personal/PrevEvening/Background/Civic/Civic Perception/Lifestyle/Sports/Season/Team/Holiday/FirstFriday/CreationDay.
- Unit proof: `scripts/pressureTags.test.js` 33/33 (new); `citizenDialMultiCycle` 15, `compressLifeHistory.dial` 49, `engine32MultiCycle` 19, `unlivedFold` 23, `biasFold` 25, `griefPeriod` 38, `chaosTrauma` 26, `citizenDials` 38, `migrationRelocation` 47 (harness given the dial-map globals + the rent key), `hoodIncome` 74, `careerStage` 83, `employerSuccess` 58, `casinoLedgerEngine` ok, `maneuverEngine` 47; full suite 215/216 (the one failure, `djDirect.schema-and-slot`, is a missing C94 sift fixture, pre-existing).
- Offline replay of the live C106 snapshot through the new fold: 922 rows updated, 13,924 entries folded, all-neutral 546 → 538 (the tints are small by design; the emitters are what the bench measures), wake-eligible 218 → 256 after catch-up (mood) → 227 after 12 quiet cycles, pins 5 → 5.
- **Advisor pass (S438), fixed same night:** hood bars re-set from the live distribution (`dialHoodPressureBar` 3 → 5 of 22 hoods; `dialHoodCrimeBar` 1.0 → 4 hoods; at 8 both were inert — HousingPressure tops at 4.5, CrimeIndex at 1.11); the unemployment emitter gates on **Income 0** as well as no employer (the live pool is 19 self-employed creatives at $55–90k — not jobless); `scripts/backdateCitizenDials.js` + `seedTier1EssenceLive.js` set `folded` to the newest stamped col-O entry after a rebuild (else the next Phase 9 re-folds the raw window); `S.pressureCounts` prints in the Phase 9 log line.
- **Hazards recorded:** (1) adaptation is cross-cause — six cycles of rent Strain marks the citizen adapted and a fresh job loss the next cycle emits nothing; a new cause arguably breaks through — for kimi; (2) edge damping gives room 0.6–0.8 at base 60–70, so kimi's ~15 cycles to a band crossing is now a floor; (3) the hood tint is the largest emitter by reach (~12% Neighborhood draw across 8 pressured hoods) — the bench's per-cause counts decide whether the bars hold.
- **Bench next:** fresh SANDBOX re-sync from live (not a revert to C105 — the catch-up must run on the current LifeHistory), then 12 cycles; acceptance block above; per-emitter counts in `S.pressureCounts` land in the phase log.

### engine.178 — CUT LOCALLY 2026-09-08 (S438, builder go), UNBENCHED
Five reads, each one `getCitizenDialBands_` call with the row's DialState string passed (the `ctx.citizenLookup` cache is built late in Phase 5 by `generateCitizensEvents`, so every earlier site must pass the string). World_Config +5 via `ensureEngine178Config_`. Decisions in the cut:
- **Relocation** (`processRelocations_`): the unit head's openness band — `−2` never takes the misfit lane, `+2` clears `MISFIT_INCOME_RATIO × dialOpenMoveThresholdMult` (0.8). The pressure lane reads no dial. Site proof on the bench (the harness has no DialState rows).
- **Casino**: integrity `+2` → skipped before eligibility (`S.casinoGates.refused`); composure `−2` → `casinoStake_(…, tilt=true)` draws the climb band and ignores a retreat's halving (`S.casinoGates.tilt`). Both sit around the engine.157 posture factor, which stays.
- **Bonds**: `bondDialBand_` / `bondPairFactor_` replace the face regex in `bondWarmthFactor_` / `bondFamilyFactor_` and the GC-marriage family term — signed band off live DialState, face as fallback, same 0.75–1.25 envelope (kimi: consolidated, not stacked). Warmth as maintenance: the stale-bond decay (`bondAge > 15` and untouched > 5 cycles, −0.5) scales by `2 − warmthFactor` (warm pair ×0.75, cold ×1.25). Growth keeps its one factor.
- **Business**: `bizOwnerBands_` resolves the owner from `Key_Personnel` (owner/founder tag) by POPID, else by full name — live has 21 cells with personnel, 6 with a POPID, so the name path carries most of the reach. Closure bar `bizClosureStreak ± dialOwnerStreakRoom` (1) by owner composure band; a positive drift × `dialOwnerDriveExpandMult` (1.25) at drive `+2`, never a negative one.
- **Civic**: `holderIntegrityBand_` resolves the officeholder by name against the ledger (the office row carries no POPID); `applyApprovalCeilingRisk_` takes `chanceMult` — `−2` × `dialIntegrityScandalLow` (1.5), `+2` × `dialIntegrityScandalHigh` (0.5), ±1 halfway, still capped at `maxChance`. Reason line records the multiplier.
- Proof: `scripts/dialGates.test.js` 30/30 (new — casino band, bond bands/factors/maintenance, owner resolution by POPID and name, drift expansion never on a bad week, civic multiplier + holder resolution); touched suites green (`migrationRelocation` 47, `casinoLedgerEngine` ok, `civicApprovalCeiling` 101, `hoodIncome` 74, `careerStage` 83, `employerSuccess` 58, `householdReconcile` 105, `maneuverEngine` 47, `archiveHeritageResolve` 15) plus the dial suites.
- Bench: after 176+177's 12 cycles on the same re-sync, one cycle with 178; read `S.casinoGates`, `out.ownerRoom`, the civic reason lines, and the relocation lane counts.

### engine.179 — CUT LOCALLY 2026-09-08 (S438, builder go), UNBENCHED
`contestRoll_(S, rng, aTerms, bTerms, site, aId, bId)` + `credentialBand_` in `utilities/citizenMemory.js` — exactly two terms, weight 1, band-clamped, `p = clamp(0.5 + 0.08·gap, 0.2, 0.8)`, every contest tallied into `S.contests {n, aWins, underdogWins, bySite, gaps}` and printed on the Phase 9 log line. Decisions in the cut:
- **Job slot**: the LAST open slot is contested only when the first left-out candidate shares its need band — drive + credential (credential on the band scale: none −2 … masters/doctorate +2). The need sort stays. Adult intake (`educationCareerEngine.js:1270`) is a business pick, not two citizens wanting one thing — left as is, recorded here as the deviation from Task 2.
- **Heritage stake**: wealth is the floor ($100k); every living member over it contests on drive + integrity, wealthiest as first champion, challengers in POPID order.
- **Civic challenger**: a second draw from the same tier-weighted pool contests the nomination on sociability + integrity; the tier weighting stays the cause.
- **Romantic triangle**: `romanceRivalOf_` / `romanceSuitorOf_` (one index per cycle, ACTIVE romances only); when a romance shares an endpoint with a rival's, each tick is contested on warmth + sociability via `bondDialBand_` — the loser's bond takes no step that week (`rr = 1`), the rivalry bond keeps burning. Pace only; §11 shape untouched.
- Proof: `scripts/contestRoll.test.js` 31/31 (curve, clamps, two-term rule, 10k-roll distributions at gap +2 and the 0.2 floor, bookkeeping, credential map, triangle helpers); touched suites green (`careerStage` 83, `employerSuccess` 58, `hoodIncome` 74, `archiveHeritageResolve` 15, `householdReconcile` 105, `civicApprovalCeiling` 101) plus the dial suites and `dialGates` 30.
- Bench: one cycle after 178's; read `S.contests` on the Phase 9 log line — the gap distribution and the underdog rate (kimi: meaningful only on the post-176/177 population).

## Changelog
- 2026-09-08 — created (engine-sheet, S437).
- 2026-09-08 — engine.176 + engine.177 cut locally, unit-proven, unbenched (engine-sheet, S438). Edge-damped hardening + the adaptation rule recorded under §Status log.
- 2026-09-08 — engine.178 cut locally (builder go, S438), unbenched. See §Status log.
- 2026-09-08 — engine.179 cut locally (builder go, S438), unbenched. See §Status log.
