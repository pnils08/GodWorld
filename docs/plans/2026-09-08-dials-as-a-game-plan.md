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
- **Verify:** unit: a seeded renter at burden 60 gets Friction cycle 1, Strain cycle 2; a buffered renter gets nothing; an owner gets nothing.
- **Status:** [ ] not started

### Task 4: the debt collision emits
- **Files:** `phase05-citizens/generationalWealthEngine.js` — the DebtLevel step (`iDebt` :1053 region, after the cycle's debt move)
- **Steps:** when `DebtLevel ≥ maneuverRetreatDebt` and not pressure-tagged: Friction/Strain by breach state, debt pool text.
- **Verify:** unit: DebtLevel 6 → Friction; 7 next cycle → Strain; 5 → nothing.
- **Status:** [ ] not started

### Task 5: the unemployment collision emits
- **Files:** `phase05-citizens/runCareerEngine.js` — `matchUnemployedToOpenings_` (:1134), after the slice
- **Steps:** every pool member NOT hired this cycle and not pressure-tagged: `[Stumble]` (`composure −2, drive −1`, already mapped) on the first unmatched cycle, `[Strain]` ongoing.
- **Verify:** unit: an unemployed adult unmatched two cycles carries Stumble then Strain; a hired one carries the hire line only.
- **Status:** [ ] not started

### Task 6: money losses carry the sign
- **Files:** `phase05-citizens/casinoLedgerEngine.js` (:480 LifeHistory write on resolve), `phase05-citizens/applyBusinessDynamics.js` (layoff lines, :325-339)
- **Steps:**
  1. Measure first: replay the live `[Money]` lines through `nudgesForEvent_`; if a casino loss text already routes negative through `CONTENT_RULES` (`/invest|lost money|…/`), no change there.
  2. A resolved casino loss ≥ `dialSetbackLossPct` of NetWorth tags `[Setback]` instead of `[Money]`; a layoff line tags `[Setback]` (`composure −5`, mapped) — only if the measure shows them landing positive or ambient today.
- **Verify:** the replay after the change: Money/Setback lines net negative on losses.
- **Status:** [ ] not started

### Task 7: the hood tint
- **Files:** `phase05-citizens/runNeighborhoodEngine.js` — the Neighborhood line emit
- **Steps:** when the citizen's hood in `S.neighborhoodState` sits at or above `dialHoodPressureBar` or `dialHoodCrimeBar`, and `!S.pressureTagged[pop]`: the line is tagged `[Friction]` from a hood-strain pool (rents on the block, the corner, the noise) and the citizen is pressure-tagged; otherwise the ordinary `[Neighborhood]` line. Neighborhoods runs before Career/Migration in Phase 5 (`godWorldEngine2.js:346` vs `:357`, `:380`), so the tint claims first and the collision emitters skip — one cause, one tag.
- **Verify:** unit: a citizen in a hood at pressure 9 gets one Friction; the same citizen over the rent bar gets no second tag that cycle.
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

## Changelog
- 2026-09-08 — created (engine-sheet, S437).
