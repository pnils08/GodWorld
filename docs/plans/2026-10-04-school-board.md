---
title: Oakland Unified School Board Plan
created: 2026-10-04
updated: 2026-10-04
type: plan
tags: [civic, engine, in-progress]
sources:
  - docs/engine/ROLLOUT_PLAN.md civic.43
  - docs/reference/overnight_autonomy_session.md §6 (01:21 rb line, answered 02:22)
  - docs/SIM_DOCTRINE.md §5 (adding citizens is adding engines), §15 (no inert thresholds)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (civic.43)"
  - "[[2026-09-21-care-and-justice-system]] — the queued superintendent and command rows (Task 10 handoff)"
---

# Oakland Unified School Board

**Tier A. One sentence:** seven elected citywide board seats on `Civic_Office_Ledger`, driven by the engines that already run elected offices, owning the education initiatives that move the schools numbers the engine already tracks. No hospital board.

## 0. The ruling, verbatim

Builder, 2026-10-04 02:18, on the §6 question (board seats for Oakland Unified and the hospital): *"If it aligns with how the sim works and adds value we could add them"*. On the recommended shape below, 02:22: *"Ok illl take you're recommendations"*.

The recommendation he took (rb, 02:20): seven elected citywide seats split across election groups A and B; the approval engine widened so the board is driven between elections; the board owns the education initiatives; holders authored from existing tracked citizens, not mints. **Hospital board: no** — appointed rows are inert in every engine; the hospital keeps its project director and its business dynamics.

## 1. Measured state (read 2026-10-04 02:15, beats dump C109 + code)

- `Civic_Office_Ledger`: 39 real rows — `elected/A` 5, `elected/B` 7, `appointed` 26, `commission` 1. Mayor, DA, PD, nine council seats, staff and chiefs. Columns: `OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, TermYears, ElectionGroup, Status, LastElection, NextElection, Notes, VotingPower, Faction, ExecutiveActions, Approval, HighApprovalStreak, AutoScandalUntilCycle, AutoScandalSource`.
- **Elections** (`phase05-citizens/runCivicElectionsv1.js`): every row with `Type === 'elected'` in the active group runs (`:137-144`); challengers from Tier 2-3 civic-adjacent citizens, district seats prefer local candidates, `citywide` seats draw from the whole pool (`:252-289`). A citywide board seat goes through the same path as the mayor's row.
- **Approval / scandal / challenger / leaving office** (`phase05-citizens/updateCivicApprovalRatings.js:550`): `if (!officeId.match(/^COUNCIL/) && !officeId.match(/^MAYOR/)) continue;` — only council and mayor. A board row would get an election and then sit still. **This is the gap Task 1 closes.** Approval ripples into the seat's district hoods via `getDistrictHoods_` (`:957-970`); a citywide seat ripples wherever that helper sends the mayor.
- **Initiatives** (`phase05-citizens/civicInitiativeEngine.js`): nine-seat council faction math, mayor vetoes, `PolicyDomain` column already on the tracker (`:188`, v1.6). No second voting body exists.
- **The schools numbers the engine tracks:** `Neighborhood_Demographics.SchoolQualityIndex` and `GraduationRate` (per hood, C109 e.g. 7.9 / 90.74); engine.192 school drift (step, pull, grad lag, initiative funding %, `godWorldEngine2.js:457`); minors' `SchoolQuality` stamped from the hood index (`educationCareerEngine.js:671-690`). An education initiative therefore has a real repair target — the board is not a job invented to give rows something to do.
- Oakland Unified (`BIZ-00016`) holds 18 tracked school-role citizens on the roster (principals, teachers, psychologists, after-school directors, youth coaches, a counselor) and a superintendent + command queued for the C110 mint (care-and-justice plan, Task 10 handoff). The roster also carries alignment noise at that employer (a City Manager, line cooks, a mover) — not school staff, never holders.

## 2. Tasks

