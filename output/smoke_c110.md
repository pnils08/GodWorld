# C110 smoke — per-layer read of the live fire (PROD @135, engine `e59e89f8`, fired 2026-10-04 17:03 CDT)

Read 2026-10-06 by engine-sheet. Expected values are the §S525 clause (`docs/mags-corliss/SESSION_HISTORY.md:15`), written pre-fire from bench rehearsals. Observed values come from one UNFORMATTED_VALUE pull of the live tabs (row numbers kept), `output/execution_log_c110.txt`, and `node scripts/auditSimulationLedger.js`. Counts from rehearsals are estimates; identities, keys, row shapes and status transitions are hard checks. Plan review: `docs/for-claude-review/2026-10-06-codex-c110-smoke-plan.md` (ten findings, folded).

Verdict: **15 of 15 PROD layers landed. One shape miss (engine.276, below). Two pre-existing watch items.**

## The fire

| Check | Expected | Observed | Source |
|---|---|---|---|
| Engine_Errors at C110 | none | 0 rows (tab's 4 rows are C108/C109 WeekRecord) | Engine_Errors rows 2–5 |
| phases | 132 ok | 132/132 ok, 157.3 s | execution_log_c110.txt:229 |
| @135 fire lock | no FireGuard rows; cycleCount 110 | none; `cycleCount` 110, `fireGuardMinutes` 60 | World_Config |
| Storyline tabs | Storyline_Tracker / Storyline_Intake absent | absent (Storyline_Ledger is a different tab) | spreadsheet tab list, 83 tabs |
| Carry ring | 110 rows | all seven keys at 110 (ring 108/109/110) | Carry_Forward_Store |

## engine.271 city revenue (`a6e36842`)

| Check | Expected | Observed |
|---|---|---|
| World_Config keys | fineRate ×4, fineCap ×3, propertyTaxRate .01, businessTaxRate .01, taxDayCyclePosition 16, taxThinHoodFloor 20 | all 11 present at those values |
| City_Treasury | OPENING $100M, 3 PREFUNDED, $5M allocation, COURT ~$130–160K, TICKETS if a ticket fired | rows 2–8: OPENING/GENERAL-FUND 100,000,000; PREFUNDED INIT-001/002/005 (amount 0); REVENUE/WEEKLY-ALLOCATION 5,000,000; REVENUE/TICKETS 500 (POP-00657 parking); REVENUE/COURT 153,351 (34 cleared charges) — Entry is `REVENUE`, the kind is the Counterparty (`applyInitiativeImplementationEffects.js:1144`) |
| BalanceAfter chains | yes | 100,000,000 → 105,000,000 → 105,000,500 → 105,153,851 |
| no PROPERTY-TAX until C120 | none | none |
| ticketed citizen line | `[Money] the ticket cost $…` | POP-00657 carries it |
| COURT_FINE hook | one per named judicial fine | none — no judicial fine at C110 (0 Judicial_Ledger rows); correct |

## engine.276 debt follows net worth (`5a65a82a`)

| Check | Expected | Observed |
|---|---|---|
| World_Config | 6 `debt*` keys | debtLineMultiple 1, Rise .02, Fall .08, DragCapShare .5, DefaultCycles 12, DefaultMarkCycles 52 |
| Phase5-GenerationalWealth | ok | ok, 4,882 ms |
| defaults | ~1 (rehearsal) | 5: POP-00784, -00798, -00963, -00971, -01017 — each DebtLevel 1, `DialState.debtDefault {l:110,n:1}`, `[Money] defaulted…` line, DEBT_DEFAULT hook (5 hooks), ENGINE clock, net worth under the hood line (the rule is net worth vs hood median income × multiple, `generationalWealthEngine.js:506-510`; §S525's "under MedianIncome" means that) |
| **NetWorth 0 on default** | 0 | **3 of 5 read 0; POP-00963 and POP-00971 read blank `""`.** Cause: `nwNew = 0` then `if (nwNew !== nw) row[iNW] = nwNew` (`:510-528`); a citizen whose NetWorth cell was blank reads `nw` 0, so the write is skipped and the cell stays blank. **SHAPE MISS — one-line fix (write on default regardless), engine gap row.** |
| rises/falls | falls ~35–40, rises ~3, risers none above 6 | vs the C108-close snapshot (`0d6e7005`, the only pre-C110 snapshot in git): up 3 (1→2, 5→6, 1→2), down 109, >6 went 19 → 16. The baseline includes C109's own movement, so the fall count is not attributable to C110 alone. Risers none above 6 ✓ |
| rise over the line carries Career-Layoff | — | not verifiable against a C108 baseline; no Layoff line at C110 |

## engine.272 integrity wear (`74925c1c`, rate 1 since 2026-10-01)

| Check | Expected | Observed |
|---|---|---|
| World_Config | integrityWearRate 1, Floor 10 | 1 / 10 |
| wear | ~37 cohort / 0 outside / 0 overwork-only | `integrity wear 35/0 at rate 1` (log:188); 35 DialState rows carry `wear {d:1,l:110}` — counts agree |
| Phase9-IntegrityWear errors | none | none |

## engine.274 career-loop reach

| Check | Expected | Observed |
|---|---|---|
| career-tag lines | exactly 10, walk from data row 930 wrapping past 386 | 10 `Career`-tag lines at C110 (9 `Career` + 1 `Career-FirstFriday`): POP-01107, -01110, -01120, -01127, -01129 then POP-00029, -00048, -00167, -00178, -00186 — late rows first, then the wrap; `runCareerEngine.js:1044` |
| POP-00801 no pay hit | EconomicProfileKey blank | blank; Income 230,000 unchanged |
| show lines | Reputation for pilots, Personal for audience | 5 `Reputation\|source:undocked\|…ecl:kind:pilot` lines (POP-00121, -00190 ×2, …), 255 `Personal\|source:undocked` audience lines; pilots per log:65 POP-00121/-00190/-00141 |

## engine.254 Task 10 hospital talk-back (`3e12b367`)

| Check | Expected | Observed |
|---|---|---|
| World_Config self-arm | hospitalStrainWindow 8 / Band .25 / Gain .02 | 8 / 0.25 / 0.02 |
| packet | `--- HOSPITAL STRAIN ---` `HospitalStrain: no-census \| illness +0` | exactly that |
| Phase3-Demographics | ~1 s | 568 ms |

## engine.254 Task 8 census + care ledgers

| Check | Expected | Observed |
|---|---|---|
| Care_Justice_Census | exactly 216 rows at 110, `cj-2` | 216/216, all cj-2 (22 hoods + unallocated + city) × (hospital 7 intake types + judicial 2) |
| city rows | hospital ~77, custody ~68, complete | hospital/all closing 77, judicial/all closing 68, every city row `complete` |
| Rockridge/unclassified | Corrections 1 (POP-00801), Exits 1 only if discharged | Corrections 1, Exits 0 — POP-00801 is `recovering` (Hospital_Ledger row 4, LastTransition 110, not discharged); consistent |
| Phase10-CareJusticeCensus | present; ms noted for follow-up (b) | ok, **1,243 ms** (measure point 1 of 2; re-read near C119) |
| Hospital_Ledger | new admissions carry L–P | no new admission at C110 (3 rows, all C105/C106); POP-00801 → `recovering` |
| Judicial_Ledger | one `pending` row per cop-car arrest | 0 rows — the one named cop-car hit (POP-00518, Fruitvale) rolled `helped_by_police` / Recovering, not an arrest; no row is correct |
| Phase5-Judicial | ok | ok 4 ms; no dismissal/settlement rows (none possible at C110) |

## engine.254 Task 7/7b demand-first care & justice (@126/@127/@132)

| Check | Expected | Observed |
|---|---|---|
| careJusticeDemand lines | 23 in the log | 23 |
| careJusticeNamed | one pass; cop-car citizen rows only from it | 3 lines (one per vehicle): cop_car calls 156 named 1 `Fruitvale:POP-00518`; ambulance calls 38 named 0; oari_van calls 6 named 0 (log:100–102) |
| named hit sits in a hood with charges | yes | Fruitvale judicial/arrest intake 1 in the census |
| Chaos_Cars C110 | citizen rows only from the named pass | 13 rows: cop_car citizen POP-00518 (named); ambulance = neighborhood Ivy Hill (no citizen); no oari_van row; the rest garbage/mail/street-sweeper/fire-engine |
| frequency guard | PASS | `chaosCarsFrequencyCheck.js --named-since cop_car=110,ambulance=110,oari_van=110`: PASS, 11 cycles in [3,15], C110 = 12 |

## engine.273 holidays (@128/@129/@131, Second Dawn `bce69997`)

| Check | Expected | Observed |
|---|---|---|
| Simulation_Calendar | holiday `none` at position 6 | Y3 M2 D1, Winter, `none`, "Cycle 6 (Abs: 110)" |
| packet | `Holiday: none`; no `Month:` line; no English month; no dropped-holiday text | all four hold (`CycleInMonth: 1` is the only month-shaped line) |
| LifeHistory_Log / hooks at C110 | no English month | 0 of 2,579 log lines, 0 of 77 hooks |
| First Friday | true | `firstFriday` on the C110 tags; Neighborhood_Map FirstFriday true |
| faith | no Hanukkah | 5 Faith_Ledger rows at C110, all `community_program`, no Hanukkah anywhere |

## engine.278 / engine.279 mints

| Check | Expected | Observed |
|---|---|---|
| ledger | 963 → ≥1,017 | 1,025 extant (62 minted) |
| the 54 authored staff | 10 BIZ-00024, 11 -00023, 9 -00095, 12 -00015, 12 -00016; T3 ×16 / T4 ×38; ENGINE | exactly those employer counts; T3 16, T4 46 (38 + 6 migration + 2 other); all 62 ENGINE |
| SkillTags | every one | all 56 non-migration mints carry SkillTags; the 6 blank are the migration-wave arrivals POP-01135…-01140 (engine.104, expected) |
| `Seeking work` | none | none |
| `undefined` | none | none on any mint; the ledger's one `undefined` is POP-01022's **Y2C49** `[Sports] undefined` line — a pre-engine.208 artifact, not this fire |
| Phase5-Advancement | ~11 s | 8,248 ms; Advancement 70 + Promotion 62 lines at C110 in LifeHistory_Log (2,579 C110 lines) |
| intake queue | consumed | Advancement_Intake1: 51 non-empty rows remain of 128 |

## engine.208 M1 athlete going-home lines (`e59e89f8`)

| Check | Expected | Observed |
|---|---|---|
| player lines | ~14 athletes, one real `[Sports]` line each, none `undefined` | log:105 `17 player going-home moment(s)`; 17 bare `Sports\|source:sports\|gameNight\|streak:*` lines on A's and Oaks rows (POP-00001/003/018/022/024/025/033/527, POP-01022/023/024/027, …); 0 `undefined` at C110 |
| unresolved feed names logged | the bench's typos | no unresolved line in the log — every C110 feed name resolved on live (`applyGameNightMoments.js:275` logs only when any is unresolved) |
| Phase5-GameNightMoments errors | none | none |

## @122 civic close, carry, Step 5.58

| Check | Expected | Observed |
|---|---|---|
| civic apply | `moves_c109` folded | `close_c110.json` `.applied` true; Initiative_Tracker LastWorkCycle 110 on INIT-001/002/003/006; INIT-005 held at 108 and INIT-007 untouched — the civic.44 scoped FAIL (`3c9447fb`) |
| mood/media/relocation carry | present | PREV_EVENING / PREV_CITY_DYN / PREV_RELOC_FLOW at 110 |
| Civis journal | JSON + MD, cycle 110, replayKey `POP-00789:C110:journal`, pageCustomId `cp-POP-00789-c110-journal` | both files; fields exact |

## Watch items (pre-existing, not this fire's)

1. **Status case split.** Ledger reads `Active` 977 / `active` 3 (POP-00194, -00528, -01028) / `recovering` 1 / `Retired` 44. The care-ledger discharge path writes lowercase (`judicialLifecycle.js:667`, `generationalEventsEngine.js:434`); `docs/SIMULATION_LEDGER.md:205` lists `Active / Retired / Recovering / detained`. LEDGER_AUDIT flagged the same class at S234. Engine gap row: one canonical case at the writer.
2. **Texture_Trigger_Log Holiday/FirstFriday/SportsSeason columns** are null for C107–C110 (23 rows at C110); the same facts live on Neighborhood_Map and in the LifeHistory tags. Reader check before anyone writes copy off those columns.

## Follow-ups filed from this read

- engine gap: engine.276 default leaves a blank NetWorth blank (fix: write 0 on default unconditionally).
- engine gap: Status case at the care-ledger writers.
- measure point 2: `Phase10-CareJusticeCensus` ms near C119 (1,243 ms at C110).
- rb: the 54 mints are on the ledger with their employers; roster rows via `linkCitizensToEmployers.js --fill-blanks-only --dry-run` first (a PROD write, not part of this smoke).
