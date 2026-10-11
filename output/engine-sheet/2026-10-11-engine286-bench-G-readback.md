# engine.286 bench G — SANDBOX 1004 @17 (`5394d46f`), reset from BASELINE-1004-C110

Pools applied to the bench ECL before the first fire: civicRole 336 rows, lifeEvent 128 rows (read back). Code: Task 2 pursuit dice + codex fold `652e608b`, Task 6 urn + band. C111 201 s / C112 163 s / C113 185 s at the ruled seeds (fire .05, medium .08, large .01, homeLossChance .00625); 0 new Engine_Errors. **C114 is NON-CANON**: fire .15, medium .50, large .50, homeLossChance .50, raised only so each writer path lands as a line (builder approved: "yeah that would be fine"); seeds set back to .05 / .08 / .01 / .00625 and read back after it. One Engine_Errors row at C114 is `Phase1-FireGuard` refusing a duplicate GET of the already-run Cycle (trap 5b shape) — the guard working, one Cycle ran.

## Task 6 Ask 2 — civic role urn, C111–C113 (LifeHistory_Log)

| Cycle | draws | pool keys | repeats in a Cycle | M/L drawn from an unbanded pool |
|---|---:|---:|---:|---:|
| 111 | 21 | 9 | 0 | 0 |
| 112 | 23 | 9 | 0 | 0 |
| 113 | 25 | 10 | 0 | 0 |

Max 7 draws on one key in a Cycle (everyday); every text maps back to its authored key. Per-key: `2026-10-11-engine286-bench-G-civicrole-urn.json`.

## Task 2 — the pursuit dice at the ruled seeds, C111–C113

Promotion: S 71 (up 52 / down 19), M 9 (up 8 / down 1), L 2-3 promotions (two from the authored L pool; one "Promoted at" line could be the die or the business budget). Home: S 31, M 2, L up 1 purchase (Vivian Tse, Chinatown), L down 1 forced sale (Jarko Freako, West Oakland: HH-0084-467 owned → rented, MonthlyRent 3647 → 3625 market, HousingCost 781440 → 0; income 99,415, payment + tax ≈ 52% of it).

## C114 (NON-CANON, raised) — one of each writer, as the builder reads them

**Die promotion (own shot after a medium break, two Cycles):**
- POP-00223 Rafael Brannie, Piedmont Ave — `Y3C9 — [LifeEvent-Promotion-Up-M] Got the trial run at Mayday Movers: acting lead for the month, with the real title in play.` then `Y3C10 — [Promotion] Promoted at Mayday Movers (the break paid off) after 28 years as a Mover.`
- POP-00189 Blair Patel, Lake Merritt — `[Promotion] Took the step up at Port of Oakland after 41 years as a Ship Repair Foreman.`

**Die layoff:** POP-01074 Denise Simmons, Fruitvale — `[Career-Layoff] Let go from West Oakland Stabilization Fund in a round of cuts that took half the floor.` (also POP-00023, POP-01180; POP-00940's "Let go as Oakland Hospital pulled back" is the business budget's own line)

**Die purchase:** POP-00200 Evan Lewis, Laurel — `[LifeEvent-Home-Up-L] Closed on a home in Laurel after years of renting — $113520 down on $567600`

**Forced sale:** POP-00641 Hector Campbell, Rockridge — `[LifeEvent-Home-Down-L] Sold the house in Rockridge and signed a lease three blocks over — $432749 back from the sale`

| HH-0084-424 | HousingType | MonthlyRent | HousingCost | Neighborhood | HouseholdIncome |
|---|---|---:|---:|---|---:|
| before | owned | 3722 | 797544 | Rockridge | 104000 |
| after | rented | 4056 | 0 | Rockridge | 104000 |

C114 totals: 22 Promotion lines (die L + own shots + budget), 4 Career-Layoff, 5 home purchases (adult lines), 4 forced-sale lines (3 households: HH-0084-215, -424, -491).

## Acceptance 3 — the general citizen wake on the bench (dry run, nothing written)

`citizen-wake.js --dry-run --pop=POP-00223 --cycle=114` against the bench: Rafael Brannie is in the shaped pool (239); his five-line tail carries both lines; the perception says "What the last stretch threw at you: a promotion."; the reflection opens "Twenty-eight years of lifting other people's lives … and now that I've got the title, the weight's different." Full payload: `2026-10-11-engine286-bench-G-wake-POP-00223-c114.txt`. 16 of 69 die-touched citizens sit in the shaped pool.

## For the builder

- POP-00306 Mika Loop (HH-0084-215) was forced to sell on a $48,000 income while holding $2.46M in HouseholdSavings — the over-half bar reads income only. Should savings count before a house is lost?
- Hal Richmond (Tier 1) drew a home event (`Y3C7 — [LifeEvent-Home-Up-M] The landlord in Chinatown offered to sell them the unit…`) — household events are life, not profession (R3), so the flags do not gate them; noting it because he is a protected seat.
