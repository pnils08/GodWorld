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
