# Map — Retired rows that keep an employer (G-EC75)

**Summary (five lines)**
1. 22 Simulation_Ledger rows with Status Retired carry a `BIZ-` EmployerBizId (SNAP 2026-11-24 01:58; the 11-25 gap-log live counts, 22 and 626 Active, match it): 6 former baseball rows (5 players, 1 manager), 3 titled "Retired …", 13 whose RoleType is still the job. 0 are on the derived roster, 16 pay 0, 20 have a blank CitizenBio.
2. No code found sets Status = Retired (git grep at the 08-17 commit and an un-windowed `git log -S` over phase04/phase05/utilities/scripts/lib). In git the Retired set went 7 (08-12) → 46 (08-17), in the same week the engine.82 CareerStage repair took `retired` stages 249 → 43; the 40 rows that flipped kept RoleType, employer and pay. Who flipped them: not traced. Neither the sports retirement (`sportsRetire_`) nor the engine's `[Retirement]` die touches an employer.
3. Most engine readers already test Active (wealth floors, career engine, every headcount, casino, transit staffing, roster, mint/owner-door counts). The 22 do reach: the commute matrix (14 counted, which feeds the daytime lift and transit shares), `detectCareerMobility_` (21 stagnation draws a cycle), the citizen card, the world-view staff panel, `cascadeAudit`. Not reached: club-staff week line (all 35 are ENGINE clock), `employer=` / `place:employer` content rows (gated on `lifestate=working`).
4. No past-employer or end-date column exists. Nearest: CitizenBio `Now:` line (engine.333 writer; engine.336 `ready` row would stack job-change lines), LifeHistory text, RoleType "Former …". No engine path can clear the key on a Retired row: the one clearing writer only runs on Active rows, and the intake door cannot write a blank. Any change to the 22 needs a new engine step.
5. Options (a) clear + record, (b) keep + filter, (c) what is half-built are laid out in §6 with files, effect on the 22, and what a sandbox read must check. Section 8 lists what was not traced.

---

## 0. Sources and staleness

| tag | what | as of |
|---|---|---|
| SNAP | `output/simulation_ledger_snapshot.jsonl`, 1077 rows (1042 Active, 35 Retired) | mtime Nov 24 01:58 |
| BEATS | `output/beats/{Employment_Roster,Business_Ledger,Neighborhood_Map,Story_Hook_Deck,LifeHistory_Log}.jsonl`, `meta.json` cycle 117 | mtime Nov 22 17:52 |
| GITSNAP | `git show <commit>:output/simulation_ledger_snapshot.jsonl` (31 commits, 2026-08-12 → 11-21) | per commit |
| MARCH | `backups/sheets/2026-11-16/{Employment_Roster,Simulation_Ledger,Event_Content_Ledger}.csv` | 2026-11-16 |
| GAP | `output/production_log_run_cycle_c117_gaps.md:315-316` (G-EC75) | 2026-11-25 |
| code | files under `phase*`, `utilities`, `lib`, `scripts`, `world-view`, read today | working tree |

Counts of 22 / 626 in GAP equal the same counts in SNAP, so no drift is visible on those two numbers. Every per-row value below is SNAP unless stated.

---

## 1. The 22 rows

All 22: Status Retired, CareerStage retired, ClockMode ENGINE, not on the derived roster (BEATS `Employment_Roster.jsonl` = 626 rows, none of the 35 Retired POPIDs). "March tab" = the frozen sheet-tab copy in MARCH, whose Status column is a mapping label (`Active` / `SELF_EMPLOYED` / `UNTRACKED`), not the ledger Status.

