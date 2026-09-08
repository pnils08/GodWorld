---
title: Economy true-up — pay from the job, rent from the hood, business in its sector
created: 2026-09-07
updated: 2026-09-07
type: reference
tags: [research, economy, engine, citizens, active]
sources:
  - data/economic_parameters.json — the job catalog (306 roles after engine.168)
  - phase05-citizens/generationalWealthEngine.js — jobReferencePay_, applyUntrackedJobReference_, applyTrackedEmployerFloor_
  - phase02-world-state/loadNeighborhoodState.js — hoodRentFromIncome_ (rent = World_Config hoodRentShare × hood MedianIncome ÷ 12)
  - phase05-citizens/migrationTrackingEngine.js — rent burden 30% / 50% risk weights
  - phase05-citizens/householdFormationEngine.js — MIN_INCOME_SINGLE_HOUSEHOLD, RENT_BURDEN_CRISIS
  - docs/canon/INSTITUTIONS.md §Neighborhoods — the narrative each hood carries
  - docs/SIM_DOCTRINE.md §14 — income comes from the job; the hood follows income
---

# Economy true-up (S436, builder-direct 2026-09-07)

Builder rulings this session, in his words' substance:
1. A neighborhood has nothing to do with a person's income. Income decides where they can live, never the reverse. (Hood-reference pay retired at PROD @67.)
2. The catalog listing owners and professionals but not the jobs the engine mints is "a real bug in the economics system of the world." (108 working jobs added at PROD @68.)
3. This needs documenting and folding into the true-up. The tracking mechanisms exist; the gifted residence is real; the migration-to-the-proper-hood door is live code.

## 1. Where the money model stands (measured on live C106, tracked working adults n=773)

**Wage scale.** Catalog floor assumes a $22/hr minimum, ≈2.2× 2016. Tracked incomes: p10 56k · p50 94k · p90 154k · p99 292k. A 5× spread top-to-bottom. Real 2016 Oakland ran wider; a tech boom with inherited money on the lake and warehouse crews in the flats should read wider than this.

**Are citizens paid what their job suggests?** Of 499 working adults whose job is now in the catalog (stage-scaled band ±10%):

| inside the band | above it | below it |
|---|---|---|
| 298 (60%) | 124 (25%) | 77 (15%) |

income ÷ (job median × stage): p10 0.58 · p50 1.00 · p90 1.82 · max 4.01. The median citizen is paid exactly their job. The top quarter are paid something else — see §2.

**Rent.** One global dial: `hoodRentShare` 0.30 × the hood's Neighborhood_Map MedianIncome. Every hood charges the same share of its own median, so rent can never outrun wages anywhere — the one thing a boom does. Rent is the hood-income table's shadow, not a force.

**Who lives where vs. INSTITUTIONS §Neighborhoods** (burden at the median tracked resident):

| Hood | Narrative | Rent/mo | Resident median | Burden |
|---|---|---|---|---|
| San Antonio | services the boom | 1,748 | 78k | 27% |
| Chinatown | priced around | 2,104 | 94k | 27% |
| Temescal | | 1,707 | 84k | 24% |
| Fruitvale | trendy transit hub | 2,450 | 94k | 31% |
| Downtown | corporate spine | 3,012 | 114k | 32% |
| Rockridge | | 4,016 | 127k | 38% |
| Piedmont Ave | | 3,750 | 110k | 41% |
| Uptown | young professional | 2,410 | 71k | 41% |
| Lake Merritt | elite, inherited | 4,634 | 127k | 44% |
| West Oakland | boom's birthplace, expensive | 3,621 | 92k | 47% |
| Adams Point | young renters | 2,380 | 58k | 49% |

The cheap working hoods fit. The expensive hoods show the strain the narrative promises — and several sit a point or two under the 50% migration-risk mark, one bad cycle from emptying Lake Merritt and West Oakland of tracked citizens.

## 2. The remaining pay leaks (same class as the janitor)

**Employer floor pays the company average, not the job.** `applyTrackedEmployerFloor_` (engine.135 D3) raises every employee to the employer's `Avg_Salary` × stage regardless of what they do there. 480 tracked citizens work at a Business_Ledger row; of the 299 with a listed job, 88 are above their band — a taxi driver at the Fruitvale clinic on 110k, a line cook at OUSD on 100k, retail workers at the Baylight authority on 111k. Of the 124 above-band citizens citywide, 88 are this floor.