| # | Task | Owner | State |
|---|---|---|---|
| 1 | **Approval engine drives board seats.** Widen `updateCivicApprovalRatings.js:550` from `/^COUNCIL|^MAYOR/` to `/^COUNCIL|^MAYOR|^BOARD-OUSD/` — by ID prefix, not by `Type`, so DA-01 / PD-01 (Clarissa Dane, the Public Defender — existing characters with their own agents) do not start taking scandal and challenger rolls. Confirm `getDistrictHoods_` returns the city for `citywide` the way it does for MAYOR-01. Confirm the election path seats a `citywide` challenger into a `BOARD-OUSD-*` row with the same term/approval reset as a council seat. Bench: one fire on SANDBOX with seven synthetic BOARD rows (holders = any seven bench citizens), assert approval rows move, zero new Engine_Errors. No PROD write in this task. | engine-sheet | built, benching |
| 2 | **Author the seven holders and write the rows** — AFTER the C110 smoke (the Sunday civic chain reads the office ledger; no live write mid-smoke). OfficeIds `BOARD-OUSD-1`…`-7`, `Title` "School Board Member", `Type` elected, `District` citywide, `ElectionGroup` A for 1-4, B for 5-7, `TermYears` 4, `Approval` 65, `Faction` blank, `VotingPower` 1. Holders resolved by NAME against the ledger (`node scripts/queryLedger.js`, never the beats dump, never an agent-supplied POPID): Tier 2-3, Status Active, not GAME/MEDIA clock, not an office holder, **not an Oakland Unified employee** (the board governs the district; its staff do not sit on it), not Tier-1 protected. Prefer parents of tracked minors (household has a `SchoolQuality`-stamped child) and civic-adjacent citizens, spread across hoods. Write via the existing office-ledger writer path, one batch, read-back. Notes column: `civic.43 seated 2026-10-04`. **Shortlist pre-selected 2026-10-04 03:20 from the live ledger by these rules (138 eligible; 5 with tracked minors, 29 civic-adjacent; one per hood), re-resolved by name at write time:** Rosa Ochoa POP-00706 (Laurel, library worker, parent), Rafael Pilgrim POP-00644 (Fruitvale, server, parent), Merkin Jumper POP-00688 (Downtown, social-services caseworker, parent, T2), Jessica Brooks POP-00709 (Jack London, herbalist, parent), Soriya Rodriguez POP-00441 (West Oakland, reentry counselor), Yusuf Carmichael POP-00469 (Rockridge, pediatric nurse practitioner), Yael Bauer POP-00760 (Piedmont Ave, senior pastor, T2). Alternates: Markenie Tian POP-00707 (Lake Merritt, parent), Idris Karim POP-00761 (Temescal, pastor), Mart Johns POP-00648 (Adams Point, nurse aide). Maria Conteras POP-01047 (East Oakland, high-school teacher, not on the OUSD roster) left off: a teacher on the board reads wrong even off-payroll. | research-build | blocked on C110 smoke |
| 3 | **Education initiatives resolve by the board.** An initiative with `PolicyDomain` = `education` is voted by the seven BOARD-OUSD rows instead of the council: no factions, each member votes like an unnamed IND (probability clamped 0.15-0.85, swing modified by the initiative's affected neighbourhoods exactly as today's IND path), 4 of 7 passes, mayor veto does not apply, council override does not apply. All other domains unchanged. Notes record seven named votes the way council votes are recorded. Bench with one synthetic education initiative; assert the board's votes and the council's absence in Notes. **Built 2026-10-04 (engine-sheet):** `getBoardState_` (BOARD-OUSD-* rows in the council-state shape, every member an unnamed IND, no mayor), `resolveCouncilVote_` takes `voteOpts` (votesNeeded 4, body label), both vote branches and the renewal path route `education` to the board, the veto gate skips a board result, `votesThisCycle.body` names the body (media line reads "school board meeting"; the mayor's signing/fallout lines skip board votes). No board seated → DELAYED "No school board seated" — never the council. Proven on the real run loop in `scripts/civicApprovalState.test.js` T3.1–T3.11 (9 fail on the pre-cut file); suite 284/284. Bench waits on the new script project. | engine-sheet | built, unit-proven; bench waits |
| 4 | **Coverage.** Angela Reyes (schools and youth) and Carmen Delaine (civic) get one line each that the board exists and what `BOARD-OUSD-*` rows mean; the Sunday nine-seat table (civic.24) is unchanged. No new agent. | research-build | after Task 2 |

## 3. Proof / acceptance

- Task 1: bench fire with seven BOARD rows — approval values change, a scandal or challenger hook can fire for a board row, DA/PD rows untouched. Tests green.
- Task 2: `Civic_Office_Ledger` carries seven BOARD-OUSD rows with real POPIDs that resolve by name; `queryLedger.js` on each holder shows Active, Tier 2-3, no OUSD employer.
- Task 3: one education initiative on the bench resolves with seven board votes in Notes and no council vote.
- Live acceptance: the first election Cycle for the board's group seats or re-seats a member and the civic desk has a story it can follow.

## 4. Sim calls for the builder

None open after the 02:22 ruling. If Task 1's bench shows the citywide ripple lands nowhere (helper returns no hoods for `citywide`), the fix is in-scope: ripple to every hood at the mayor's weight.

## Changelog

- 2026-10-04 02:30 — plan written (rb, overnight). Rulings verbatim §0. Task 1 handed to engine-sheet.
- 2026-10-04 04:5x — Task 3 cut (engine-sheet): education initiatives (votes and renewals) resolve by the BOARD-OUSD rows, 4 of 7, no veto/override; no board seated → delayed, never the council. Real-run-loop tests T3.1–T3.11; suite 284/284. Bench waits.
- 2026-10-04 03:02 — Task 1 cut (engine-sheet): `updateCivicApprovalRatings.js` office filter → `/^(COUNCIL|MAYOR|BOARD-OUSD)/` by prefix; §4 case confirmed by code — `getDistrictHoods_` returns `[]` for `citywide` (no CITYWIDE key in the canon map), so the mayor's approval ripple landed nowhere; fixed in-scope: a citywide seat ripples to every canon hood at the district per-point weight (mayor and board alike). Elections need no change — `runCivicElectionsv1.js:140` filters by `Type === 'elected'` and `:261` sends a `citywide` seat to the whole pool. Tests: civicApprovalState F8–F11 (board moves, DA untouched, citywide ripple = every hood, district seat unchanged), 49/49; ceiling 103/103; suite 284/284. Bench next: seven synthetic BOARD rows, C120 on SANDBOX 0908.
