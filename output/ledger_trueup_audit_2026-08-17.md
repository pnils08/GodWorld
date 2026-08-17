# Simulation_Ledger true-up audit — 2026-08-17 (S378)

961 rows, 54 columns. Read-only pass against the live sheet. Bug classes named by Mike, quantified.

| # | class | count | notes |
|---|---|---|---|
| 1 | athletes marked `CareerStage=student` | 2 | POP-00053 Kevin Clark [Third Baseman, Oakland A's]; POP-00078 Sergio Aybar [Catcher, Midland RockHounds (AA)] |
| 2 | `CareerStage` distinct values | 10 | `senior` 333, `mid-career` 285, `entry-level` 85, `mid` 63, `student` 61, `early-career` 55, `retired` 43, `(blank)` 28, `early` 6, `entry` 2 |
| 3 | `CareerStage=retired` w/ active RoleType + non-retired Status | 1 | POP-00809 Hazel Lockhart [Glazier] |
| 4 | `WealthLevel` distinct values | 12 | numeric 0–10 + 21 blank; distribution `0`:56 `1`:24 `2`:62 `3`:13 `4`:80 `5`:189 `6`:179 `7`:202 `8`:14 `9`:98 `10`:23 |
| 5 | `NetWorth` blank | 93 | 0 non-numeric |
| 6 | `Income` blank | 1 | |
| 7 | `SchoolQuality` unusable | 909 of 961 | 306 blank + 603 sitting at the default `5`; only 52 rows carry a differentiated value |
| 8 | `MigrationIntent` set on retired/deceased | 37 | all `staying` |
| 9 | impossible BirthYear | 1 | POP-00173 Kaila Braun b.1889 (age 153) |
| 10 | age 70+ w/ active role, not retired anywhere | 21 | includes POP-00042 Ramon Vega b.1968 [Council President] — canon-plausible, not automatically a defect |
| — | **rows carrying ≥1 defect above** | **348 (36.2%)** | dominated by classes 7 and 5 |

Age anchor check: 95 citizens 65+ at a 2041 anchor, 109 at 2042. `World_Config` returned no usable
year key (`year` lookup → `FALSE`), so the anchor is not machine-readable from config — that itself
is a defect worth closing before any age-derived repair runs.

## Reconciliation with engine.82

`docs/plans/2026-08-11-careerstage-salary-coherence.md` (C103 snapshot, S365) reports **217/856
active marked `retired`** and **5 active pro athletes marked `student`**. Live now: **43 total**
`CareerStage=retired` and **2** athlete-students. Those headline numbers no longer describe the
sheet. Re-audit before executing engine.82 Tasks 1–2 — the enum drift (class 2) is confirmed and
unrepaired, but the false-retired population is not the size the plan was written against.

## Coverage against existing rollout rows

- classes 1, 2, 3 → engine.82 (reverted S366, unrepaired)
- classes 4, 5 → `docs/plans/2026-08-09-wealthlevel-networth-bands.md`
- classes 6 → engine.83 / engine.85 employment work
- classes 7, 8, 9, and the `World_Config` year gap → **not covered by any open row** → engine.117
