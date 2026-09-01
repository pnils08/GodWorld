---
title: Casino Ledger (Undocked Phase 4b) Plan
created: 2026-08-31
updated: 2026-08-31
type: plan
tags: [engine, citizens, sports, draft]
sources:
  - docs/research/2026-08-29-casino-ledger.md
  - docs/plans/2026-08-07-spacemolt-game-show.md §Phase 4
  - docs/plans/PLAN_TEMPLATE.md
  - docs/SIM_DOCTRINE.md
  - docs/SIMULATION_LEDGER.md §Economics Z–AE
  - schemas/SCHEMA_HEADERS.md — Simulation_Ledger, Household_Ledger, Oakland_Sports_Feed, Undocked_Feed, Business_Ledger
  - docs/engine/ENGINE_STUB_MAP.md — loadUndockedFeed_ / processMoneyLoop_ / applySportsSeason_
  - docs/engine/SHEETS_MANIFEST.md §8 sports feeds
  - docs/plans/2026-08-29-employment-system-cascade.md §Direction 17–21
  - output/grok/wiring-processMoneyLoop.md
  - output/grok/wiring-loadUndockedFeed.md
pointers:
  - "[[../research/2026-08-29-casino-ledger]] — Kimi's 12-question record; this plan answers it"
  - "[[../plans/2026-08-07-spacemolt-game-show]] — owning show plan; 4b gate lives there"
  - "[[../plans/PLAN_TEMPLATE]] — shape"
  - "[[../engine/ROLLOUT_PLAN]] — pending-state currently on research.27; Claude files a 4b row on accept"
---

# Casino Ledger (Undocked Phase 4b) Plan

**Reviewer note (grok, 2026-08-31):** Inbox copy only. Not registered. This is the 4b design doc Kimi's research said was missing. It authorizes no Sheet, no balance, no odds. Mike-only sign-off still gates every money-moving task (Tasks 4–12). Task 0–1 (wager talk, no money) is still Phase 4a and can ship without that sign-off. On accept: move to `docs/plans/2026-08-31-casino-ledger.md`, register in `docs/index.md`, back-link from the show plan's 4b bullet. Proposed rollout row at the bottom.

**Goal:** After Mike signs off, the engine settles in-world wagers against UNDOCKED episode rows and A's/Oaks `game-result` rows, moving citizen `NetWorth` / `DebtLevel` and writing a `[Casino]` week, so a bet can make a life better or worse without touching jobs, tiers, factions, or the Initiative_Tracker.

**Architecture:** One new tab (`Casino_Ledger`) plus one new function (`processCasinoLedger_`) called from `processGenerationalWealth_` immediately before `processMoneyLoop_`. Placement and settlement are deterministic given feed rows + `ctx.rng` for *who bets* and *which side*, never for *whether the event happened*. UNDOCKED is the proving market (typed `CreditsDelta` / `MishapCount` / `EpisodeId` already on the feed). Sports is a standing moneyline on the next `game-result` whose `Streak` is `W#` or `L#` — no new Oakland_Sports_Feed columns. Operator is the existing business `BIZ-00100` Oakland Casino Town. Civic/election markets are parked.

**Terminal:** engine-sheet executes substrate; research-build reviews/registers. Grok authored. Faction routing and tracker writes are out of scope.

**Pointers:**
- Prior work: `docs/research/2026-08-29-casino-ledger.md` (kimi, watch)
- Related plan: [[../plans/2026-08-07-spacemolt-game-show]] Phase 4b
- Research basis: [[../research/2026-08-29-casino-ledger]], [[../research/2026-08-03-game-environment-review]] §3.3, [[../research/2026-07-27-spacemolt-citizen-agency-cultural-phenomenon]]
- Wiring cards: `output/grok/wiring-processMoneyLoop.md`, `output/grok/wiring-loadUndockedFeed.md` (OpenRouter Haiku, 2026-08-31)
- Citizen doctrine: employment-cascade plan Direction 17–21 (2026-08-30) — advancement is tiers + media + UNDOCKED + casino; a bet is not a promotion

**Acceptance criteria:**
1. A synthetic (non-canon) citizen with an open UNDOCKED wager settles against a matching `Undocked_Feed.EpisodeId` for this cycle: `NetWorth` moves by the posted payout, a `[Casino]` LifeHistory line lands, `Casino_Ledger.Status=settled`, and a cycle re-run does not double-pay.
2. A synthetic citizen with an open A's moneyline settles only when this cycle's `Oakland_Sports_Feed` contains `EventType=game-result` and `Streak` matching `/^(W|L)\d+$/`; missing streak = carry, never invent a winner.
3. A loss that zeros `NetWorth` increments `DebtLevel` by 1 (levels 0–6, same as `processMoneyLoop_`) and, when the loss exceeds one week's income, debits `Household_Ledger.HouseholdSavings` so `processMigrationTracking_` can see the week.
4. Zero writes to `Tier`, `RoleType`, `EmployerBizId`, `CareerStage`, `Initiative_Tracker`, or any civic-office tab. House staff (`EmployerBizId=BIZ-00100`) and this-cycle UNDOCKED pilots cannot open a show market.