| # | POPID | Name | RoleType | EmployerBizId = business (hood) | Tier | Income | Bio | March tab |
|---|---|---|---|---|---|---|---|---|
| 1 | POP-00114 | Mike Kinder | Former Manager, Oakland A's | BIZ-00005 Oakland Athletics (Baylight District) | 1 | 0 | blank | row |
| 2 | POP-00124 | Steve Conrad | Ex-As Star - RF | BIZ-00005 | 1 | 149730 | blank | row |
| 3 | POP-00125 | Paul Skenes | Retired former As | BIZ-00005 | 1 | 223635 | blank | absent |
| 4 | POP-00126 | Orion Kerkering | Retired former As | BIZ-00005 | 2 | 225264 | blank | absent |
| 5 | POP-00128 | Kris Bubic | Retired former As / Bubic Burgers | BIZ-00104 Bubic Burgers (Baylight District) | 2 | 243121 | blank | absent |
| 6 | POP-00129 | Dalton Rushing | Retired former As, Youth Baseball Coach | BIZ-00103 Firehouse 29 West Oakland Baseball Academy (West Oakland) | 2 | 118019 | yes | absent |
| 7 | POP-00288 | Marcus Wright | Server | BIZ-00048 West Side Cafe (West Oakland) | 2 | 38788 | blank | row |
| 8 | POP-00308 | Cathy Skeet | Elder Tech Liaison | BIZ-00034 Oakland Housing Authority (City-wide) | 4 | 0 | blank | row |
| 9 | POP-00310 | Arnie Carter | Immigrant Legal Aid Worker | BIZ-00022 Alameda County Courts (Downtown) | 4 | 0 | blank | row |
| 10 | POP-00321 | Jee Lei | After-School Program Director | BIZ-00016 Oakland City Schools (City-wide) | 4 | 0 | blank | row |
| 11 | POP-00349 | Jiu Wong | Carpet Installer | BIZ-00020 Baylight Construction Authority (Baylight District) | 4 | 0 | blank | row |
| 12 | POP-00440 | Xing Patel | Ship Repair Foreman | BIZ-00012 Port of Oakland (Jack London) | 3 | 0 | blank | row |
| 13 | POP-00442 | Daire Green | Transit Operator (AC Transit) | BIZ-00013 AC Transit (Downtown) | 3 | 0 | blank | row |
| 14 | POP-00443 | Ace Hill | ESL Teacher | BIZ-00016 | 3 | 0 | blank | row |
| 15 | POP-00448 | Ray Neal | AC Transit Bus Operator | BIZ-00013 | 3 | 0 | blank | row |
| 16 | POP-00472 | Josie Wong | Commercial Painter | BIZ-00020 | 4 | 0 | blank | row |
| 17 | POP-00473 | Destiny Ochoa | Disability Rights Advocate | BIZ-00034 | 4 | 0 | blank | row |
| 18 | POP-00594 | Robert Corliss | Retired Estuary Power & Gas Engineer | BIZ-00032 Estuary Power & Gas (City-wide) | 3 | 0 | "Middle name: James." | absent |
| 19 | POP-00729 | Patricia Nolan | Retired teacher | BIZ-00015 Oakland Hospital (City-wide) | 4 | 0 | blank | absent |
| 20 | POP-00733 | Dorothy Rios | Retired | BIZ-00016 | 4 | 0 | blank | absent |
| 21 | POP-00827 | Gloria Liu | School Principal | BIZ-00016 | 4 | 0 | blank | row |
| 22 | POP-00863 | Charlene Gutierrez | Dental Hygienist | BIZ-00025 Piedmont Avenue Medical Center (Piedmont Ave) | 4 | 0 | blank | row |

**The 22 are three kinds of row, not one**

| kind | rows | what the key means |
|---|---|---|
| former baseball rows (players; Kinder was the manager) | 1–6 | BIZ-00005 ×4 (the club). POP-00128: the business is his own — Business_Ledger Key_Personnel of BIZ-00104 is `POP-00128 Kris Bubic` (BEATS). POP-00129: title says he coaches now, bio "Former A's player turned youth baseball coach", Income 118019 — the key is current work. |
| title is still the job | 7–17, 21, 22 (13 rows) | the job they left; RoleType unchanged by the flip (§2) |
| title names retirement | 18–20 | job text already in the title (Corliss: "Estuary Power & Gas Engineer"); the key repeats it |

Income: 6 rows positive (rows 2–7, all Tier 1–2), 16 rows 0. Zero is the money rule, not the flip: `generationalWealthEngine.js:624-625` sets a Retired Tier 3–4 Income to 0 and exempts Tier 1–2; GITSNAP shows Tier 3–4 pay intact at 08-17 and 0 by 08-31 (e.g. POP-00440 255081 → 0).

The other 13 Retired rows carry no `BIZ-`: SELF_EMPLOYED ×8 (POP-00336, 360, 366, 465, 668, 672, 831, 846), UNTRACKED ×4 (727, 735, 819, 824), blank ×1 (730). The key is a past job there too.

Business side (SNAP + BEATS): BIZ-00048, BIZ-00103, BIZ-00104 each have **0 Active** tracked staff and exactly the one retiree above. All 13 ids resolve on Business_Ledger today (0 dangling).

---

## 2. How a row becomes Retired — every path found

Cells named per path: Status, CareerStage, EmployerBizId (key), RoleType, Income, Employment_Roster (roster), business Employee_Count (headcount).

