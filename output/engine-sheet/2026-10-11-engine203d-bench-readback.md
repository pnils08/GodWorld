# engine.203d bench readback — SANDBOX 1004, 2026-10-11 overnight

Package: isolated stage = fresh PROD pull (63754ca8) + applySportsSeason.js, sportsWeekRecord.js,
generateCitizensEvents.js (HEAD e34c8b19) + engine94SheetContract.js (PROD + sportsFadeRate seed).

| Run | Package | Reset | C111 | Sports sentiment ripple (C111) | CitySentiment |
|---|---|---|---|---|---|
| A | @19 (38f19986) | BASELINE-1004-C110 + civicRole 336 + lifeEvent 128 | ok, 0 new Engine_Errors, sportsFadeRate self-armed 0.85 | `A's W3 [player-energy]; A's W3 [championship]; Oaks L5 ...` **+0.08** — C110's rows and triggers spoke again with no game | 0.46 |
| B | @20 (e34c8b19, + S.cycleId read) | same | ok 151.5 s, 594 intents, 0 persist errors, Engine_Errors 4 → 4 | `aftermath: A's title week 1 after C110; Oaks upset week 1 after C110` **+0.065** | 0.44 |

Run A exposed the pre-existing defect: applySportsFeedTriggers_ read `S.cycle` (never assigned on a fire),
so currentCycle = 0 and engine.75's current-row gate never closed on live — every franchise spoke its
all-time latest feed state every week. Run B = the local replay exactly (A's 0.100 → 0.085, Oaks −0.020).

Live World_Config (2026-10-11 ~03:45): grid 221 → 271 (50 empty rows appended, builder: "give world config
room to breathe"); `sportsFadeRate` 0.85 written at row 222, read back as a number. PROD push: blocked by the
auto-mode classifier [Production Deploy]; one-command script `output/engine-sheet/push-203d-prod.sh`.

## Stage 2 — engine.203d + Open Court Week + engine.193 (b), bench 1004 @21 (`e3a85853`)

Seven files vs a fresh PROD pull (the four above + `getSimHoliday.js`, `applyCompressionDigestSummary.js`,
`applyBusinessDynamics.js`; contract carries the `bizSettleRate` / `bizSettleMinStaff` seeds too). Reset from
BASELINE-1004-C110 (tenth time), pools re-applied, fire record cleared.

| Cycle | Result | Sports aftermath | CitySentiment | Institutions' Growth_Rate (Port / AC Transit / Oak Hosp / OUSD / City / EBMUD / Kaiser / PG&E / Peralta) |
|---|---|---|---|---|
| C110 baseline | — | — | — | 12.69 / 12.00 / 9.09 / 8.89 / 10.93 / 11.72 / 10.17 / 10.10 / 8.94 |
| C111 on @20 (no settle) | ok | +0.065 | 0.44 | 12.91 / 12.95 / 8.62 / 8.69 / 11.84 / 12.47 / 10.27 / 9.73 / 8.62 |
| C111 on @21 | ok 166 s, 594 intents, 0 persist errors, EE 4 → 4 | +0.065 | 0.44 | 12.38 / 12.45 / 8.31 / 8.34 / 11.39 / 11.99 / 9.91 / 9.32 / 8.27 |
| C112 on @21 | ok 190 s, 498 intents, 0 persist errors, EE 4 → 4 | +0.055 (week 2) | 0.13 | 12.03 / 12.07 / 7.97 / 7.90 / 11.42 / 11.94 / 9.57 / 8.62 / 7.85 |

@21 − @20 at C111 = the settle (Port −0.53 = 0.05 × (2 − 12.69); OUSD −0.35); events still move them (City of Oakland
+0.03 at C112). All-business mean 7.55 → 7.07 → 7.11; positive 170 → 168 → 164. World_Config self-armed to 236 rows.

**Live expectations once stage 2 is on PROD (first fire after the push):** Ripple_Ledger one sports sentiment row
`aftermath: A's title week N after C110; Oaks …` (N = fire − 110; magnitude 0.065 at C111, 0.055 at C112 if no
games are logged); World_Config self-arms `bizSettleRate` 0.05 and `bizSettleMinStaff` 1000 (rows after 222 —
the grid has room); the nine institutions' Growth_Rate each down ~5% of their gap to the class norm; 0 new
Engine_Errors. Rollback = push the `prodpull` tree (PROD `63754ca8`) back.