**Businesses hire anyone.** The rehire matcher places a taxi driver at a clinic. The Business_Ledger carries 29,844 jobs across 176 businesses; 567 tracked citizens hold one. Hiring is not sector-gated.

**Rent is one dial.** See §1.

## 3. How a wide-scale system works for a sim (design, not yet cut)

The ledger is the tracked ~0.25%; the Business_Ledger is the untracked world in aggregate (headcount, average pay, revenue). Pay only ever has to be computed for tracked rows — one pass per cycle over ~900 rows, which is what Steps 1.5/1.6 already are. Nothing here is a new system; it is the existing floor reading the right thing.

- **Pay = the job, and the life places you in it** (engine.172, builder-direct). `jobReferencePay_`: the catalog's [min, max] for the role; position = 0.6 × (1 − e^(−years/12)) ± 0.05 per credential rank vs the field's expected credential ± 0.10 across the drive dial + 0.08 for Tier-3 ± 0.10 by the employer's Growth_Rate, × seeded ±5%. Two plumbers: the half-year apprentice on a diploma 87,800; the 34-year veteran with a doctorate 126,500. Events move it from there (promotion +6–12%, layoff −12–20%, hospital −3–8%, owner's draw from the books). Raise-only floors catch anyone under their own figure; nobody is lowered by a description.
- **Employer modifies within its sector.** A Civis engineer earns Civis's rate; a Civis janitor earns the janitor band. Rule: the employer's Avg_Salary applies to a citizen only when the job's field matches the business's sector (`sectorCategory_` vs `roleFieldOf_`); otherwise the job band stands. One condition in `applyTrackedEmployerFloor_`.
- **Rent share per hood.** Replace the one dial with a Neighborhood_Map column `RentShare` from the narrative: hot hoods (Lake Merritt, Rockridge, West Oakland, Jack London, Fruitvale, Baylight) ≈ 0.40; passed-over D4 villages ≈ 0.24; Chinatown held ≈ 0.28; the rest 0.30. The existing 30% / 50% burden rules in migration and household formation then do the sorting on their own.
- **Businesses hire in their sector.** The rehire matcher's candidate filter: `tagsMatchCategory_(SkillTags, business sector)` or `roleFieldOf_(RoleType) === sector`. A clinic hires healthcare; a port hires port and labor.
- **The gifted residence stays.** Inherited money (Lake Merritt's register) is heritage, not wages; it lives in NetWorth and the owner's draw, and those readers are untouched.

Order: employer-floor sector rule → sector-gated hiring → per-hood rent share. Each is one bench cycle; the first two are one function each.

## 4. Status log

- 2026-09-07 S436 (later still) — engine.172 LIVE @70: the personal pay position. The flat "all plumbers make x" correction never landed on live; C107 lifts each untracked citizen to their own figure instead (~102 of 238; 37 by >1.4×). Still open for the builder: the rows ABOVE their own figure (≈107 untracked + the employed above-band) stay by the raise-only rule; a one-time true-down is a many-row sheet write and waits for an explicit go.

- 2026-09-07 S436 (later) — engine.169 + 170 cut (`b` commits, PROD @69). 169 floors an out-of-sector job at min(job band, employer × stage): the first cut used the band alone and the bench pre-probe showed it lifting 41 rows off mis-read titles ('Journalist, Data Desk' → Tech via the 'data' hint → 209k), so the floor never passes either signal. On the live-synced bench 169 touches 0 rows — every employee was already at the company average — its effect is forward. 170: the matcher was already gated on SkillTags (S336) with the cross-field filler removed (E3, S401); none of the 299 employed rows with a listed job carry a hire line, so every job/employer mismatch is seeded data. The remaining cut: a field-change hire now takes an entry job in the new field. **Open (builder):** the 124 rows above their band stay by the raise-only rule; and the D4 job floor lifts 127 of 263 untracked rows at the next live fire (53 by more than 1.4× — Plumbers seeded at 46k rising to the catalog's 118k band). Both are the catalog being applied; say if either should be staged rather than landed in one cycle.
- 2026-09-07 S436 — written from live measurements after PROD @65–@68 (engine.164/165/166 v2/168). Rows: engine.169 (employer floor in-sector), engine.170 (sector-gated hiring), engine.171 (per-hood rent share). Builder to confirm the rent shares in §3 before engine.171 cuts.