---

## What Kimi got right, and what the ledger actually does

Kimi's record is the question list. Verified against stub / ctx / schema / live code on 2026-08-31 (C105, ledger 968). Three corrections change the design:

1. **Phase 4a wager texture was never authored.** `scripts/undockedEclPool.js` shipped watch / argue / love / sting / lottery / aspire. No stake, odds, or bookie line. The 2026-08-17 ECL pass is show color, not 4a. The undocked flags themselves are live (`generateCitizensEvents.js:2648-2651`; C105 loaded 6 episodes). People already watch. They do not yet talk money.
2. **`DebtLevel` is a 0–6 *level*, not dollars.** `processMoneyLoop_` (`generationalWealthEngine.js:350-367`) increments/decrements an integer cap 6. `docs/SIMULATION_LEDGER.md:233` still says "Dollar amount" — stale. Stake-cap math that treats AE as cash will detonate the money loop.
3. **`updateHouseholdWealth_` is inert on the live schema.** It returns immediately unless column `HouseholdWealth` exists (`:1156`). `schemas/SCHEMA_HEADERS.md` Household_Ledger is A–M and the savings column is `HouseholdSavings`. The aggregator Kimi wanted to ride does not run. Casino losses must debit `HouseholdSavings` themselves or the household does not feel the week. Displacement (`migrationTrackingEngine.js:251`) keys off 12 months of rent in `HouseholdSavings`, not citizen `NetWorth`.

S361 "wealth scale is real-world Oakland" is partly superseded: `deriveWealthLevel_` is pure NetWorth bands 0–12 (S363 + engine.135 D1, `generationalWealthEngine.js:836-861`). Income was re-based on bench. The remaining hazard is distributional skew (snapshot still piles into WL6–8), so caps key off `Income/52` and `NetWorth`, never off a WL lookup table built from 2024 Oakland.

---

## The shape (answers to Kimi's 12)

### 1. Event IDs

Two market families. One row on `Casino_Ledger` points at exactly one settled-outcome row.

