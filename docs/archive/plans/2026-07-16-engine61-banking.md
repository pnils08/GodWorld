# engine.61 — banking: the fluctuation layer (S321 design, Mike-approved)

**Terminal:** engine-sheet (build + iterate on SANDBOX 0716b via the autonomous
fire loop). **Parent:** [[2026-07-16-engine60-money-loop]] (modulates its
physics: accrual, drag, payoff, crisis-borrow). **Rollout row:** engine.61.
**Status:** approved S321, building.

## Why (Mike-direct, S320/S321)

engine.60 shipped the money loop with frozen physics — debt drag flat 40,
payoff cost flat 800, savings yield invariant. Banking makes those numbers
weather: rates, shocks, neighborhood credit ("the fluctuation layer",
deliberately sequenced after the loop). Same citizen, different week,
different fate.

## Grounded state (S321 inventory)

- `S.previousCycleState` — cross-cycle Script-Property snapshot
  (`PREV_CYCLE_STATE_JSON`), saved Phase 10 (`finalizeCycleState.js`),
  loaded Phase 1 (`loadPreviousCycleState_`, godWorldEngine2 L212/L1788 —
  BEFORE Phase 5). Already carries `econMood` (0–100, economicRippleEngine).
  Banking state rides this store; no new tab.
- `S.neighborhoodState[hood]` — loaded Phase 2 (`loadNeighborhoodState_`)
  with `trajectoryMomentum` (0–10, 5 neutral), `housingPressure` (0–10),
  `sentiment`. One-cycle lag by design. T3 reads this; zero new sheet reads.
- `trackWealthMobility_` — v1.0 placeholder, already CALLED at
  generationalWealthEngine.js L161. Becomes real in place.
- `trackHomeOwnership_` — stays stub (engine.60 ruling: home purchase later).
- No bank entity exists in Business_Ledger; not needed for the rate layer.

## Tasks

### T1 — The rate lives
`processBankRate_` (generationalWealthEngine, before the money loop):
`bankRate` mean-reverting walk — prior rate from
`previousCycleState.bankRate` (seed 5.0), pull toward mean 5.0 (×0.1),
nudge from prior-cycle `econMood` ((mood−50)/100 × 0.3: booming city drifts
rates up), jitter ±0.4 via ctx.rng. Physical bounds 2.0–10.0 — bounds are
physics, not output caps. Writes `S.bankRate` + `S.bankRateDesc`; snapshot
v1.8 carries `bankRate` (~15 bytes).

### T2 — The rate reaches the loop
Money loop v2: `yieldF = 0.6 + 0.08×rate` (1.0 at mean; 0.76 tight, 1.4
loose) multiplies accrual; `dragF = 0.5 + 0.1×rate` (1.0 at mean) multiplies
DEBT_DRAG and PAYOFF_COST. Savers win more in high-rate weeks; debt bleeds
harder.

### T3 — Neighborhood credit
`creditF(hood) = clamp(0.75, 1.25)` from `S.neighborhoodState`, as a COST
factor: `1 − (momentum−5)×0.04 + max(0, pressure−7)×0.03` (sign fixed at
build time S321 — the design draft had it inverted). Rising hood → creditF
< 1 → cheaper paydown (PAYOFF_COST × creditF); pressured hood → creditF > 1
→ costlier paydown, and crisis-borrow digs a second level with
p = (creditF−1)×2. Where you live touches your ledger.

### T4 — Shocks
Inside the money-loop row pass (shares the 1-money-line/citizen/cycle
display bound from engine.60 §T5). Honest dice per adult per cycle:
- expense shock p=0.004 (~1 per ~5yr per citizen; city-loud at 1:443):
  hit $1,500–$8,000 (rng). NetWorth absorbs; if it can't (NW < hit),
  remainder forces DebtLevel +1 — borrowing is what broke families do.
- windfall p=0.002: $2,000–$15,000 to NetWorth.
LifeHistory `[Money]` lines both ways; hooks on the expense-into-debt case.
No caps on outcomes — probabilities are the physics (doctrine §1–3).

### T5 — Wealth mobility wakes
`trackWealthMobility_` becomes real: diff WealthLevel prev→new inside the
cycle (map captured before `calculateCitizenWealth_` recomputes), transitions
≥ +2 levels or falls ≥ 2 → LifeHistory line ("moved up in the world" /
"the ground gave a little") + story hook. Placeholder since v1.0.

## Tuning constants

| Constant | Value | Basis |
|---|---|---|
| RATE_MEAN / BOUNDS | 5.0 / 2.0–10.0 | neutral = engine.60 proven baseline |
| REVERSION | 0.1 | ~10 cycles to walk home |
| MOOD_NUDGE | (mood−50)/100×0.3 | booming ≈ +0.15/cycle drift |
| JITTER | ±0.4 | rng, the dice speak |
| yieldF | 0.6+0.08×rate | 1.0 at mean — accrual baseline preserved |
| dragF | 0.5+0.1×rate | 1.0 at mean — drag baseline preserved |
| creditF | 0.75–1.25 | momentum ±0.04/pt, pressure −0.03/pt over 7 |
| expense/windfall p | 0.004 / 0.002 | rare per-citizen, city-loud at 1:443 |

## Verification (0716b, autonomous fires)

- bankRate persists + walks across fires (snapshot round-trip; no reset to 5.0)
- accrual deltas scale with rate vs engine.60 baseline (yieldF exact)
- a pressured hood's crisis digs deeper than a rising hood's (creditF forensics)
- expense shock lands: NW down, debt +1 when NW couldn't cover; lines clean
- mobility moments fire on real WealthLevel transitions, once each
- no citizen >1 money line/cycle (engine.60 bound holds)

## Out of scope
Home purchase path (`trackHomeOwnership_` stays stub), bank as
Business_Ledger entity, citizen-visible rate products (accounts, loans as
objects), heritage scoring.
