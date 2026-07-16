# engine.60 — the money loop: savings, debt, and the 18th birthday (S320 design)

**Terminal:** engine-sheet (build + iterate on SANDBOX 0716b via the autonomous
fire loop; fresh live-copy at proof time). **Parent:** [[2026-07-16-engine59-bonds-marriage-market]]
(consumes its SuperCouple stamp) + [[2026-07-13-family-household-loop-build]].
**Rollout row:** engine.60. **Status:** designed S320, building.

## Why (Mike-direct, S320)

Debt–savings–salary–inheritance as one loop; education matters causally
(less debt, better savings rate, better career outcomes for their kids at
18); once married you get a household, and the household drives events →
dials → kids. Sims tier up toward household life; surnames compound into
dynasties. Banking (the fluctuation layer) is deliberately NEXT (engine.61),
not here.

## Grounded state (S320 inventory — haiku sweep + verified)

- `SavingsRate` (AD): written by wealth engine per WealthLevel — **zero
  readers anywhere.**
- `NetWorth` (AC): static seed; grows ONLY on inheritance
  (generationalWealthEngine processInheritance_, 80% estate / 20% tax,
  household-first split — WORKS).
- `DebtLevel` (AE): 0–6 numeric, frozen post-seed; penalties already bite
  (wealth −1/−2 at 5/8; marriage fitness −0.05/−0.15 at 3/5). **No accrual,
  no repayment.**
- `trackWealthMobility_` / `trackHomeOwnership_`: placeholder stubs.
- Household: rent-burden stress (≥40% warn / ≥50% crisis → 10% dissolution)
  and a 12-month `HouseholdSavings` buffer both LIVE (engine.56).
  `HouseholdSavings` = Σ member NetWorth. **Column collision:**
  `SavingsBalance` (wealth engine, flat 5%, zero readers) duplicates the
  concept — orphan.

## Tasks

### T1 — NetWorth accrues (SavingsRate finally read)
Per cycle, adults: `NetWorth += round(Income/52 × SavingsRate × eduFactor
× superFactor) − debtDrag`. eduFactor: doctorate/masters 1.2, bachelors 1.1,
else 1.0 (Mike: education → better savings). superFactor 1.2 when the
citizen's household carries the engine.59 SuperCouple stamp (first consumer).
debtDrag = DebtLevel × DEBT_DRAG (default 40/cycle) — carrying debt bleeds.
Because HouseholdSavings = Σ NetWorth, the rent-crisis buffer turns dynamic
for free: saving families genuinely build resilience.

### T2 — Debt moves
- **Accrual:** a cycle in rent-burden CRISIS (existing detector) with
  HouseholdSavings below buffer → each adult member DebtLevel +1 (cap 6) —
  borrowing to stay housed. LifeHistory line.
- **Pay-down:** DebtLevel > 0 and positive accrual this cycle → every
  DEBT_PAYDOWN_CYCLES (default 6) with sustained surplus, DebtLevel −1 at
  NetWorth cost (PAYOFF_COST × level). LifeHistory line on hitting 0.
- Existing penalties (wealth, marriage fitness) now track a moving number —
  debt becomes a life arc, not a birthmark.

### T3 — Retire the SavingsBalance orphan
Wealth engine stops writing `SavingsBalance` (zero readers, name-collides
with HouseholdSavings). Household money truth = HouseholdIncome +
HouseholdSavings, one writer each.

### T4 — The 18th-birthday settlement
On a citizen's age crossing 18 (BirthYear-computed, fires once via
LifeHistory marker): career-entry quality draw weighted by household
standing — HouseholdIncome band + SchoolQuality (engine.57 P4 stamp) +
best parent EducationLevel. Output: RoleType/Income/EducationLevel
trajectory seeded rich-start / solid-start / rough-start. LifeHistory line
either way ("stepped into adult life with the wind at their back" /
"started from scratch and knows it"). This is Mike's "better career engine
outcome for their kids at 18" — the generational transfer moment, riding
tonight's ParentIds links.

### T5 — Money reaches the cron life
Threshold events write LifeHistory + story hooks (both feed dials/wakes):
debt crossing 5 (drowning), debt reaching 0 from 3+ (cleared it), NetWorth
crossing 100k first time (made it), inheritance already hooks (keep).
Bounded: one money line per citizen per cycle max.

## Tuning constants (grounded)

| Constant | Value | Basis |
|---|---|---|
| DEBT_DRAG | 40/cycle/level | level 6 bleeds ~12.5k/yr — hurts, not fatal |
| DEBT_PAYDOWN_CYCLES | 6 | ~6 weeks surplus to shed a level |
| PAYOFF_COST | 800 × level | paying debt costs savings |
| eduFactor | 1.0/1.1/1.2 | Mike's education ruling |
| superFactor | 1.2 | SuperCouple's first "math in their favor" |
| Accrual base | Income/52 × SavingsRate | weekly cycle share |
| 18th-draw bands | rich ≥140k HH / rough <60k | live HH income distribution |

## Verification (0716b, autonomous fires)

- SavingsRate consumed (NetWorth deltas match rate × income ± drag)
- A crisis household gains debt; a surplus one sheds it; lines land clean
- HouseholdSavings moves cycle-over-cycle; rent-buffer outcomes change
- SavingsBalance no longer written
- An 18th birthday fires exactly once with a household-weighted draw
- Money hooks appear in Story_Hook_Deck; no citizen gets >1 money line/cycle

## Out of scope
Banking/fluctuation layer (engine.61: rates, shocks, neighborhood credit),
home purchase path (stub stays), heritage scoring (consumes this + names).