| path | file:line | what it does to the cells |
|---|---|---|
| **No engine writer of Status = Retired.** Status writers in phase*/utilities: health (`generationalEventsEngine.js:337,448,660,708`: hospitalized / transition / `deceased` / admit), `judicialLifecycle.js:530`, mints write `Active` (`processAdvancementIntake.js:1175`, `checkForPromotions.js:367`, `generateGenericCitizens.js:670`), `applyGameNightMoments.js:365,391` (injured / restore prior), `archiveCitizenExits.js:352`. A hospital discharge restores the carried PriorStatus, so Retired stays Retired. | `generationalEventsEngine.js:441-449` | n/a |
| one-time script: queues Status → Retired, ClockMode → GAME, BirthYear for four named players (POP-00125/126/127/128) | `scripts/prepAthleteIntegration.js:185-208` | Status set; nothing else of the seven |
| status-normalizing script: maps `Inactive` / `deceased` (and players' `Traded` / `Departed`) → Retired; whether it ran on these rows: not traced | `scripts/cleanupSimulationLedger.js:290-301` | Status set |
| the 35 as found in git | GITSNAP | 08-12 capture (`fb377ffed`): 7 Retired; 08-17 (`04b11e223`): 46. Of today's 35, 5 were Retired on 08-12 (POP-00114, 125, 126, 128, 129); 30 flipped between the two captures, and in the second capture RoleType, key and Income are as before (POP-00440 `Active\|BIZ-00012\|255081` → `Retired\|BIZ-00012\|255081`). All 40 rows that flipped (30 of them are in today's 35; the other 10 are not Retired today) already carried CareerStage `retired` on 08-12; that capture had 217 Active rows at stage `retired`, the 08-17 capture 1 — the engine.82 repair (`scripts/migrations/engine82_repairCareerStage.js`, commit `46b41622f` 08-11; it reads Status at `:48,59` and writes only CareerStage) re-derived 177 of them to working stages and 40 became Status Retired. 34 of the 40 are ≥ 65 on a 2041 anchor, 6 are younger (ages 33–57; titles such as "Retired PG&E Engineer", "Retired teacher", "Ex-As Star"); 59 other Active rows aged ≥ 65 stayed Active, so it is not a plain age cut. `git grep -n -i retired 04b11e223 -- phase04-events phase05-citizens utilities scripts lib` finds no Status write; un-windowed `git log -S"'Retired'"` over those directories lists only readers, the roster derive and the 2026-11-25 coworker patch. **Writer of the flip: not traced** (a sheet edit outside the repo is the remaining candidate). Later: 44 (09-08…11-01) → 40 (11-12…11-19) → 35 after `eb0105cec` (11-20, five made Active); the 44 → 40 step includes the 11-07 MUBA ruling for three rows (plan `2026-11-07-former-player-next-chapter.md` C5), the fourth not traced. None of today's 35 became Retired after 08-17. |
| CareerStage `retired` (not Status): derivation at age ≥ 65 | `lib/citizenDerivation.js:98-99`, `utilities/citizenDerivation.js:157-158`; stamped at mint `processAdvancementIntake.js:1248`, spouse mint `bondEngine.js:2712,2923`, derived row `checkForPromotions.js:385` | CareerStage set at mint only; no Income at mint when stage retired (`processAdvancementIntake.js:1208-1209`); **key still picked** — the gate is `age >= 18` (`:1265`), the no-employer test reads RoleType (`:2067`) |
| stage is never re-derived or un-retired by age | `educationCareerEngine.js:540-545` (builder 2026-08-30 "no age retires anyone", comment `:452-457`) | none |
| sports retirement `sportsRetire_` (feed `retirement`, A's / Oaks rows, GAME clock, Status Active) | `applyGameNightMoments.js:301-340` | **Status stays Active** (ruling C4, plan `2026-11-05-feed-triggers-to-life-history.md` §C4: "employer kept"); CareerStage none; **key kept**; RoleType → `Former <role>` (`:320`); Income → World_Config figure for Tier 1–2 (`:325`), Tier 3–4 untouched; ClockMode → ENGINE, SPORTS_OVERRIDE cleared, `Now:` bio line (`sportsBioNow_` `:272`), `[Retirement]` life line; roster, headcount none |
| engine retirement die `checkRetirement_` (age ≥ 68 `:1380`; only guard: an existing `[Retirement]` line `:1379`; Retired rows are not skipped, `:414`) | `generationalEventsEngine.js:1378-1397`, called `:643-651` | no cell changes: a LifeHistory line + Log row (`applyMilestone_` `:1810`) and a 30% power-vacuum arc (`triggerRetirementCascade_` `:1632-1660`) |
| Universe phase: Retired + GAME → ENGINE with a LifeHistory note and Log row; Retired + ENGINE → 2% PostCareer texture — the only engine code that acts on a Retired row | `runAsUniversePipeline.js:552-576`, `:578` | ClockMode / LifeHistory / Log only |

The three Retired rows that carry an engine `[Retirement]` line (POP-00360 C108, POP-00366 C113, POP-00440 C116) were already Retired in the 09-08 capture (`3766dbacf`): the die fired on retirees.

Employer key edits on Retired rows between captures (writer not traced): POP-00124/125/126 `BIZ-00030` → `BIZ-00005`, POP-00128 → `BIZ-00104`, POP-00129 `BIZ-00016` → `BIZ-00103` (08-17 → 08-22); POP-00288 `BIZ-00030` → `BIZ-00048`, POP-00727 `BIZ-00028` → `UNTRACKED`, POP-00735 `BIZ-00034` → `UNTRACKED` (09-26 → 10-12). None after 10-12.

---

## 3. Readers of EmployerBizId

"Filter" = a Status / CareerStage test that excludes a Retired row before the employer is read. "Reach" = whether any of the 22 gets through the surrounding conditions.

### 3A. Engine-run readers

| # | site | uses the value for | filter | does the 22 reach it? | if cell blank | if a new non-BIZ word |
|---|---|---|---|---|---|---|
| 1 | `phase02-world-state/commuteFlowEngine.js:159-185` | work hood = employer's Business_Ledger hood → `S.commuteFlows` / `S.commuteInbound`; stats `citizens` counts before the employer branch | **none** for retired — skips only deceased / inactive / departed / traded (`:159`) | **YES — 14 of 22 enter the matrix**: 12 cross-hood (7 into Baylight District, 3 Downtown, 1 West Oakland, 1 Piedmont Ave), 2 same-hood (POP-00288, POP-00440); 8 City-wide employers are counted in `citizens` then dropped as `nonHoodWorkplace` (`:180`). Including the 13 non-BIZ retirees the Retired rows add 23 to the matrix (9 on the diagonal). | `!emp` → work = home (`:166`): all 22 would enter the matrix, on their own hood's diagonal (22, up from 14) | not SELF_EMPLOYED / UNTRACKED (`:166`, `:171`) / a known id → `unknownBiz` unresolved (`:174`) |
| 1a | → `applyCityDynamics.js:1562-1566` | daytime lift: retail × (1 + lift × 0.12), traffic × (1 + lift × 0.08); lift = min(1, inbound / 40) (`:1460`, `:1565`). Inbound includes the diagonal (`commuteFlowEngine.js:208`) | — | SNAP count of Retired rows in each hood's inbound: Baylight 7 of 130, West Oakland 4/102, Downtown 4/165, Uptown 4/62, Temescal 1/53, Jack London 1/72, Dimond 1/13, Piedmont Ave 1/18. A hood at ≥ 40 is already at full lift, so only Dimond and Piedmont Ave can move (about 1/40 × 12% retail each). | — | — |
| 1b | → `updateTransitMetrics.js:247,267` | station load share k(h) = inbound[h] / Σ inbound, all hoods | — | yes, as 1a: 23 of 822 counted rows (SNAP recomputation, Business_Ledger hoods from BEATS) | — | — |
| 2 | `phase02-world-state/updateTransitMetrics.js:170-195` `transitStaffing_` | BART crew counts for `BIZ-00014` (`:140`) | **Active only** (`:184`) | no — no retiree carries BIZ-00014 | n/a | n/a |
| 3 | `phase05-citizens/generationalWealthEngine.js:751-792` `applyTrackedEmployerFloor_` | income floor = employer Avg_Salary × stage factor | **retired skipped** (`:792`); tracked id must match `/^BIZ-\d+$/` | no | n/a | no floor |
| 3a | `generationalWealthEngine.js:1010-1025` `applyUntrackedJobReference_` | SELF_EMPLOYED / UNTRACKED job-band raise | **retired skipped** (`:1025`) | no | n/a | neither word → no raise |
| 3b | `generationalWealthEngine.js:624-632` (D5) | retired Tier 3–4 Income → 0; Tier 1–2 exempt; money loop skips retired (`:632`) | the rule itself is the Status test | does not read the employer | — | — |
| 4 | `phase05-citizens/applyBusinessDynamics.js:920-927` `archiveClosedBusinesses_` | tracked workers per business gate archiving a closed business | **Active only** (`:924`) | no. Consequence: a closed business with only retirees left archives, and the retiree's key then points at a business that is gone (`commuteFlowEngine.js:174` → `unknownBiz`; card prints the raw id). Today 3 businesses sit one step from that (BIZ-00048/103/104). | — | — |
| 5 | `phase05-citizens/runCareerEngine.js` | `careerEmployerBook_` staff `:404-448`; main loop `:1463,1477`; custody `:303-307,:353`; hire matcher `:1799` (also needs blank employer); civic movers `:1839`; headcount reconcile `:2184` | **Active-only everywhere except custody, which needs Status `detained` or a health state (`:334-340`); stage `retired` skipped at `:353` and `:1463`, Status retired at `:1477`** | no | blank = open hiring pool for Active ENGINE adults 18–64 with SkillTags (`:1799-1812`); a Retired row is out by Status | any non-empty word = employed, never in the pool |
| 6 | `phase05-citizens/applyGameNightMoments.js:593-596` | club-staff week line: `sportsStaffTeams_` (`:423`) on BIZ-00005 / BIZ-00074 (`:404`) | **none for Status** — `living()` drops only deceased (`:463`); gate is ClockMode GAME (`:593`) | **no today** — all 35 Retired rows are ENGINE (SNAP). A Retired GAME-clock row at BIZ-00005 would draw the line. | no team → no line | no team |
| 6a | `utilities/compressLifeHistory.js:752` | first-fold fandom start for a GAME-clock row at a club | none | no (ENGINE clock) | — | — |
| 7 | `phase05-citizens/casinoLedgerEngine.js:560` (draw record copy), `:954/:977` | copies the id onto the UNDOCKED draw row; `casinoEligible_` tests it only against the house id | `undockedEligible_` requires Active (`:483`); `casinoEligible_` requires active (`:412`) | no | — | — |
| 8 | `phase05-citizens/generateCitizensEvents.js:2873-2888` `loadWithIdx_` (with-whom coworker index) | coworkers by employer | **retired skipped since the 2026-11-25 patch** (`:2888`) | no (was the G-EC75 find) | no coworkers | non-BIZ skipped |
| 8a | `generateCitizensEvents.js:3935` → content-tab `employer=` term (DSL `loadEventContentLedger.js:90`) | aims a content row at employees of listed BIZ ids | gate is the row's own `lifestate=working`; `lifestate` is `retired` for Status Retired (`citizenContextBuilder.js:78`) | **no** — the two live rows are `lifestate=working; employer=BIZ-00001\|…\|BIZ-00004` (`docs/reference/DEPLOY_HISTORY.md:458`), none of the 22 carries those ids. The live tab was not read; MARCH (11-16) predates the 11-18 edit and has 0 `employer=` rows. | blank fails an `employer` term | — |
| 8b | `generateCitizensEvents.js:4390-4395` `place:employer` → `place:<BIZ_ID>` | puts the employer's id on a shift line's place | tag rides on 50 ECL rows (`output/engine-sheet/2026-11-24-e356j/ecl-act-tags.json`), all `work.*` pools; 49 of 50 carried `lifestate=working` in MARCH, the 50th (R227) was set to it on 11-18 (`DEPLOY_HISTORY.md:458`) | **no for Status Retired** (lifestate `retired`). Note: it is reached by the Active rows whose CareerStage is `retired` (§7). | tag dropped (`:4395`) | non-BIZ: tag dropped |
| 9 | `phase05-citizens/educationCareerEngine.js:608-641` `detectCareerMobility_` (called `:208`) | `CAREER_STAGNATION` story hook for a tracked employee: `trackedStag && rng() < 0.005` (`:625-627`) | **none** — skips deceased only (`:608`); stage `retired` only blocks the "advancing" branch (`:616`) | **YES — 21 of 22 draw once every cycle** (all but POP-00125, whose LastPromotionCycle 100 is < 40 cycles back; `ADVANCEMENT_CYCLES.STAGNATION` = 40 `:158`). A hit pushes a hook "<name> has not advanced in N years" to `ctx.summary.storyHooks`. Deck evidence (BEATS `Story_Hook_Deck.jsonl`, 148 stagnation hooks, C102–C117): 4 name a row that is Retired in SNAP — C102 Wright, C103 Gutierrez, C104 Kerkering, C109 Kinder. Whether the row was Retired at that Cycle is not on disk. The same pass writes CareerMobility `stagnant` on all 35 Retired rows (SNAP). | no draw | `/^BIZ-/` only → no draw |
| 10 | `educationCareerEngine.js:1279-1281`, `:1302` (`settleAdulthood_`) | tracked count for slot room; writes the new adult's employer | **Active only** (`:1279`) | no | — | — |
| 11 | `processAdvancementIntake.js:1272` (mint slot count), `:2679` (owner-door pool count) | tracked per business | **Active only** | no | — | — |
| 12 | `utilities/archiveCitizenExits.js:120` | exit defect text `employerBlankWithRole` (RoleType set, key blank); exits are deceased / traded only (`:53`) | none | no — they have not exited | the note appears for a retiree who later exits | — |
| 13 | `lib/employmentRoster.js:19-30` | derived roster rows | **Active only** (`:25`), `/^BIZ-/` | no — 0 of 35 on BEATS roster | no row | no row |
| 14 | `lib/wakePerception.js:624,656` → `lib/nextChapter.js` `resolveEmployer` | carries id on wake pool rows for the next-chapter fold | none | dead consumer: `scripts/citizen-wake.js:527` `const parsedMove = null`, so `fileNextChapter` (`:280`) is never called | — | — |

Not readers (name matches): `updateCivicApprovalRatings.js:1630` (comment); `loadEventContentLedger.js:87` (comment); `phase03-population` employer depth uses Business_Ledger Employee_Count, not ledger rows (`commuteFlowEngine.js:134`); the owner draw reads Business_Ledger Key_Personnel by name, skips only deceased (`generationalWealthEngine.js:1117-1140`).

### 3B. Scripts and display (no Status test unless stated)

| site | does | reach |
|---|---|---|
| `scripts/buildCitizenCards.js:640,647-655` | card shows `Status: Retired` and `Employer: <name> (BIZ-…)`; the sentinel map lacks UNTRACKED (`:521-524`) so that prints raw | **yes**, all 22 cards say "Status: Retired" beside an employer line |
| `world-view/build.js:94` | person panel employer name | yes |
| `world-view/build.js:127-137` | business staff panel from the ledger: includes Retired rows, tagged with their Status | yes — BIZ-00048/103/104 list the retiree as their only staff |
| `scripts/cascadeAudit.js:254-277,302-303` | ledger-layer "unemployment" = blank-employer rows / all rows (Retired, students included) | counts them as employed today; blank would add up to 22 |
| `scripts/buildJaxSlice.js:213,247,454` | profile line `careerStage: retired; employerBiz: BIZ-…`; `sourceEligible` (`:220`) tests role words only | if a Retired POPID is in the pool: not traced |
| `scripts/canon-name-check.js:176,198`, `scripts/queryLedger.js:158` | print the raw id | yes (display) |
| `scripts/buildNiaSlice.js:109`, `scripts/cron-undocked-run.js:126` | UNDOCKED cast pilots only (draw is Active-only, `casinoLedgerEngine.js:483`) | no |
| `scripts/worldViewCheck.js:244` | check: person's employer name resolves through the key | n/a |
| `scripts/dumpBeatTabs.js:227` | feeds the roster derive | n/a |
| `scripts/linkCitizensToEmployers.js` | read-only since 2026-11-18 (`:13-17`); skips retired-titled roles (`:146`) | n/a |
| `scripts/exportFaithCanonC93.js`, `canon3_backfill_t9.js`, `canon3_followup_squatters.js`, `inventoryCitizenArchiveCandidates.js:46-80`, `undockedMissionBrief.js:9` | one-off / dry-run / comment | not traced past the hit lines |

---

## 4. Writers of EmployerBizId

| writer | file:line | when | Status gate |
|---|---|---|---|
| layoff clear `''` | `runCareerEngine.js:255` (`careerRecordLayoff_`, `:254`); callers `:380` custody dismissal, `:473` employer-success layoff, `:2210` headcount reconcile | a job lost; also writes `[Career-Layoff]`, `S.jobLosses` (debt note, `:262-266`) | reconcile and layoff: Active only (`:2184`, loop gate `:1463,:1477`); custody: Status must be `detained` or a health state (`:334-340`) and stage retired is skipped (`:353`) — a Retired row is out on all three |
| unemployed hire | `runCareerEngine.js:1965` | blank-employer Active ENGINE adult 18–64 with SkillTags, business with growth | Active |
| civic mover | `runCareerEngine.js:2041` | Active, employed, "climb" posture, business with a civic opening | Active |
| settlement | `educationCareerEngine.js:1302` | a new adult's first job, business with room | n/a (new adult) |
| mint | `processAdvancementIntake.js:1297,1307` (carried id wins if room `:1285`; else `pickMintEmployer_` — no employer when RoleType matches `retired|student|hall of famer|resident`, `:1933,:2067`) | citizen mint, age ≥ 18 (`:1265`) | n/a |
| existing-row door | `processAdvancementIntake.js:997-1003` | an Advancement_Intake row names a `BIZ-` on Business_Ledger, SELF_EMPLOYED or UNTRACKED; **blank cell keeps the value (`:997`); any other word refuses the whole queue (`:865-867`)** | **none** |
| queue-row carriers | `processAdvancementIntake.js:2216` (pool citizen's id onto the queue row), `:2789` (owner door), `lib/nextChapter.js:148` | write Advancement_Intake cells, not the ledger | — |
| hand / script ledger writes | GITSNAP: edits on Retired rows 08-17→08-22 and 09-26→10-12 (§2); `scripts/linkCitizensToEmployers.js` wrote until 2026-11-18 (`:13-17`) | whenever the builder approves ledger work | none |
| dashboard | no hit in `dashboard/` | — | — |

brainSearch rule hits (current law), both 2026-10-17: "Correcting a wrong link (a citizen whose own title already names the employer, mapped elsewhere) is a data fix, not a life change, and is fine"; "Engine hires solely from blank employer cells; manually assigning employers to existing citizens for staffing is disallowed".

---

## 5. What already holds a past employer or career history

Simulation_Ledger header (SNAP row 1): no column for a past employer, an employer end, or career history. Candidates that exist:

| where | what is there | for the 22 |
|---|---|---|
| `LifeHistory` (col O) | `[Career-Hired] Hired at <business name>` (`runCareerEngine.js:1997-2010`), `[Career-Layoff]` with the business in the text (`:2211`), `[CareerState] …\|employer=<name>\|…\|bizId=<id>` persisted lines (`:1651-1664`), `[Retirement]` milestones | 0 of 35 Retired rows carry any Career-Hired, Career-Layoff or CareerState line (SNAP); 31 of 1042 Active rows carry a CareerState line; 3 Retired rows carry `[Retirement]` |
| `CitizenBio` (col AT) | `Now:` line, engine-owned; writer `sportsBioNow_` (`applyGameNightMoments.js:272`) **replaces** one sentence; row engine.336 (`ROLLOUT_PLAN.md:116`, status `ready`) changes it to stack job-change / promotion lines (builder 2026-11-07, plan `2026-11-05-feed-triggers-to-life-history.md` §ruling: "…job changes … so their history isn't buried … the life altering moments stack atop") | blank on 20 of 22 |
| `RoleType` | `Former …` / `Retired …` convention (`sportsRetire_` `:320`) | 9 of 22 titles name it; 13 still hold the plain job |
| `EconomicProfileKey` | `Retired` on POP-00124/125/126/128; job-named keys on the rest (SNAP) | present as profile, not employer |
| `LifeHistory_Log` tab | Career-* and Retirement tags | BEATS window is C116–C117 only; the full tab was not read |
| `Employment_Roster` | columns BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer (`lib/employmentRoster.js:15`) — no dates. Sheet tab is a frozen 2026-03-01 copy, unread (`docs/engine/SHEETS_MANIFEST.md:28`); derived roster has no past rows by construction | none |
| `Citizen_Archive` | full ledger row copy at exit; exit reasons deceased / traded only (`archiveCitizenExits.js:53`) | Retired rows do not exit |

---

## 6. Options (neutral; they are not exclusive)

**(a) Clear the key at retirement and record the former employer somewhere that exists**

| item | detail |
|---|---|
| hook point | none exists: no engine path sets Status Retired (§2). A clear needs a new step visiting Status-Retired rows. `runCareerEngine.js` skips Retired rows before any step (`:1463,1477`); `applyCustodyDismissals_` (`:272`) shows a step that runs before that loop. `sportsRetire_` is the one retirement writer, and ruling C4 keeps the employer there. |
| where the employer goes | no column. LifeHistory line, CitizenBio `Now:` line (engine.336 stack, `ready`), or RoleType text. `careerRecordLayoff_` is not reusable as is: it writes `[Career-Layoff]`, `S.jobLosses` and a business-delta (`:254-266`), which would read retirement as a layoff. |
| files touched (candidate) | `phase05-citizens/runCareerEngine.js` or a sibling Phase-5 step; the shared `Now:` helper (`applyGameNightMoments.js:272`, engine.336); then every reader whose blank branch differs (§3A "if blank"): `commuteFlowEngine.js` (all 22 land on the diagonal), `cascadeAudit.js`, `archiveCitizenExits.js:120`, `buildCitizenCards.js` (no Employer line), `world-view/build.js:127-137` (staff panels of BIZ-00048/103/104 go empty) |
| the 22 today | stay as they are until an engine path writes them. Existing engine writers cannot: `careerRecordLayoff_` only runs on Active rows; the intake door cannot blank a cell (`:997`) and refuses a non-sentinel word (`:865-867`). So: a new engine step, or a builder-approved ledger write through `lib/sheets.js` (the engine rules file allows approved ledger work this way; CLAUDE.md rule 4 forbids hand edits "to make a build work"; precedent 2026-11-20 `adc469f71`, Kinder pay 0). Which applies is the builder's call. |
| effect on ex-player rows | POP-00128's id is his own business, POP-00129's is current work, rows 1–4's is the club kept by ruling C4 for Active sports retirees — none of those 6 is "a former employer" in the way rows 7–22 are |
| sandbox read | the 22 rows' key blank after one fire and a second fire changes nothing (idempotent); the former employer text present exactly once per row, none on Active rows; Status, Income, CareerStage unchanged; Active-with-BIZ count 626 → 626 and derived roster 626 → 626; Employee_Count on the 13 businesses unchanged; `S.commuteFlowStats` resolved +8 (the City-wide ones) and the 12 cross-hood rows moved to diagonals; `detectCareerMobility_` draws −21 per cycle (shared `ctx.rng` stream shifts downstream — compare against a baseline fire of the live code, not byte-for-byte; downstream consumers of that stream: not traced); 0 `[Career-Layoff]` lines and no `S.jobLosses` entry for the 22; 0 Engine_Errors |

**(b) Keep the field; make every reader filter on Status**

| item | detail |
|---|---|
| readers with no Retired test that the 22 reach | `commuteFlowEngine.js:159` (add retired to the skip list), `educationCareerEngine.js:608/625` (gate the hook and the draw), display: `buildCitizenCards.js:647`, `cascadeAudit.js:271`; `world-view/build.js:127-137` already labels the Status |
| readers with no test that the 22 do not reach today | `applyGameNightMoments.js:593-596`, `compressLifeHistory.js:752` — only a Retired GAME-clock row at BIZ-00005/00074 would reach them |
| already filtered | §3A rows 2–5, 7, 8, 10–13 |
| the 22 today | untouched by design; no row write |
| one question inside the filter | which signal: Status Retired (35 rows) or CareerStage `retired` (106 rows = 35 + 71 Active). A Status filter leaves the 71 Active/stage-retired rows (38 with a BIZ id and pay) counted as workers everywhere |
| sandbox read | `S.commuteFlowStats` citizens −35, resolved −23, unresolved −12 (8 City-wide + 4 UNTRACKED), matrix and `commuteInbound` byte-compare for non-retired hoods; the stagnation draw count −21 and 0 hooks naming Retired rows over several fires; roster and every other filtered reader unchanged; no test today pins retired in `scripts/commuteFlowEngine.test.js` (no match) — add one |

**(c) What the code already half-does**

| exists | where | state |
|---|---|---|
| roster excludes Retired | `lib/employmentRoster.js:25`; commit `0c911e7f2` (2026-11-18): 21 dropped, 17 of them retired | done |
| mint gives a retired-titled role no employer | `processAdvancementIntake.js:1933,2067`; `linkCitizensToEmployers.js:146` | done for new rows with a "retired" title; a carried BIZ id still wins (`:1285`) |
| history goes to the bio, ledger holds the present | builder 2026-11-07 ruling; `sportsBioNow_`; engine.336 | one writer built (replace), stack + job-change writers `ready` |
| clear + a life line that names the business | `careerRecordLayoff_` callers (`:473`, `:2210` text names the business) | layoff only; Active only |
| a retired income profile | `EconomicProfileKey` `Retired` on four rows; `lib/economicLookup.js:137` `isRetiredRole` — engine callers: none (only `scripts/applyEconomicProfiles.js:174`) | unwired in the engine |
| employer kept at a sports retirement | ruling C4; `sportsRetire_` | by design; "until a next-chapter row says otherwise" |

---

## 7. Adjacent — noticed while tracing, not part of the map

- `phase04-events/generationalEventsEngine.js:643-651,1378-1397`: the `[Retirement]` die changes no cell; six Active rows carry one — POP-00001 by the sports path, and POP-00177, 00470, 00510, 00705, 00755 by this die; of those five, 4 still hold a BIZ id and pay > 0 (SNAP).
- `phase05-citizens/processAdvancementIntake.js:1248,1265-1307`: a mint aged ≥ 65 gets CareerStage `retired` and, unless its RoleType says "retired", still takes a tracked employer.
- 71 Active rows carry CareerStage `retired` (38 hold a BIZ id with pay; SNAP). `generationalWealthEngine.js:615-616` comment says Status or CareerStage retired both count; the code tests Status (`:625,632,792,1025`).
- `scripts/buildCitizenCards.js:521-524`: UNTRACKED (74 rows) has no readable label; prints `Employer: UNTRACKED`.
- `docs/SIMULATION_LEDGER.md:278`: lists `buildDeskPackets` as the only reader and `runCareerEngine.js:923/951/974`; omits the mint and `educationCareerEngine.js:1302` as writers. `:17` says 9 Retired (S250).
- `scripts/citizen-wake.js:527` `parsedMove = null` leaves `fileNextChapter` and `lib/nextChapter.js` unreachable while `lib/wakePerception.js:624,656` still carries the id on every pool row.
- POP-00288 Marcus Wright: Tier 2 Server, Income 38788 kept as a retiree by the Tier 1–2 exemption (`generationalWealthEngine.js:625`), UNI no.
- `scripts/cleanupSimulationLedger.js:290-301` maps `deceased` → Retired.

---

## 8. Not traced

- Who flipped Status to Retired on 40 rows between the 08-12 and 08-17 captures, and who edited the key on Retired rows (§2): no code writer found (git grep at `04b11e223`, un-windowed `git log -S` over phase04/phase05/utilities/scripts/lib); sheet history is not in the repo. Commits between the captures other than those searched: not read one by one.
- The live `Event_Content_Ledger` tab (only MARCH and `DEPLOY_HISTORY.md:458`); the live `Employment_Roster` sheet tab (MARCH shows its 2026-11-16 state).
- Whether the four stagnation hooks in the deck named those rows while Retired; what the desks did with them.
- Downstream use of `buildJaxSlice` profile lines; `scripts/exportFaithCanonC93.js`, `canon3_*`, `inventoryCitizenArchiveCandidates.js` beyond their hit lines; `lib/discordLookups.js` / the `lookup_citizen` tool's display of the key (only `queryLedger.js:158` read).
- What else reads the shared `ctx.rng` stream after `detectCareerMobility_`.
- Existing test coverage of `detectCareerMobility_` and of retired rows in the commute matrix (the commute test file has no "retired").
- The 44 → 40 Retired step (11-01 → 11-12) beyond the three MUBA rows.