| Family | Outcome source | EventId | Wagerable fields |
|---|---|---|---|
| `undocked` | `Undocked_Feed` where `TargetCycle == S.cycle` | `EpisodeId` (required, fail-closed if blank) | `credits_sign` (CreditsDelta > 0), `mishap` (MishapCount > 0), `night_winner` (max CreditsDelta among this cycle's pilots; ties break by POPID) |
| `sports` | `Oakland_Sports_Feed` this cycle, `EventType=game-result` | `Cycle\|TeamsUsed\|Streak` (no EpisodeId on that tab) | `moneyline` — home franchise win if `Streak` matches `/^W\d+$/`, loss if `/^L\d+$/` |

`loadUndockedFeed_` (`loadEventContentLedger.js:291`) is read-only, TargetCycle-only, missing-tab no-op. Casino is a **new consumer**, not a patch on that loader. A second reader (`loadCasinoOutcomes_`) may read current-cycle rows for settlement *and* already-approved rows with `TargetCycle == S.cycle+1` for next-cycle line posting. It does not write the feed, does not mark rows consumed, and does not inherit show-contract rights.

Sports settlement reuses the same W/L parse `applyGameNightMoments_` already uses for named players (`applyGameNightMoments.js:51-58`), minus the mood fallback. Mood is texture. Money fail-closes on `Streak`.

### 2. Published odds

House algorithm, not authored. Canon once the placement row is written (the number on the wager is the number that settles).

- UNDOCKED `credits_sign`: even money minus juice (decimal 1.83 / 1.83). The adapter does not publish a win probability; inventing one from standings would be a second model. Juice is the house's physics.
- UNDOCKED `mishap`: priced from that pilot's `Undocked_Standings.MishapTotal / Episodes` (tab already live, `scripts/undockedStandings.js`). Floor 1.40, ceiling 8.00, juice on top.
- UNDOCKED `night_winner`: field of this cycle's pilots, implied 1/n plus juice. Cast size is 3 today.
- Sports moneyline: convert previous feed row's `Team Record` (`RECORD_RE` in `sportsFeedContract.js:50`) to a win rate, shrink toward 0.5 by 8 games so a 126-35 book is a heavy favorite without being 1.01. No previous record → 1.83 / 1.83.

In-world publication is the operator's board (Baylight, Oakland Casino Town), not a Tribune odds column in v1. ECL wager lines (Task 0) may mention "the board" without numbers, because numbers become canon the moment they print.

### 3. Eligible citizens

Adult, `Status=Active`, `Income > 0` or `NetWorth >= 1000`. Minors already skip the money loop (`processMoneyLoop_:331`). Same gate.

Excluded, hard:
- This-cycle UNDOCKED pilots, **show markets only** (`S.undockedPilots`). They may still take the A's moneyline. Integrity, not Puritanism.
- Anyone with `EmployerBizId === 'BIZ-00100'` (Philly Rodriguez POP-00027 Casino Manager, Manfred Owens POP-00028 Booky, Gregory Mims POP-00023 Organized Crime — all live on C105). The house does not bet the house.
- `Status` deceased / traded / pending (same `isEventEligible_` dead-list).

Tribune staff and officeholders are allowed. Conflict-of-interest is a story seed, not a code ban. A reporter hitting a night_winner is an edition, not a defect.

### 4. Stake caps

Per wager:

```
stake = clamp(
  weekly * (0.08 + 0.12 * rng),          // 8–20% of a week's pay
  20,                                    // floor (in-world dollars)
  min(weekly * 0.25, NetWorth * 0.04, 2000)
)
weekly = Income / 52
```

WL ≤ 3: replace 0.25 with 0.10. WL ≥ 10: still capped at $2000 — Varek cannot found a second heritage at the window. Per-cycle: one open wager per citizen. Mid-cycle income change with an open wager: the posted stake stands; solvency is checked at placement, not at settlement (a firing between place and settle is a life, not a void).

### 5. Funding source

House float lives on `Casino_Ledger` as running `HouseFloat` on a single `HOUSE` row (`WagerId=HOUSE`). Seed $250,000 in-world. Do **not** park this on `Business_Ledger.Annual_Revenue` — `chaosCarsEngine` decay already reads that column.

If a cycle's liabilities exceed `HouseFloat`: settle in WagerId order until the float is gone, remaining open rows `Status=void-house`, stake refunded to `NetWorth`, LifeHistory `[Casino] the window closed before the slip paid`. That is a story, not a silent print. Replenish rule: each cycle the house skims juice from settled losses back into the float, capped at the seed. The casino is not a money-printer and not a charity.

Operator canon: `BIZ-00100` Oakland Casino Town, Baylight, Nightlife & Entertainment, 100 staff, Avg_Salary 70k (employment-cascade D6 left this row unrebased *because* of this gate — rebase is a sibling, not a blocker). Licensed book. Not underground. Manfred is the window; Philly is the manager.

### 6. Settlement timing

Inside `processGenerationalWealth_` as a new Step 2.45, **before** `processMoneyLoop_` (`:172`). Wiring card: parent is `Phase5-GenerationalWealth` @ `godWorldEngine2.js:374` / `:2092`, both BEFORE Phase10-ExecuteIntents (`:563` / `:2258`). Mutations are `ctx.ledger.rows` + `ctx.ledger.dirty = true`, same class as the money loop (NetWorth `:396`, DebtLevel `:398`, LifeHistory `:402`).

Order that matters:

1. Phase 2 `applySportsSeason_` (`godWorldEngine2.js:278`) fills `S.sportsFeedEntries`.
2. Phase 2 `loadUndockedFeed_` (`:292`) fills `S.undockedFeedEntries` / `S.undockedPilots`.
3. Phase 5 CitizenEvents (`:361`) already ran — this week's ECL will not narrate this week's settlement. Same as today's `[Money]` lines. Next cycle's wealth-band pools will.
4. Phase 5 GenerationalWealth: **settle open wagers → money loop (accrual, crisis debt, shocks) → household income → mobility → homes → heritage.**
5. Phase 5 MigrationTracking (`:377`) then reads `HouseholdSavings`. A same-cycle savings debit can lift `DisplacementRisk`.

Idempotency: `WagerId = sha1(placeCycle|POPID|MarketId|EventId).slice(0,16)`. Re-run upserts the same key. A settled row with matching `SettleCycle` is a no-op. Saturday canon door is irrelevant to settlement — this is engine physics, not an edition.

Placement of *new* wagers is Step 2.46, after settlement, still before the money loop, against next-cycle markets (UNDOCKED TargetCycle+1 if present; sports = the standing "next game-result" market, which is always open).

### 7. Household economic effects

v1 writes three citizen cells (`NetWorth`, `DebtLevel`, `LifeHistory`) and, when `|delta| >= weekly`, one household cell (`HouseholdSavings`).

- Win: `NetWorth += payout`. If `|delta| >= weekly`, `HouseholdSavings += payout` (the household ate this week).
- Loss: `NetWorth -= stake`. If `NetWorth` would go negative: set 0 and `DebtLevel = min(6, DebtLevel+1)` — same physics as a money-loop shock (`:378-382`). If `|delta| >= weekly`, `HouseholdSavings = max(0, HouseholdSavings - stake)`.
- Debt floor: level 6. A citizen at 6 who loses again only loses remaining NetWorth; no seventh level, no invented collections agency.
- Home purchase (`trackHomeOwnership_:1349`) reads combined member NetWorth *after* this step. A real win can buy a house the same week. That is the good day. Leave it.
- Heritage doors (`:1409-1412`, combined $1M / solo $350M): stake caps make Door B unreachable from a bet. Door A is reachable for a household already close. Physics speaks; log a `CASINO_HERITAGE_NEAR` storyHook if a win puts combined NW within 10% of $1M. Do not block the door.
- `updateHouseholdWealth_` stays untouched. Do not revive `HouseholdWealth`.

A wager cannot push a household into a state no writer handles: rent-crisis (`processMoneyLoop_:349`), displacement (`migrationTrackingEngine.js:244-258`), and home-buy already exist. Casino only feeds those pipes.

### 8. Audit trail

`Casino_Ledger` append-only for citizen rows (HOUSE row is the exception, upserted). Columns:

```
WagerId | CyclePlaced | CycleSettled | POPID | HouseholdId | MarketFamily | MarketId | EventId
Side | Stake | Odds | Payout | Status | HouseFloatAfter | Seed
```

`Status`: `open | settled-win | settled-loss | void-gate | void-house | void-death | refunded`.

Reproducibility: `Seed` is `ctx.rng` state snapshot at placement (same standard as `scripts/undockedDraw.js`). Settlement uses no extra rng — only the feed row. Tests replay seed + fixture feed → identical ledger.

### 9. Loss safeguards

- Per-wager and per-cycle caps (§4).
- Cooling-off: 3 consecutive `settled-loss` → `CooldownUntil = S.cycle+3`. Placement skips those POPIDs. No drama, just a closed window.
- Cumulative: if this cycle's loss ≥ `weekly * 0.5`, also set `CooldownUntil = max(CooldownUntil, S.cycle+2)`.
- No "max citizens ruined per cycle" quota (Sim Doctrine 1). The caps *are* the bound. If twelve people have a bad A's night, twelve people had a bad A's night.

### 10. Downstream typing

v1 writes `[Casino]` LifeHistory + storyHooks (`CASINO_WIN` / `CASINO_LOSS` / `CASINO_DEBT`, same shape as `MONEY_MILESTONE` / `MONEY_SHOCK` at `:407-414`). Next cycle, `generateCitizensEvents.js:2448-2453` already branches ECL on WL ≤ 3 vs ≥ 8 — a band change is the sore-winner / quiet-loser texture, no new pool required for v1.

engine.94 typed grudge/ambition stays gated (`ROLLOUT` engine.94 `needs-info`). Do not build a parallel debt-grudge graph. `Relationship_Bonds` is not a writer for this plan. When Track B opens, `[Casino]` lines are the seed, not a second system.

Task 0 (4a) adds ECL wager-*talk* lines under `undocked`. Task 11 (optional, after 2 live settle cycles) adds `ecl:kind:wager-win` / `wager-loss` conditioned on a new `casinoseettle` flag. Not in the money commit.

### 11. In-world presentation

Name: the window at Oakland Casino Town. Not "the UNDOCKED book" as a separate institution — the casino takes UNDOCKED and the A's at the same counter. Legality: licensed. Venue: Baylight. Voice: Manfred takes the slip, Philly minds the float, Gregory is present and unused by this engine (do not invent a crime mechanic around `RoleType=Organized Crime`).

Fourth wall: no adapter, feed, cycle fire, Streak-regex, or `ctx.rng` in any in-world string. `[Casino]` lines are people at a window.

### 12. Failure modes

| Case | Action |
|---|---|
| Episode in open wager fails the gate / never airs | After 3 cycles still unmatched → `void-gate`, stake refunded |
| Adapter / feed correction on a settled EventId | Do not unwind money. Append a `void-gate` note row for audit; world already lived it (Sim Doctrine 8) |
| Citizen dies / trades with `Status=open` | `void-death`, stake refunded to household head (existing inheritance path is for estates, not open slips) |
| Sports cycle with no `game-result` + parseable Streak | Carry. Quiet cycle is the normal case (`applySportsSeason.js:116-119`) |
| Sports cycle with 3 game-results | Settle the standing market against the **first** parseable row in sheet order; remaining rows do not open extra markets in v1 |
| House float exhausted | `void-house` as §5 |
| Cycle re-run | Upsert by WagerId, no double-pay |

---

## How a bet improves a life, or makes it worse

The citizen doctrine (employment-cascade Direction 17–21): there is no advancement except tiers; status is coverage, household-into-heritage, UNDOCKED, and winning at the casino. A bet is therefore allowed to move **money and the week**, and is forbidden from moving **job / tier / identity**.

### Better weeks (caused, then paid)

- `NetWorth` up → possible WL band change (0–12, `deriveWealthLevel_:847-861`). Next cycle the comfortable pool can fire ("quietly covered the table's coffee") instead of the tight one ("put one thing back").
- Same-cycle home purchase if combined NW now clears `HOME_ELIGIBLE_NW` (`trackHomeOwnership_:1349`). A window ticket becomes keys. Rare, legal, logged.
- `[Casino]` win line + `CASINO_WIN` storyHook when payout ≥ half a week's pay. Desk packets already read storyHooks.
- HouseholdSavings up → displacement buffer (`SAVINGS_BUFFER_MONTHS = 12`) holds. The family does not take rent-burden risk they would have.
- Heritage-near hook if a win walks a household toward Door A. Not a mint.

### Worse weeks (the realism-audit hole this exists to fill)

- `NetWorth` down. WL 5→4 is a different register-math week next cycle.
- Zeroed savings + `DebtLevel++` → money-loop crisis copy can stack the same cycle ("borrowed against tomorrow") because settlement runs first.
- HouseholdSavings debit → if the household was sitting on the 12-month buffer, migrationTracking can lift `DisplacementRisk` the same cycle (`:251-257`). At ≥ 7 the displacement ECL lines fire next generateCitizensEvents.
- Cooling-off is itself a week: they wanted the window and it was closed.
- Three-loss streak is a character fact in LifeHistory. engine.94 can eat it later. v1 does not name it a grudge.

### What a bet must never do

- Change `Tier`, `RoleType`, `EmployerBizId`, `CareerStage`, `LastPromotionCycle`. S405: there is no system for why someone is promoted or fired; education is next; casino is not a back door.
- Fire `checkForPromotions_` (Generic_Citizens → ledger). Winning $400 at the window is not emergence.
- Write `Initiative_Tracker` or any civic-office tab. Elections/initiative markets are parked. Grok lock stands.
- Write DialState or MemoryRegisters. Compressor owns those.
- Invent bettors. Placement rng selects from eligible live rows only. Tests use `POP-TEST-*`.

Propensity (who walks up): eligible adults roll `p = 0.012 * driveFactor * showFactor * sportsFactor`. `driveFactor` 1.4 if DialState drive ≥ 60 else 1.0. `showFactor` 1.5 if `S.undockedFeedEntries.length` else 1.0 for show markets (and 0 if no show rows to bet). `sportsFactor` 1.3 if this cycle or last had a parseable game-result. Expected ~8–20 slips/cycle from ~700 working adults, 1:443 city-loud, zero is a valid night (Doctrine 1). Not a quota.

---

## UNDOCKED — the easy market

The adapter already emits the settlement grain: `EpisodeId`, `CreditsDelta` (nullable — blank is not zero, `loadUndockedFeed_:319-324`), `MishapCount`, `POPID`. Standings already accumulate. The show cron already airs (`cron-undocked-run.js`). C105: 6 episodes.

Line-posting needs one new read: approved rows with `TargetCycle == S.cycle+1`. If the daily cadence has already pushed tomorrow's episode, the window is open tonight. If not, show markets stay closed that cycle — fail-closed, same as missing tab.

Cast vs audience: pilots skip show markets. They fly; the city bets. Sports is still theirs.

Do not ask `loadUndockedFeed_` to start returning future rows. Show color (`undocked` / `undockedpilot` flags) must remain "this cycle aired." A future-row leak would paint Oakland with tomorrow's episode.

---

## Sports — the harder market, with a one-row behavior change

`Oakland_Sports_Feed` has no Winner/Score column. `EventType` includes `game-result` but `Stats` is free text, `Team Record` is season W-L, `Streak` is `W#`/`L#`. G-PF29 is WONTFIX: the sports calendar is not the sim calendar. Quiet cycles with no feed row are normal.

Adding `GameWinner` / `GameScore` would punch `FEED_HEADERS`, `sportsFeedContract.js`, dashboard sports routes, and SCHEMA_HEADERS — eleven hardcoded sports seams (game-env review §2). Do not.

**Standing moneyline:** there is always one open A's market and one open Oaks market, "the next parseable `game-result`." Settlement reads this cycle's feed in sheet order, takes the first row with `EventType=game-result`, `TeamsUsed` matching that franchise, and `Streak` `W#` or `L#`. Then a new market opens.

**Builder behavior that makes this real:** at least one `game-result` row per cycle, `TeamsUsed` set, `Streak` set to `W1`/`L1` (or the real streak). That is the whole sportsbook substrate. No preview row. No calendar coupling. A skipped cycle carries open slips. Three games in one paste settle one market (the first row) — if that ever hurts, v2 can drain a queue.

`applyGameNightMoments_` keeps naming players. Casino names the audience. Two consumers, one feed, no shared write.

---

## Blast radius (read these before cutting)

**In-scope writes**

| Surface | How | Notes |
|---|---|---|
| `Simulation_Ledger.NetWorth` (AC) | `ctx.ledger.rows` | Same path as money loop `:396` |
| `Simulation_Ledger.DebtLevel` (AE) | `ctx.ledger.rows` | Levels 0–6, not dollars |
| `Simulation_Ledger.LifeHistory` (O) | `ctx.ledger.rows` | `[Casino]` stamp `Y#C#`, compressor already folds tagged lines |
| `Household_Ledger.HouseholdSavings` | own-tab `setValues` (new carve-out, list in SHEETS_MANIFEST §9) | Only when `\|delta\| >= weekly` |
| `Casino_Ledger` (new) | append intents + HOUSE upsert | Missing tab = no-op until schema lands |
| `S.storyHooks` | push | Same object 8+ writers already share |
| `S.casinoPlacements` / `S.casinoSettlements` (new) | summary-only | For tests + optional later ECL flag |

**Reads, no write**

`S.undockedFeedEntries`, `S.undockedPilots`, `S.sportsFeedEntries`, `S.cycle`, `Undocked_Standings` (Node-side odds helper is fine; engine-side may snapshot standings into summary at Phase 2 if a Sheet read in Phase 5 is too late — decide at Task 5, do not make `loadUndockedFeed_` do it), `Business_Ledger` only to resolve `BIZ-00100` employees.

**Do not touch**

- `Tier`, `RoleType`, `EmployerBizId`, `CareerStage`, `LastPromotionCycle`, `checkForPromotions_`
- `Initiative_Tracker`, civic-office agents, faction routing
- `Undocked_Feed` schema, `loadUndockedFeed_` contract, `undocked=1` vs flag DSL
- `Oakland_Sports_Feed` headers / `sportsFeedContract.js` enums
- `Business_Ledger.Annual_Revenue` (chaos cars)
- `DialState`, `MemoryRegisters`, `Relationship_Bonds`, engine.94
- `HouseholdWealth` (dead column; do not resurrect)
- PIN, other lanes' NEXT, control plane

**Landmines**

- `SIMULATION_LEDGER.md` AE "Dollar amount" and Z "0-10" are stale vs code (levels; 0–12). True-up those two cells in the same commit as the engine function, or the next designer repeats Kimi's cap math.
- `updateHouseholdWealth_` early-return. Do not call it to "refresh" casino results.
- `CreditsDelta` blank ≠ 0. A `credits_sign` market on a blank delta is `void-gate`, not a loss.
- `trackHomeOwnership_` is a Phase-11-class direct write (`setValue` on HousingType, `:1378`). Casino must not copy that pattern for the new tab; use intents. HouseholdSavings is the one allowed own-tab carve-out, because the money loop already reads that sheet live in the same engine (`:309-325`) and intents would not be visible to the rest of this function.
- Two `godWorldEngine2.js` entry points. Wire both (`:374` and `:2092`).
- 1:443. 15 ledger slips is a city talking about the window, not a niche hobby. Keep p small.

---

## Tasks

### Task 0: 4a wager-talk ECL (no money)

- **Files:**
  - `scripts/undockedEclPool.js` — modify (add `ecl:kind:wager` lines)
  - `scripts/undockedEclPool.test.js` — modify (KINDS.wager ≥ 3)
- **Steps:**
  1. Add ≥4 `culture.spacemolt-show` lines, conditions `undocked`, first tag `source:undocked`, kind `wager`. They talk the window, the napkin, the board — no numbers, no "odds are canon", no adapter words.
  2. Keep KINDS validator in sync.
  3. Dry-run `node scripts/undockedEclPoolApply.js`; `--apply` only with approval (Sheet write).
- **Verify:** `node scripts/undockedEclPool.test.js` → ok. Lines exist. No 4b tab.
- **Status:** [ ] not started — **not gated on Mike 4b sign-off** (this is the missing 4a)

### Task 1: Confirm 4a actually draws

- **Files:** `output/execution_log_c*.md` / Content_Telemetry — read
- **Steps:** After Task 0 apply, wait 2 cycles with UNDOCKED airing. Confirm `ecl:kind:wager` draws > 0. This is Kimi's sequencing constraint, honored as a gate on Task 4, not as a reason to refuse the design.
- **Verify:** telemetry count ≥ 1 on a cycle where `loadUndockedFeed_` logged episodes.
- **Status:** [ ] not started

### Task 2: Casino_Ledger schema + manifest

- **Files:**
  - `schemas/SCHEMA_HEADERS.md` — add `## Casino_Ledger`
  - `docs/engine/SHEETS_MANIFEST.md` §4 or new money subsection + §9 carve-out for HouseholdSavings writer
  - `docs/SIMULATION_LEDGER.md` — AE valid-values "0-6 level"; Z "0-12"
  - `docs/SPREADSHEET.md` — one line
- **Steps:**
  1. Headers exactly as §8. Tests later assert this list, not a close cousin.
  2. Register the tab as ENGINE, append-only citizen rows, HOUSE upsert.
  3. True-up the two stale SL cells in the same change.
- **Verify:** `rg "Casino_Ledger" schemas/SCHEMA_HEADERS.md docs/engine/SHEETS_MANIFEST.md` both hit. No `Initiative_Tracker` in the diff.
- **Status:** [ ] not started — gated on Mike 4b sign-off

### Task 3: Fixture + contract tests (red)

- **Files:**
  - `scripts/casinoLedger.js` — create (pure helpers: eventId, odds, stake, settle, void)
  - `scripts/casinoLedger.test.js` — create
- **Steps:**
  1. Synthetic POP-TEST-1 / POP-TEST-2 only.
  2. Cases: undocked credits_sign win/loss/blank-delta-void; night_winner POPID tie-break; sports W-streak win, L-streak loss, missing streak carry; house-float exhaustion; re-run idempotency; minor rejected; BIZ-00100 rejected; pilot rejected on show market, accepted on sports.
  3. No Sheet, no network.
- **Verify:** `node scripts/casinoLedger.test.js` fails on missing implementation, then passes at Task 4.
- **Status:** [ ] not started — gated on sign-off

### Task 4: Pure settlement helpers

- **Files:** `scripts/casinoLedger.js` — implement against Task 3
- **Steps:** Port the formulas in §2 / §4 / §5 / §12. `safeRand` injected. No `Math.random`.
- **Verify:** `node scripts/casinoLedger.test.js` → ok
- **Status:** [ ] not started — gated on sign-off

### Task 5: `processCasinoLedger_` engine function

- **Files:**
  - `phase05-citizens/casinoLedgerEngine.js` — create (Apps Script ES5)
  - `phase05-citizens/generationalWealthEngine.js` — modify (call at `:172` before `processMoneyLoop_`)
- **Steps:**
  1. Read `S.undockedFeedEntries`, `S.sportsFeedEntries`, open rows from `Casino_Ledger` (missing tab = log + return).
  2. Settle, mutate `ctx.ledger` NetWorth / DebtLevel / LifeHistory, debit/credit HouseholdSavings when threshold hits, upsert HOUSE float, append settled rows via intents.
  3. Place new wagers with `ctx.rng`.
  4. `node --check` equivalent: clasp lint via existing engine test if one exists; otherwise Apps Script syntax review + a Node mirror of the mutate path in `scripts/casinoLedger.js`.
- **Verify:** sandbox cycle with seeded feed + synthetic citizen (bench only). Re-run same cycle: NetWorth unchanged the second time.
- **Status:** [ ] not started — gated on sign-off + Task 1 (4a drew)

### Task 6: Wire both engine entry points

- **Files:** `phase01-config/godWorldEngine2.js` — only if Task 5 did not already ride the existing `Phase5-GenerationalWealth` call. Prefer riding `:374` / `:2092` with no new `safePhaseCall_`. If a separate phase is required, add `Phase5-Casino` immediately before GenerationalWealth at **both** entry points.
- **Verify:** `rg "processCasinoLedger_\|processGenerationalWealth_" phase01-config/godWorldEngine2.js` shows both production and cycle-phases.
- **Status:** [ ] not started

### Task 7: HouseholdSavings carve-out

- **Files:**
  - `phase05-citizens/casinoLedgerEngine.js` — HouseholdSavings write
  - `docs/engine/SHEETS_MANIFEST.md` §9 — one row, class `own-tab`, note "visible to processMoneyLoop_ in the same Phase 5"
- **Steps:** Same-cycle read of Household_Ledger (money loop already does this at `:309`). Write only `HouseholdSavings`. Never `HouseholdWealth`.
- **Verify:** fixture household with savings = 12 * rent, loss ≥ weekly → savings below buffer; a following `processMigrationTracking_` on the same ctx would see unbuffered rent.
- **Status:** [ ] not started

### Task 8: Sports standing-market parse

- **Files:** `scripts/casinoLedger.js` — `parseSportsMoneyline(feedEntries, franchise)`
- **Steps:** First `game-result` with matching `TeamsUsed` and `/^(W|L)\d+$/` Streak. No new feed columns. Document the one-row builder behavior in `docs/engine/SHEETS_MANIFEST.md` under `Oakland_Sports_Feed` (one sentence: casino settles the first parseable game-result Streak).
- **Verify:** tests from Task 3. Quiet-cycle fixture returns `carry`.
- **Status:** [ ] not started

### Task 9: Eligibility + cooldown

- **Files:** `scripts/casinoLedger.js`, engine function
- **Steps:** Implement §3 and §9. Cooldown stored on Casino_Ledger as the latest `CooldownUntil` per POPID (derived at placement from last 3 settled rows — no new SL column).
- **Verify:** tests: pilot+show rejected; pilot+sports accepted; BIZ-00100 rejected; 3 losses → skip.
- **Status:** [ ] not started

### Task 10: `[Casino]` copy + storyHooks + fourth wall

- **Files:** `phase05-citizens/casinoLedgerEngine.js`
- **Steps:**
  1. Stamp `Y#C# — [Casino] …` parallel to `[Money]` (`:358-393`).
  2. Win/loss/debt/void-house variants. No feed/adapter/cycle-fire vocabulary (mirror `undockedEclPool.js` FOURTH_WALL regex).
  3. Push storyHooks only when `|delta| >= weekly * 0.5` or DebtLevel crossed 5.
- **Verify:** unit strings; regex check in the test file.
- **Status:** [ ] not started

### Task 11: Optional ECL settle flag (after 2 live money cycles)

- **Files:** `phase05-citizens/generateCitizensEvents.js`, `scripts/undockedEclPool.js`
- **Steps:** New condScope `casinosettle` from `S.casinoSettlements[popId]`. Win/loss lines. **Not in the money commit.** Park until two live cycles have settled real (non-test) rows.
- **Verify:** bench citizen with a settlement draws a wager-win line; citizen without does not.
- **Status:** [ ] not started — parked on live proof

### Task 12: Bench prove, then stop

- **Files:** none in repo except the test log under `output/grok/`
- **Steps:** Sandbox only. No live clasp, no live cycle, no live Casino_Ledger mint until a separate approval. Dump 10 synthetic settlements, confirm no SL row outside POP-TEST-* moved, confirm BIZ-00100 staff unmoved, confirm Initiative_Tracker hash unchanged.
- **Verify:** before/after snapshots. Write the proof in this plan's changelog, not a new MD.
- **Status:** [ ] not started

---

## Open questions

None that block a task. Two builder overrides, pre-answered so a session can cut:

- **House juice 1.83 even** — Mike can tighten. Change one constant.
- **One sports market per franchise per cycle** — Mike can later allow a queue. v1 will ignore extra `game-result` rows rather than invent a parlay.

Civic/election markets are not an open question. They are out. Re-open only if Mike names tracker writes.

---

## Proposed rollout row (Claude files on accept)

```
| research.28 | Casino ledger 4b — design in plans/2026-08-31-casino-ledger; Task 0 (4a wager ECL) ready; money tasks gated on Mike sign-off + 2 cycles of wager-talk draws | needs-info | engine-sheet | [[../plans/2026-08-31-casino-ledger]] |
```

Do not flip Kimi's research verdict (`watch`) until Task 1 confirms wager-talk draws. Then the research file accretes `adopt` in its own changelog; this plan stays the spec.

Pending-state today still sits on research.27's show plan. Either keep it there and add this pointer on the same row, or file research.28. One row, not two — Claude picks.

---

## Wiring cards (condensed)

Full Haiku dumps: `output/grok/wiring-processMoneyLoop.md`, `output/grok/wiring-loadUndockedFeed.md`. Usable facts:

**processMoneyLoop_** (function) map 2026-08-31 / 185 files / 1193 functions

- Def: `phase05-citizens/generationalWealthEngine.js:286` v2.1 / engine.61
- Phase: `Phase5-GenerationalWealth` @ `godWorldEngine2.js:374` and `:2092` — BEFORE Phase10 (`:563` / `:2258`)
- Caller: `generationalWealthEngine.js:172`
- Ledger mutations: NetWorth `:396`, DebtLevel `:398`, LifeHistory `:402`; `ctx.ledger.dirty` `:418`
- Household_Ledger **read** `:309` (crisis + SuperCouple). SuperCouple column is not in SCHEMA_HEADERS; missing → superCouple false.
- RNG: `safeRand_(ctx)` only. No `Math.random`.

**loadUndockedFeed_** (function)

- Def: `phase02-world-state/loadEventContentLedger.js:291`
- Phase: `Phase2-UndockedFeed` @ `godWorldEngine2.js:292` and `:2010` — BEFORE Phase10
- Writes `S.undockedFeedEntries` `:293/:337`, `S.undockedPilots` `:294/:351`
- Tab `Undocked_Feed` read-only here; writers are `scripts/undockedShowGate.js --push` (manifest `:79`)
- Casino must not widen this function to future TargetCycles.

**applySportsSeason_** (inspected, card not re-run)

- Phase: `Phase2-SportsSeason` @ `godWorldEngine2.js:278` / `:1996`
- Writes `S.sportsFeedEntries` (`applySportsSeason.js:70`)
- Quiet cycle is normal (`:116-119`)

---

## Changelog

- 2026-08-31 (grok) — Initial 4b design. Answers Kimi's 12. Corrects 4a-not-authored, DebtLevel-as-levels, inert HouseholdWealth aggregator. Parks civic markets. Standing sports moneyline on Streak. Operator BIZ-00100.
