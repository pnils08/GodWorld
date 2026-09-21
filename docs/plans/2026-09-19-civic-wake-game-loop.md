---
title: Civic Wake Game Loop Plan — seat moves, three-stage initiatives, petitions, confrontation
created: 2026-09-19
updated: 2026-09-20
type: plan
tags: [civic, citizens, engine, cron, active]
sources:
  - docs/research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives.md — design record; §10 Mike rulings, §11 measured baseline (this plan's build contract)
  - Mike rulings 2026-09-19 (third pass, captured in the design record §10) — seats author; districts own hoods / mayor anywhere; petition from citizen wakes + condition data; Mara-style confrontation; 4–5 cycle losing clock; benefit on deploy; all six rows convert; three stages; no special news rule
  - output/agent_engine-wiring_2026-09-19T08-04-59.md — wiring card, phase05-citizens/civicInitiativeEngine.js
  - output/agent_engine-wiring_2026-09-19T08-05-44.md — wiring card, utilities/citizenDialMap.js
  - output/agent_engine-wiring_2026-09-16T17-17-23.md — wiring card, Reflection_Intake / citizenPage write path (civic.37)
pointers:
  - "[[../research/2026-09-20-codex-civic38-tasks1-3-adversarial-review]] — stronger HEAD review; eight findings for Kimi, Task 6.1 repair in 3274f309"
  - "[[../research/2026-09-20-codex-civic38-game-loop-review]] — Codex review, accepted 2026-09-20; all eight findings verified against the code and reconciled into the tasks below (§Reconciliation)"
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, row civic.38"
  - "[[../research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives]] — design record (rulings + measured gaps)"
  - "[[2026-09-16-work-wake-packs]] — civic.37, the wake chassis this plan's packs ride"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered 2026-09-19"
---

# Civic Wake Game Loop Plan

**Goal:** The Mon–Thu civic datawake stops being a speech generator and becomes a turn in a game: each elected seat chooses from a closed set of moves that persist through the existing Sunday gate to Initiative_Tracker, initiatives clear three work-gated stages (Funded → Standing → Delivering) on a 4–5-cycle losing clock, and citizen complaints become petitions and dial pressure the seats must answer.

**Architecture:** Scripts-side, the datawake gains a structured move set whose payloads land in an append-only move ledger with a stable id per move; a Sunday fold turns the week's pending moves into per-initiative tracker fields plus a candidate-row set and hands both to the existing mechanical gate + clerk verdict + `normalizeTrackerWrite`. The sheet writer stays the only writer; the decisions envelope is NOT the accumulator (one initiative + one flat `trackerUpdates` per file, rewritten every Sunday by `assembleDecisions.js` — review F2). Engine-side (cuts proposed for engine-sheet, wiring cards attached), `civicInitiativeEngine.js` trades the `NextActionCycle` time gate for stage clearance observed off the tracker and off domain target metrics, a stall pays approval through the `failed` motion that already exists, and the complaint cost to the citizen is already paid by the reflection's AFFECT tag (Task 7 withdrawn — measured, §Reconciliation). A Mara-style confrontation step re-aims the Sunday directive at the elected seats, and the datawake rota splits: elected seats keep the political turn, project directors move to work-wake operational shifts.

**Terminal:** research-build / engine-sheet (scripts-side tasks implemented by kimi, house-guest lane; engine substrate cuts — Tasks 4–5 and engine.250 — land through engine-sheet)

**Pointers:**
- Design record + rulings: [[../research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives]] §1–§11
- Prior chassis: `scripts/cron-work-wake.js`, `scripts/work-wake-packages.json` (civic.37, live C107)
- Measured baseline: design record §11 (12 wakes/week over 18 seats; no sheet write; `Civic` maps to `{}`)
- Wiring cards: `output/agent_engine-wiring_2026-09-19T08-04-59.md` (civicInitiativeEngine), `output/agent_engine-wiring_2026-09-19T08-05-44.md` (citizenDialMap), `output/agent_engine-wiring_2026-09-16T17-17-23.md` (Reflection_Intake write path)

**Verified facts this plan is built on (2026-09-19, two read-only exploration passes + wiring cards):**
- Datawake output today: per-seat JSON + Supermemory position wall (`scripts/officeWall.js:110`) + civic desk lane (`scripts/cron-desk-run.js:1225-1255`). `cron-civic-run.js` never requires `lib/sheets` — no sheet write in the datawake stage.
- The Sunday gate already exists and is the only write path to Initiative_Tracker: `runClose` invokes `applyTrackerUpdates.js` — dry-run always, `--apply` only after the mechanical gate + clerk verdict pass (`cron-civic-run.js:1747,1763-1769`). It reads `output/city-civic-database/initiatives/<agent>/decisions_c{XX}.json` and writes only `WRITEBACK_FIELDS` (`applyTrackerUpdates.js:109-115`) through `normalizeTrackerWrite` (`:134-223`; phase `how:'none'` never reaches the sheet, forward-only NextActionCycle, 200-char notes).
- `createInitiative_` (`phase05-citizens/civicInitiativeEngine.js:2735`) has no runtime caller; `scripts/createInitiative.js` is a pure Node mirror that builds a row and writes nothing.
- Time gate to remove: v1.9 trigger reschedules `visioning-complete` + `vote-ready` rows by `NextActionCycle` (`civicInitiativeEngine.js:254-267`); votes fire on `VoteCycle === cycle` (`:301-308`); ENGINE-CLOCK hold grace 3 (`:219-224`, `:2890-2954`).
- Approval: `classifyInitiativeMotion_` pays `advanced` +2 / `completed` +3 once each (`updateCivicApprovalRatings.js:1037-1097`); **sitting is free since engine.213 (S455) — `MOTION_LADDERS_.sitting = []` (`:1072-1076`)** — only silence drains (−3 owned/−2 nearby, `:597-606`). Challenger <40 (`:1124-1128`), chair lost <20 (`:1117-1122`). District-vs-city-middle scoring exists (`:628-660`).
- Benefits: `applyInitiativeImplementationEffects.js` — PHASE_INTENSITY `:179`, DOMAIN_EFFECTS `:207`; health (`:448-482`, hood `Sick`) and transit (`:484-490`, Transit_Metrics) reach real world-state. **Corrected 2026-09-20:** per-hood `S.initiativeNeighborhoodEffects` HAS a consumer — `applyCityDynamics.js:1290-1321` folds six keys into Neighborhood_Map (Sentiment, RetailVitality, NightlifeProfile, NoiseIndex, EventAttractiveness, DemographicMarker); the `:515-517` comment is stale. The same function then empties the bus (`:1536`) before its two later readers run — school drift (`updateNeighborhoodDemographics.js:656,680`) and business drift (`applyBusinessDynamics.js:401,465`) read `{}` every cycle. Filed engine.250; wiring card `output/agent_engine-wiring_2026-09-20T19-28-00.md`. HEALTH_DELIVERING_PHASES `:167-175` ("a building site treats nobody", `:480-481`).
- `utilities/citizenDialMap.js:48` — `'Civic': {}` (verified). Entry shape: `{ <dialName>: <signed int> }`, ordinary scale ±1–2. Consumed by `nudgesForReflection_` (`:316`) ← `compressLifeHistory_` (Phase 9, `phase01-config/godWorldEngine2.js:543`) → accreted at ×0.225 (`utilities/compressLifeHistory.js:126-127`). The gated read filters on `applied` only — daypart is never read (`:289-299`).
- Petition condition data: Household_Ledger carries `MonthlyRent` + `HouseholdIncome` per household (rent burden derivable — prefer MonthlyRent, `HousingCost` seen 0 on rented units); Hospital_Ledger is per-citizen illness with POPID (current care board only); **no per-citizen crime-victim data exists anywhere** — Crime_Metrics is per-hood aggregate. Neighborhood_Demographics has per-hood `Sick` counts.
- Mara directive: `runDirective` (`cron-civic-run.js:883`, blocks written `:1039-1052`), first Sunday chain stage; addressee pool = office-map rows with `agentDir` non-null (`:936-943`) — includes project directors; content driven by world summary + engine audit + tracker snapshot (`:890-1006`).
- Rota: 39 map rows (35 offices + 4 projects); 18 wake agents (mayor, DA, 9 council, Okoro, Baylight, police chief, 4 project directors); datawake exits clean Sun/Fri/Sat (`cron-civic-run.js:2077-2080`). Police chief stays datawake-only (standing builder ruling, civic.37).
- **The live pack builder is `buildPack` (`scripts/buildCivicOfficeSlice.js:724`, OFFICE/1), called at `cron-civic-run.js:2101,2118`. `domainSlice` (`:1861`) has no caller.**
- The grounding gate validates only `action` + `numberMoved`, never `statement` (`cron-civic-run.js:2161-2162`); identity numbers are allowed (`:2018-2024`).

**Reconciliation — 2026-09-20 (engine-sheet, builder-direct; review [[../research/2026-09-20-codex-civic38-game-loop-review]] F1–F8, each re-verified against the file):**

| Finding | Verified at | Landed in |
|---|---|---|
| F1 pack path | `cron-civic-run.js:54,2101,2118`; `buildCivicOfficeSlice.js:724` | Task 3 retargeted |
| F2 envelope is not an accumulator | `applyTrackerUpdates.js:237-265` (one initiative, flat updates, empty → skipped), `:437-441` previous-cycle fallback; `assembleDecisions.js:372-390` rewrites each file; `cron-civic-run.js:1720-1741` | Task 2 rebuilt: move ledger + Sunday fold |
| F3 candidates unseen by the gates | no `candidateRows` reader anywhere in the civic chain | Task 2 step 4 |
| F4 a `proposed` row never votes | `createInitiative.js:130`; `civicInitiativeEngine.js:308`; `Status` absent from WRITEBACK_FIELDS `:109-115` | Task 2 step 5: one forward-only Status transition |
| F5 owner = faction, not sponsor | `updateCivicApprovalRatings.js:592-595`; reader `:435-444` never reads Proposer | Task 5 step 1 |
| F6 monthly ÷ annual | engine uses `rent * 12 / annualIncome` (`migrationTrackingEngine.js:257`) | Task 6 formula |
| F7 stale no-consumer claim | see Verified facts | Task 4 step 5 + engine.250 |
| F8 Civic ≠ complaint | `reflectionClassifier.js:37`; measured below | Task 7 withdrawn |

**Measured 2026-09-20 (facts the tasks now stand on):**
- **Complaints already cost the citizen.** A reflection carries an EVENT tag and an AFFECT tag; in the reflection path the affect tag is the only composure authority and the event tag's composure is stripped (`citizenDialMap.js:316-326`). Live Reflection_Intake: 70 Civic-tagged rows (C100–C107); 51 carry a negative affect (Frustrated 30, Resentful 14, Anxious 4, Angry 2, Irritable 1) from 26 citizens, all 51 marked `Applied = yes` by the engine's dial drain (`compressLifeHistory.js:581-590`), each having paid composure −3/−4 (Angry/Resentful also warmth −2) through the Phase-9 gated read. The other 19 are constructive or are officials' own work notes (the DA, the police chief). **A complaint = Tag `Civic` + negative Affect.** The ruled loop exists; what is missing is the seat seeing it and the citizen seeing relief.
- **Turns inside the clock.** 47 wakes over C103–C107; a cycle is about a week; each elected seat woke in 2–3 of 5 cycles. On today's 18-seat rota a 5-cycle clock is ~2.5 turns. On the 11-seat rota at the landed rate (8–11 wakes a cycle, provider failures included) it is ~3.6–5 turns. The clock default stays 5; it is per stage, never total lifetime.
- **The board on day one.** All six rows are the mayor's (`Proposer` = Avery Santana, LeadFaction OPP). By hood overlap: D1 → INIT-001/002/007, D2 → 006, D3 → 002/003/007, D5 → 002/007, D7 → 005; **D4, D6, D8, D9 touch nothing** (child-area folding cannot change this: neither the district lists nor the six rows name a child area). A sponsor-only board gives the mayor six rows on one turn and nine seats an empty board.
- **Which domains a deploy actually moves** (writer → consumer → persisted column): health → hood `Sick`; transit → Transit_Metrics; education → school quality, dead until engine.250; every domain → Neighborhood_Map texture via the fold; business drift in the hood, dead until engine.250. **No path from a safety initiative to a Crime_Metrics column and none from housing to rent or rent burden** (`updateCrimeMetrics.js` reads no initiative state; no MonthlyRent writer reads one). Housing is the largest measured unmet condition — 106 of 392 rented households above 0.30 annualized burden — and has no lever and no row on the board.

**Mechanism decisions (engine-sheet's call, binding on the tasks):**
1. Moves get their own append-only ledger; the decisions envelope is left alone.
2. Machine state lives in columns, never in MilestoneNotes (stripped to the primary voice at `cron-civic-run.js:1734`, cut to 200 chars at `applyTrackerUpdates.js:173`).
3. Petition-pending needs no marker: a row with `Status = proposed` and a blank `VoteCycle` IS petition-pending.
4. The engine stays the only voter. The gate gains exactly one Status transition, `proposed → pending-vote`, legal only in the same write that stamps `VoteCycle`.
5. The seat never picks its own success metric. `propose` names an intervention from a closed catalog; the catalog fixes the domain, the effect channel and the stage-3 metric.
6. A domain with no deploy path to its metric is not proposable and its Delivering gate is not built (SIM_DOCTRINE §15). Building that path is the engine row that makes the domain playable.
7. Work never resets the clock. Only a stage change does. Work clears Funded→Standing and revives a stalled row once per stall; a revival pays no `advanced` credit.

**Defaults the builder may overrule (sim calls; building proceeds on these):** one consequential move per wake plus free speech · board = rows the seat sponsors + rows touching its hoods (mayor: all) · police chief may `work`, `answer`, `canvass`, never `propose` · stall cost = the existing `failed` motion, owners −2 each cycle the row stays stalled, opponents +1 (already in code) · hardship band 0.30 annualized rent burden · clock 5 cycles per stage.

**Acceptance criteria:**
1. `node scripts/cron-civic-run.js --stage=datawake --dry-run` (or the smallest equivalent harness) shows a seat choosing from the closed move set with its board + petition pool in the pack, and the grounding gate rejecting a move that names an initiative or hood not on that seat's slice.
2. A week of synthetic moves accreted into the decisions channel appears in `applyTrackerUpdates.js` dry-run output, passes `normalizeTrackerWrite` unchanged, and a `propose` move produces a well-formed candidate row via `scripts/createInitiative.js` — no new sheet-write path, no live `--apply` without builder approval.
3. On the sandbox bench (groundhog loop, `docs/reference/DEPLOY.md` §Groundhog): a converted initiative clears Funded→Standing only when a `work` move has landed on its row; a stage left untouched for N cycles (default 5) flips to `stalled` and its owners take the existing `failed` delta each cycle it stays there; Delivering clears when the domain target metric moves the right way from the vote-time baseline.
4. `node scripts/civicPetitions.js --dry-run` counts condition-matched signatures for a sample proposal from live local beats files (housing from Household_Ledger, health from Hospital_Ledger + Neighborhood_Demographics) with no LLM in the count, and a Civic-tagged reflection sample raises visibility without counting as signatures.
5. Withdrawn with Task 7 — no dial cut. Standing check instead: every `Civic` + negative-Affect row on Reflection_Intake reads `Applied = yes` after the cycle that drained it (2026-09-20: 51 of 51).
6. **The paired proof (review §7):** on the bench, same starting state and same engine randomness, two runs differing only in one seat's move — `work` on a Funded row vs `canvass` — end with a different persisted tracker row, and the next pack shows the seat that difference and the row it passed up. Without this the build is a vocabulary, not a game.
7. A valid move survives weekday persist, Sunday fold, normalization and a chain re-run exactly once; a candidate-only week is seen by the validator, the clerk and the gate digest; invalid moves are rejected one by one and the statement survives; repeated `work` with no stage change neither advances a stage nor renews its clock; a stall drains its owners each cycle it is held and a revival, first or repeated, pays nothing.
8. `node scripts/cron-civic-game.test.js` passes — move validation, grounding, accretion, pack builders, petition counter, stage-transition fixtures (synthetic, visibly non-canon, no network).

---

## Tasks

### Task 1: Closed move set in the datawake

- **Status:** scripts implemented; adversarial code repairs locally committed through `942ba8e6`, no production activation claimed. Agy follow-up fixtures remain requested.
- **Files:**
  - `scripts/cron-civic-run.js` — modify (datawake section, ~`:1861-2180`)
- **Steps:**
  1. Replace the free-text `action` field in the datawake JSON schema (`:1968`) with a closed `moves` array. **At most one consequential move per wake** (the scarce resource, ruling 5); speech is free and unlimited. A second move in the same wake is rejected on its own line; the first valid one stands. Move types: `propose` `{title, intervention, hoods[], problem}` — `intervention` is a key from the closed catalog in `lib/initiativePhaseContract.js` (Task 4 step 0), which fixes the policy domain and the stage-3 metric; the seat never names its own metric —, `work` `{initiativeId}`, `answer` `{confrontationId?, text}`, `canvass` `{hood, note}`. `statement` stays free text and ungrounded (standing behavior, `:2161-2162`). Unknown move types are rejected loudly and logged; the wake still records the seat's statement.
  2. Extend the grounding gate: `work.initiativeId` must be on the seat's board block (Task 3); **every** hood in `propose.hoods` must sit inside the seat's district after child areas fold to parents (an intersect test would let one local hood carry in unauthorized ones) — the mayor may name any hood (ruling 2); `canvass.hood` same rule; `propose.intervention` must be a catalog key whose domain is marked playable; the police chief may `work`, `answer`, `canvass` and never `propose` (not an elected seat). Rejected moves are dropped with a `[datawake] MOVE REJECTED <seat> <reason>` line; valid moves in the same wake survive (seat-drop discipline, never fatal to the run).
  3. Persist the accepted move into the per-seat datawake JSON (`:2177-2188`) alongside the existing fields, and append it to the move ledger (Task 2 step 1). A rejected move is appended too, with its reason, so the seat's next pack can show it.
- **Verify:** fixture seat + fixture slice in the Task 9 test: valid move accepted, off-board initiative rejected, out-of-district hood rejected for a council seat, allowed for the mayor.

### Task 2: The write path — move ledger, Sunday fold, the gates see everything

Rebuilt 2026-09-20 (review F2/F3/F4). The decisions envelope cannot carry a week of moves: one initiative and one flat `trackerUpdates` per file (`applyTrackerUpdates.js:237-265`), every file rewritten each Sunday (`assembleDecisions.js:372-390`), notes stripped and cut. Moves get their own channel.

- **Files:**
  - `scripts/cron-civic-run.js` — modify (datawake persist; `runClose` fold, between the notes normalization `:1741` and the dry-run `:1743`)
  - `scripts/applyTrackerUpdates.js` — modify (two new write fields, one Status transition, candidate append)
  - `scripts/validateTrackerUpdates.js` — modify (candidate validation, `:138`)
  - `scripts/cron-civic-gate.js` — modify (write-set digest covers candidates, `:299`)
  - `scripts/assembleDecisions.js`, `scripts/createInitiative.js` — read
- **Steps:**
  1. **Move ledger.** `output/cron-civic/moves/moves_c{XX}.jsonl`, append-only, one JSON line per event. A move line: `{moveId, cycle, date, agentDir, popid, type, payload, status}`. `moveId` = `MV-{cycle}-{agentDir}-{date}` — one consequential move per wake makes it unique, and a re-run of the same wake writes the same id. Status changes are new lines for the same id (`pending` → `applied` | `rejected` | `failed`, each with `at` and `detail`); a reader folds by id, last line wins. Nothing is ever edited in place.
  2. **Sunday fold** (new function in `runClose`, after `assembleDecisions.js --apply` and the notes normalization, before the dry-run). It takes only `pending` moves of the closing cycle. `work` moves: grouped by initiative, merged INTO that initiative's existing `decisions_c{XX}.json` as two fields — `trackerUpdates.LastWorkCycle` (the cycle) and `trackerUpdates.LastWorkSeat` (comma-joined agentDirs) — leaving the voice's own fields untouched; an initiative with no decisions file this cycle gets one holding only those two fields. `propose` moves: written to `output/city-civic-database/initiatives/_candidates/candidates_c{XX}.json`, keyed by moveId.
  3. **`applyTrackerUpdates.js`:** WRITEBACK_FIELDS gains `LastWorkCycle`, `LastWorkSeat` (columns arrive with Task 4's schema cut) and `Status` under a transition table with exactly one legal edge, `proposed → pending-vote`, refused unless the same write stamps `VoteCycle`. The previous-cycle fallback (`:437-441`) never applies to fold-produced fields or candidates — a one-time action must not replay. After `--apply`, each move's outcome is appended to the ledger (`applied` / `failed` + reason).
  4. **Candidates reach the real gates.** Each candidate is built into a full row by `scripts/createInitiative.js` (`Status = proposed`, blank `VoteCycle`, opening phase per `lib/initiativePhaseContract.js:45-59`), then validated in `validateTrackerUpdates.js` (catalog intervention, canonical hoods, seat authority), listed in the clerk's input (`cron-civic-run.js:1694`) and included in the gate's write-set digest. Retry identity: a candidate whose `ProposingOffice` + `ProposedCycle` + normalized `Name` already exists on the tracker is skipped, so a re-run appends nothing. Dry-run prints the would-be rows; append only in `--apply` after the same clerk verdict. **This extends the live Sunday write path — dry-run default preserved, builder flips.**
  5. **Petition → vote.** A row with `Status = proposed` and blank `VoteCycle` is petition-pending by definition (no MilestoneNotes marker — notes are not machine state). When the signature counter clears it (Task 6.3), one gated write stamps `VoteCycle` = next cycle, `ImplementationPhase = vote-scheduled` and `Status = pending-vote`. The engine's ordinary trigger (`civicInitiativeEngine.js:308`, `VoteCycle === cycle` and status `pending-vote`) then votes it. The seat never schedules its own vote.
- **Verify:** synthetic week → ledger lines; fold twice → identical decisions + candidates files; dry-run shows the two work fields and the candidate row; a second chain run appends no duplicate; a `Status` write without `VoteCycle` throws; a bad-catalog candidate is refused with a loud line; `--apply` untouched in tests.

### Task 3: Seat pack upgrade — board, petition pool, working city, confrontation

- **Status:** scripts repaired through `33a8f6b8`; shared Task 4 requirement helper and the design decisions below remain open. Local evidence and commit table: [[../research/2026-09-20-codex-civic38-tasks1-3-adversarial-review]] §Implementation follow-up.
- **Files:**
  - `scripts/buildCivicOfficeSlice.js` — modify (`buildPack`, `:724` — the live OFFICE/1 pack; `domainSlice` in `cron-civic-run.js` is dead code, review F1). The pack already carries approval, selected constituents, hood facts, peers and initiative facts (`:777`, `:443`); these blocks extend it.
- **Steps:**
  0. **My last move:** folded from the move ledger (Task 2 step 1) — awaiting Sunday, rejected + reason, applied, or failed — plus any problem the seat passed over that is still there. Mechanical continuity comes from the ledger; the position wall is context, never proof.
  1. **My board:** rows the seat sponsors (`ProposingOffice`) plus rows touching its hoods — the mayor sees all (day-one overlap is in §Reconciliation; a sponsor-only board leaves nine seats empty) — off the beats `Initiative_Tracker.jsonl` dump, already optional-tab 22, with current phase/stage, cycles-since-last-stage-change, and what each needs next (stage rules from Task 4 — text built from a shared helper so the pack and the engine never drift on what clears a stage).
  2. **My district's petition pool:** complaints = reflections with Tag `Civic` AND a negative Affect (Frustrated, Irritable, Anxious, Angry, Resentful) from citizens living in the seat's hoods (beats `Reflection_Intake.jsonl` — added to the dump in Task 6); Civic rows with any other affect are shown apart as participation; rows written by office holders (POPID on the civic office map) are dropped. This is the "people are talking" signal, plus the condition counts from the petition counter (Task 6) for problems matching live proposals.
  3. **The working city:** latest work-wake reflections from chiefs/directors (Supermemory page readback via the civic.37 `loadOwnPageReadback` discipline — read-only).
  4. **Confrontation block:** when the Sunday directive named this seat (parse the latest `output/mara-directives/mara_directive_c{N}_AUTO.txt`), the pack carries the demand verbatim and an `answer` move is expected.
  5. Cap each block (~600 chars, same discipline as civic.37 node builders); missing inputs degrade to a stated absence, never a fabricated board.
- **Verify:** fixture-based test per block; dry-run on live local data shows a real seat's board matching the live tracker rows.

### Task 4 (ENGINE CUT — engine-sheet lands): three stages, no time gate, losing clock

- **Files:**
  - `phase05-citizens/civicInitiativeEngine.js` — modify (proposed; wiring card `output/agent_engine-wiring_2026-09-19T08-04-59.md`)
  - `lib/initiativePhaseContract.js` — modify (stage vocabulary)
- **Steps:**
  0. **Intervention catalog** in `lib/initiativePhaseContract.js` (shared by the scripts and the engine, so they cannot drift): key → `{policyDomain, effect channel, stage-3 metric (tab, column, direction), playable}`. `playable` is true only where a deploy path to the metric exists in code today: health → hood `Sick` down; transit → Transit_Metrics; education → school quality up (after engine.250). Economic, workforce and sports are playable against the business-drift channel after engine.250, metric hood `RetailVitality` up. **Safety and housing are not playable** — nothing carries a safety initiative to Crime_Metrics or a housing one to rent burden; each becomes an engine row, and a seat cannot propose in the domain until it lands. A gate whose input the initiative cannot move is a trick (SIM_DOCTRINE §15).
  1. Stage model on the row: `Funded` (clears on the vote passing — existing machinery, `:301-308`, `:1051`), `Standing` (clears when `LastWorkCycle` > `LastStageChangeCycle` — a `work` move landed through the Sunday gate after the row became Funded; the engine reads the column, so the write IS the observation), `Delivering` (clears when the domain target metric has moved the right way from its vote-time baseline — baseline stamped on the row at VoteCycle). `Stage`, `StageBaseline`, `LastStageChangeCycle` (engine-written) and `LastWorkCycle`, `LastWorkSeat` (gate-written, Task 2) and `PriorPhase` (engine-written, step 3) persist on Initiative_Tracker (six new columns, SHEETS_MANIFEST + schema docs updated in the same cut).
  2. Remove the v1.9 `NextActionCycle` rescheduling trigger (`:254-267`) for converted rows — time stops being how you win. Keep the ENGINE-CLOCK hold only as the stall detector's input.
  3. Losing clock: a stage unchanged for N cycles (default 5, World_Config key `civicStageStallCycles` — Mike: "4–5 sounds like a good starting point") sets the row's `ImplementationPhase` to `stalled` (already in NEGATIVE_PHASES, contract `:62`, and already a failing phase for approval) and stamps the phase it left into a new `PriorPhase` column — Standing spans several phases (`dispatch-live`, `construction-active`, `disbursement-active`), so the stage alone cannot restore the phase. A landed `work` move revives `stalled` → `PriorPhase` (then clears the column) and resets the clock, once per stall. **Work never resets a running clock** — only a stage change does — so repeated work cannot stand in for the old `NextActionCycle` renewal. The clock is per stage, never total lifetime.
  4. All six live rows convert at cut time (ruling 6): each row gets stage + baseline stamped from its current phase (mapping table in the cut's test, per row and never inferred uniformly from a phase or a populated `VoteCycle` — INIT-003 shows Outcome COMPLETED on a visioning row that never had a council passage, INIT-007 runs `operational` with Status `announced` and no vote: OARI `dispatch-live` → Standing with **no** stage-3 gate until the safety path exists; the Temescal health center `construction-active` → Standing; Stabilization Fund `disbursement-active` → Standing). Fruitvale transit hub (never voted) enters at petition/Funded-pending — see Open questions.
  5. **Stage ↔ phase mapping is explicit.** Effects (`applyInitiativeImplementationEffects.js` PHASE_INTENSITY) and approval both read `ImplementationPhase`, not `Stage`; adding a column changes neither. The cut states, per stage, which phases a row may hold, that relief starts at Standing (ruling 5: benefit on deploy), and that a stalled row's phase goes to `stalled` so PHASE_INTENSITY −0.5 applies and the service stops paying. engine.250 (the bus emptied before its phase-3 and phase-5 readers) lands first — without it education and the business channel cannot deliver.
- **Verify:** bench groundhog cycles on SANDBOX 0908: vote → Funded; no work move for N cycles → stalled + approval hit (Task 5); work move → Standing; metric moved → Delivering. Pull-back js byte-identical check per house deploy pattern.

### Task 5 (ENGINE CUT — engine-sheet lands): the stall cost is already built — attribute it and close the farm

Corrected 2026-09-20. No new motion. `isFailing_` (`updateCivicApprovalRatings.js:994-1001`) already counts `stalled`; `classifyInitiativeMotion_` returns `failed` for it (`:1048`) and `approvalDeltaForInitiative_` pays the owner −2 and an opposing faction +1 (`:1098-1100`) — every cycle the row stays stalled, because negatives are conditions (engine.139). The losing clock gets its teeth the moment Task 4 sets `ImplementationPhase = stalled`. Sitting being free (engine.213, `MOTION_LADDERS_.sitting = []`, `:1072-1076`) is what made the clock necessary; it is not a gap in this file.

- **Files:**
  - `phase05-citizens/updateCivicApprovalRatings.js` — modify
- **Steps:**
  1. **Sponsor read (review F5) — lands before the first seat-authored row exists.** The tracker reader (`:435-444`) pulls `Proposer` + `ProposingOffice`; `owns` (`:594`) becomes mayor OR sponsor OR lead faction. Today owner means faction only, so a seat's own bill is scored to its bloc and a sponsor outside the lead faction owns nothing.
  2. **Revival guard.** `moved` → `advanced` (+2) fires on any changed non-failing phase (`:1040,1052`), so `stalled` → prior stage pays +2 and a stall/revive loop farms approval. A row whose previous phase was failing classifies as `sitting` on the cycle it revives: getting back to where you were is not an advance.
  3. Existing drains unchanged: silence −3/−2, challenger <40, chair <20.
- **Verify:** bench, four cases: stall entry (−2 to owners), held stall (−2 again, a condition), revival (0), repeated revival (0). A sponsor outside the lead faction takes the owner delta on its own row.

### Task 6: Petition mechanics — signatures counted, reflections seen

- **Status (codex, 2026-09-20):** Counter + OPTIONAL beats entry landed in `7291d25e` and locally validated; Task 6.3 Sunday-prep integration remains with kimi. No live dump or external write run.
- **Files:**
  - `scripts/civicPetitions.js` — create (counter)
  - `scripts/civicPetitions.test.js` — isolated counter + mocked optional-dump validation (codex); Task 9's shared game test remains antigravity-owned
  - `scripts/dumpBeatTabs.js` — modify (add `Reflection_Intake` as an OPTIONAL beats tab)
  - `scripts/cron-civic-run.js` — modify (Sunday prep wires the counter into vote gating)
- **Steps:**
  1. Signature counter, deterministic, no LLM: given a proposal `{policyDomain, hoods[]}`, count — housing: Household_Ledger rows in those hoods with `MonthlyRent * 12 / HouseholdIncome` above the band — HouseholdIncome is annual; the engine's own formula (`migrationTrackingEngine.js:257`). The monthly-over-annual form counts 0 of 392 rented households, the annualized form 106. Zero or missing income is its own printed counter, never silently dropped. The band is two separate numbers: the hardship band that makes a household a signature, and the support band that sends a proposal to a vote (builder-set, proposed hardship 0.30; the tracked ledger is a sample, never the denominator — band scales against hood population from Neighborhood_Demographics); health: Hospital_Ledger rows in care, plus hood `Sick` reported beside it as a separate figure — never summed, the two overlap with no defined join; safety: hood-aggregate only (Crime_Metrics ViolentLevel above the city median — no per-citizen victim data exists; the output calls it a hood condition, never signatures); safety and housing counts are printed for visibility but gate nothing until the domain is playable (Task 4 step 0); education/transit/economic/sports: defer to per-domain rules as the stage-3 metrics land (Open questions). **All hood matching folds child areas to parents** (SIM_DOCTRINE §17: "a child area is its parent, in every count and every read") — scripts-side via `lib/canonNeighborhoods.js` + the sheet-sourced ChildAreas map (parent links live on the sheet, canonNeighborhoodLoader.js:146; never a hard-coded copy), so a Coliseum household counts for East Oakland.
  2. `Reflection_Intake` joins the beats dump as OPTIONAL (`dumpBeatTabs.js` BEAT_TABS, `scripts/dumpBeatTabs.js:44-61` shape) so seats and the counter read local files, never a fresh sheet read. Civic-tagged rows (`lib/reflectionClassifier.js:37` vocab) feed the pack's "people are talking" block — visibility, never signatures.
  3. Sunday prep: a proposal with `Status = proposed` and blank `VoteCycle` (that IS petition-pending; no marker) whose signature count clears its band gets its `VoteCycle` stamped through the same gated tracker write ( `applyTrackerUpdates.js` G-R3 path). Below band: stays proposed with a blank `VoteCycle`, public, and costs the seat nothing beyond the stall clock once Funded.
- **Verify:** Task 9 fixtures: burden ratio math, band scaling, safety aggregate path, reflections excluded from counts. Dry-run on live local beats prints a real count table.

#### Task 6 counter interface and local proof (codex, 2026-09-20)

`scripts/civicPetitions.js` exports `loadLocalData({root, cycle})`, `countPetition({policyDomain, hoods}, data, {hardshipBand, supportBand, sinceCycle})`, and `buildHoodResolver(rows)`. The loader uses only local files: beats `meta.json` and tab JSONL, matching-Cycle `engine_audit_cN.json` `snapshots.Neighborhood_Map` for ChildAreas, and a matching-Cycle `simulation_ledger_snapshot.jsonl` for reflection POPID-to-hood joins. It imports no env loader or network client and writes no files. A wrong Cycle, malformed JSONL, ambiguous child parent, conflicting household identity, or absent required condition table fails loudly. The sheet-sourced parent map is authoritative; missing names in the shared canon cache are reported rather than substituted with hardcoded geography.

- `counts` reports domain-specific observations. Housing uses active rented households, strict `MonthlyRent * 12 / HouseholdIncome > hardshipBand` (default 0.30), and separate zero, missing, invalid-income and invalid-rent counters. Owned and dissolved households are excluded. Repeated identical household rows do not inflate counts; conflicting same-ID rows fail.
- Health counts unique POPIDs in open care; DischargeCycle/Outcome must be blank and StatusNow one of the hospital writer's open states. `sickResidents` is reported separately and is never added to `inCareCitizens`. Data-quality warnings never veto valid observed support: `invalidConditionRows` covers target hoods only; `unlocatedConditionRows` reports unmappable rows across the input without assigning them to any district. Bad rows never contribute signatures. Housing identity checks also run after target-hood selection.
- Safety compares each requested parent hood against the median ViolentLevel over the complete mapped city. Results are hood conditions, never citizen signatures; missing city rows cannot silently change the comparison population.
- `population.value` is Students + Adults + Seniors from Neighborhood_Demographics, never the tracked household/citizen count. Missing population fields are explicit and cannot clear support. No untracked signatures are extrapolated from the sample.
- `support.band` is separate from hardship and defaults to null. When explicitly supplied, `requiredCount = ceil(population * supportBand)`; only health currently evaluates its observed unique-person count against that threshold. Housing and safety always return `support.cleared = false`, reason `domain-not-playable`; other deferred domains return `domain-rules-deferred`. The count does not write Status or schedule a vote. A supplied health band is a caller decision, not a new approved live threshold.
- `visibility` includes Civic reflections whether Applied is yes or no, but never adds them to support. Default window is the snapshot Cycle; callers can pass `sinceCycle` to include earlier Cycles. Missing/stale citizen geography leaves rows explicitly unlocated. Negative-Affect complaint flags read the existing `citizenDialMap.DIAL_MAP` composure signs rather than another copied affect table. Reflections are local perceptions at their current recorded citizen neighborhood, not a claim about historical residence.
- CLI: `node scripts/civicPetitions.js --dry-run` prints the housing/health/safety city table. Add `--domain health --hood Rockridge`, repeated `--hood` flags, `--hardship-band`, `--support-band`, `--since-cycle`, or `--json`. `--root` supports isolated local fixtures. There is no apply/write mode; unknown flags fail.

Validation: `node scripts/civicPetitions.test.js` passes 13 cases, including annualized math/boundaries, child folding, duplicate identity handling, separate income-quality counts, current-care deduplication, independent support bands/population, reflections excluded from signatures, missing input/freshness failures, deterministic non-mutation, disk/CLI read-only behavior, and both absent/present Reflection_Intake through the actual dump script under mocked fs/Sheets. `node --check` passes for all three changed scripts. A first red run established that the requested counter module was absent; no claim is made that an existing implementation had this test regression.

Local C108 dry run (not a new live read): housing 392 active rented households, 106 above 0.30; zero/missing/invalid income counters all 0 in that subset. Health 2 unique in-care citizens, Sick 1,929 reported separately. Safety median ViolentLevel 26.9 across 22 hoods, 7 strictly above it. No domain clears a gate by default. Reflection_Intake is not yet on local disk, reported as unavailable; the next authorized beats dump will materialize it. `--hood Coliseum` resolves to East Oakland; health `--hood Rockridge` reports 2 in-care citizens separately from Sick 108.

#### Task 6 verified wiring card — Reflection_Intake

Required engine-wiring run used `anthropic/claude-haiku-4.5`, target Reflection_Intake; its task-dependent pointers were checked against source. This attached card corrects two generated-report errors: all inspected appenders include Cycle at column C, and the engine DOES write Applied through an intent (the generated report incorrectly characterized all writes as external direct appends).

| Edge | Verified pointer |
|---|---|
| Sheet headers: Timestamp, POPID, Cycle, Daypart, Tag, ReflectionExcerpt, Applied, Affect; no Neighborhood | `schemas/SCHEMA_HEADERS.md:1133` |
| Positional A–K engine contract and column constants | `utilities/compressLifeHistory.js:125-133` |
| Wake / exchange / press / work writers append Cycle at C and Applied=no at G | `scripts/citizen-wake.js:418`; `scripts/citizen-exchange.js:192`; `scripts/citizenVoice.js:230`; `scripts/cron-work-wake.js:230` |
| Persona writer, same shape | `lib/personaProvider.js:200` |
| Engine read: excludes only Applied=yes; does not filter by daypart | `utilities/compressLifeHistory.js:289-299` |
| Phase 9 reader before Phase 10 intent execution in both entrypoints | `phase01-config/godWorldEngine2.js:543,595,2285,2330` |
| Applied=yes queued after reflection accretion | `utilities/compressLifeHistory.js:581-590` |
| New OPTIONAL local export; no changed Sheet writer | `scripts/dumpBeatTabs.js:66-76` |
| New disk consumer and visibility join | `scripts/civicPetitions.js` — `loadLocalData`, `visibility` |

#### Task 6 findings captured for routing (codex, 2026-09-20)

1. **Population field assumption:** Neighborhood_Demographics has no Population column (`schemas/SCHEMA_HEADERS.md:1012`). This counter uses the existing engine aggregation Students + Adults + Seniors (`updateNeighborhoodDemographics.js:340-348`), and never silently converts missing fields to zero.
2. **Geography assumption:** Reflection_Intake has no Neighborhood and the beats export has no Neighborhood_Map. `lib/canonNeighborhoods.js` caches membership only, not child-parent links. The counter closes its own read path through matching-Cycle local ledger/audit snapshots; it does not invent a second geography map or broaden the beats-tab change.
3. **Discharged patients described as care:** Hospital_Ledger retains historical rows. `scripts/cron-work-wake.js:96` uses `/active|hospitalized/` as its no-new-admissions fallback, admitting discharged StatusNow=active and missing recovering/critical/injured states. `scripts/buildHealthSlice.js:57` labels every eligible hospital row as "in hospital care" without checking discharge. C108 has a recovered/discharged row. Counter filtering is fixed locally; changes to those other scripts remain with their owners, not included in this task.
4. **Plan drift requiring reconciliation, not an inferred ruling:** Task 6.3 retains the old petition-pending/vote-scheduled shorthand; integration must use Mechanism decisions 3–4's actual Status=proposed plus blank VoteCycle, then proposed→pending-vote transition. Commit `9a9b02dc` describes housing 0.30 as both a rent-burden line and an unblocking signature band. The current builder dispatch explicitly keeps hardship/support separate and safety/housing non-gating. This counter follows that dispatch: 0.30 is hardship, support is unset unless supplied, housing/safety never clear. Kimi/research-build must reconcile the remaining live-gate wording and population/signature unit decision before integration enables a housing gate.

### Task 7: WITHDRAWN 2026-09-20 — the Civic dial entry is not cut

`'Civic': {}` stays. Measured (§Reconciliation): the reflection path strips the event tag's composure and lets the AFFECT tag alone set it (`citizenDialMap.js:316-326`), so the proposed `composure: -1` would never have landed; the `warmth: -1` would have hit all 70 Civic rows, including 19 constructive ones and officials' own work notes. Meanwhile 51 complaint rows from 26 citizens already pay composure −3/−4 through their affect tag, discounted ×0.225, cumulative when the mood repeats — ruling 3's loop, already running. No engine cut; engine.39 is not touched.

What is still missing is the other half: a citizen whose hood gets a Delivering initiative should meet it in a wake. That is a citizen-pack block on the civic.37 chassis — a named follow-up, not built here.

### Task 8: Confrontation step — re-aim the Sunday directive

- **Files:**
  - `scripts/cron-civic-run.js` — modify (`runDirective`, `:883-1052`)
- **Steps:**
  1. Retarget the addressee pool from project-director admin milestones to the 10 elected seats: demands driven by (a) hood data moving the wrong way in a seat's district, (b) petitions above the visibility line with no proposal filed, (c) stages inside one cycle of the stall clock. Project directors leave the pool (their operational read moves to work-wake, Task 9).
  2. Content reads from the same inputs the seats get (beats deltas, petition pool, tracker) — the confrontation confronts with what the seat could have seen. Prompt keeps the five-mandatory-field block validation (`:1015-1029`).
  3. Named seats get the demand in their next datawake pack (Task 3.4); the desk cron covers it as news (ruling 7 — no special news rule; stage clears emit CIVIC hooks through the engine.232 routing for the beat writers).
- **Verify:** dry-run directive on live local data names only elected seats, each demand traceable to a beats row or tracker row.

### Task 9: Rota split + tests

- **Files:**
  - `scripts/cron-civic-run.js` — modify (`datawakeRota`, `:1915-1948`)
  - `scripts/civic-office-map.json` — read
  - `scripts/work-wake-packages.json` — modify (project-director packs)
  - `scripts/cron-work-wake.js` — modify (new `initiative-project` data node)
  - `scripts/cron-civic-game.test.js` — create
- **Steps:**
  1. Rota filter: datawake draws from elected seats (9 council + mayor) plus the police chief (standing builder ruling) — 11 seats, ~1.1 turns/seat/week, ~5 turns inside the clock. Project directors, DA, Okoro, Baylight move off the datawake rota.
  2. Project-director work-wake packs: new `initiative-project` node builder in `cron-work-wake.js` (beats `Initiative_Tracker.jsonl` rows for the director's project: phase, stage, milestone notes — ~600 chars) + four registry entries (`dutyDays` staggered off the datawake days). DA/Okoro/Baylight packs deferred — Open questions.
  3. Tests: move validation + grounding (T1), decisions-channel accretion + candidate-row build (T2), pack blocks (T3), stage transitions + stall + revival (T4/5 fixtures), petition counter math (T6), directive targeting (T8). Synthetic POPIDs (`POP-999xx`), temp-dir JSONL, no network.
  4. **Crontab untouched** — any schedule change (rota rebalance needs none; work-wake already Tue/Thu 20:18) is proposed in the changelog for builder install.
- **Verify:** `node scripts/cron-civic-game.test.js` all pass; `node --check` clean on every modified script; dry-runs write nothing (`git status` clean under `output/`, `logs/`).

---

## Lane assignments (2026-09-20, research-build)

One owner per file — `scripts/cron-civic-run.js` is touched by Tasks 1, 2, 3, 6.3, 8, 9, so a single lane edits it, in order. Everything is dry-run: no `--apply`, no crontab edits (builder installs).

| Lane | Tasks | Owns (sole editor) | Hands off |
|------|-------|--------------------|-----------|
| kimi | 1 + the Task 3 pack blocks together (a seat must see its board to choose from it), then 2, then 8, then 9 rota + work-wake packs, then the Task 6.3 Sunday-prep wiring | `scripts/cron-civic-run.js`, `scripts/buildCivicOfficeSlice.js`, `scripts/applyTrackerUpdates.js`, `scripts/validateTrackerUpdates.js`, `scripts/cron-civic-gate.js`, `scripts/cron-work-wake.js`, `scripts/work-wake-packages.json` | Task 3.2 reads Task 6's Reflection_Intake beats tab once codex lands it |
| codex | 6 (counter + beats tab), no cron-civic-run.js edit | `scripts/civicPetitions.js` (new), `scripts/dumpBeatTabs.js` | Tells kimi when the counter lands so the Sunday-prep wiring can follow |
| antigravity | 9 tests, plus adversarial review of every landed task | `scripts/cron-civic-game.test.js` (new) | Findings go to `output/antigravity/`; re-read the file before every claim |
| engine-sheet | engine.250 first; Task 5 step 1 (sponsor read) next, ahead of any seat-authored row; then Task 4 and the Task 5 revival guard on the bench. Task 7 withdrawn | `civicInitiativeEngine.js`, `initiativePhaseContract.js`, `updateCivicApprovalRatings.js`, `applyCityDynamics.js` | Tasks 4–5 cannot be benched until a move has landed on a tracker (Task 2) — the scripts side is the critical path |
| research-build | Sequencing, review against this plan, the builder-gated Open questions | this plan, ROLLOUT row civic.38 | Baylight metric blocks Task 4.4; signature bands block Task 6.3 live gating |
| grok | none (no pane) | | |

## Out of scope (sibling pieces, their own ignitions)

- Chaos-car data nodes for the 21 dark seats (design record §5) — belongs to the civic.37 work-wake registry; needs a `Chaos_Cars` beats dump entry + node builder. Mags take: staff seats' turns are operational.
- Player named-trigger wakes (design record §6) — sports pilot, next week per the design record.
- Ladder legibility blocks (bonds/household/approval "where am I" pack sections, design §2) — accretive follow-up once the move economy is live.
- Per-domain effect-side gaps (DOMAIN_EFFECTS sentiment-only domains; `S.initiativeNeighborhoodEffects` consumer gap) — filed as engine rows from Task 4, not built here.

## Codex repair-window findings and remaining decisions

Builder temporarily assigned Kimi's civic.38 scripts to Codex on 2026-09-20; Kimi resumes ownership tomorrow. Code defects from the stronger Task 1+3 review landed in separate local commits: catalog validation `7c734407`, citizen geography `266c55e6`, authority input integrity `1a284902`, retired-action removal `942ba8e6`, prior move outcomes `8d6ef0b3`, stalled-stage advice `5dd003d2`, condition evidence and model caps `33a8f6b8`. Agy's test file landed in `c85c0100`. Validation: game 26/26, petitions 15/15, repair regressions 10/10, changed-script syntax clean. Existing C108 boards remain unchanged; intake absence is explicit. No live run or external mutation. Mixed stack stays unpushed.

Captured stale/spaghetti paths and their disposition:

- `loadPetitionPool` reused a display-oriented constituent selector as geographic authority; repaired. Citizen status/name no longer determines whether a complaint belongs to a district.
- `readJsonl` silently discarded corrupt rows; audit fallback lacked a Cycle check; repeated catalog predicates admitted inherited properties. Repaired with strict shared checks and explicit unavailable evidence.
- Retired free-text `action` still fed the position wall. New records omit it; `officeWall.lineFromDatawake` intentionally retains historical compatibility.
- Stage advice duplicated future engine rules and masked stalls. Stalled phase now wins; advancement advice is explicitly unavailable until the shared Task 4 helper lands.
- Current-Cycle-only move memory lost Sunday outcomes, and full history arrays bypassed text caps. Repaired across Cycle files and at the model prompt boundary.
- Task 3 step 3 still names Supermemory even though the accepted 2026-09-20 changelog specifies disk-first Reflection_Intake. This is stale task prose; no return to network readback was implemented.

Design choices returned to research-build without a new default: reflection recency (display currently all recorded rows, counter current Cycle unless configured); how a passed-over problem is identified/resolved; confrontation answer binding and any consequences; working-city selection (four latest rows versus latest per staff member). The condition block labels its snapshot Cycle and does not merge counter visibility into lifetime complaint totals. Housing/safety remain non-playable and no support band was enabled.

## Open questions

- [x] **Baylight (INIT-006) stage-3 target metric.** RULED 2026-09-20 (builder): Baylight-district retail/nightlife activity vs baseline. Unblocks Task 4.4. Sports domain has no natural civic metric (DOMAIN_EFFECTS sports → retail/nightlife/traffic/sentiment scalars). Options: Baylight-district retail/nightlife activity vs baseline, or a builder-named metric. Blocks Task 4.4's conversion mapping for one row.
- [ ] **Fruitvale transit hub (INIT-003)** has never had a council vote — convert as petition-pending (needs signatures, then a vote) rather than grandfathering a stage? Default in Task 4.4: petition-pending.
- [x] **Signature bands per domain** RULED 2026-09-20 (builder): housing band 0.30 is the counter's reading threshold only; housing/safety gate NOTHING until their engine levers exist (housing lever first), so Task 6.3 live gating stays off for both. — the share of affected-hood condition-matched population that puts a proposal on the board (§15: the tracked ledger is a sample, never the denominator). Proposed starting band: housing 0.30 rent-burden ratio; counts scaled against hood population. Blocks Task 6.3's first live gating (not the counter itself).
- [x] **Civic dial deltas** — closed 2026-09-20: Task 7 withdrawn, the affect tag already carries the cost.
- [x] **Safety and housing have no lever.** RULED 2026-09-20 (builder): housing lever first, safety after. The two domains citizens are most likely to petition on cannot be moved by an initiative today. Each needs an engine row (safety initiative → Crime_Metrics; housing initiative → rent or income relief) before a seat may propose in it. Housing is the larger measured condition (106 of 392 rented households over the 0.30 band) with no row on the board. Housing design: [[2026-09-20-housing-lever]] (codex, design only; engine-sheet executes after review). The sequence is ruled; the lever is not implemented by this checkbox.
- [ ] **Stall deltas** — default: the existing `failed` motion, owners −2 per stalled cycle (already in code, no new delta); and whether `stalled` rows still drain approval for silence on top. Blocks Task 5's cut text only.
- [x] **Catalog shapes Task 4 step 1 has to handle.** RULED 2026-09-20 (engine-sheet, mechanism): every seat-proposed catalog row mints as Type `vote` — the visioning and program arcs have no vote step for `Funded` to clear on, and the live tracker already holds construction phases under Type `vote` (INIT-005, INIT-006). Catalog changed, test pins it. Still for step 1: `sports-district` carries a two-column metric (`RetailVitality` + `NightlifeProfile`); the engine mirror must read an array.
- [ ] **What `silence` means once the clock is gone (engine-sheet, 2026-09-20 — decide at Task 4 step 2).** Step 2 removes `NextActionCycle` rescheduling for converted rows, and `classifyInitiativeMotion_` reads a blank or past `NextActionCycle` as `silence` (owner −3 ladder). Together: every converted row that is not finishing reads silence to its owner every cycle until the losing clock stalls it, then `failed` — and since Task 5 the sponsor owns both drains. Task 5 step 3 says "existing drains unchanged" and never reconciles the two. Bench C121 already shows it: the sponsoring seat paid `silence (-3)` on a stale clock one cycle after its `advanced (+2)`.
- [ ] **DA / Okoro / Baylight seats** after the rota split — work-wake packs (operational) or keep one datawake slot? Default: deferred; elected + police chief only.
- [ ] **Losing clock 4 vs 5** — default 5, per stage (`civicStageStallCycles` World_Config key, tunable live); measured ~3.6–5 turns inside it on the 11-seat rota, ~2.5 on today's.
- [ ] **Coalitions** (review §5) — support, opposition and kept-or-broken deals between seats. Not in this build; hearing dialogue changes no vote today (`civicInitiativeEngine.js:900`). Revisit once authorship and delivery run.

### Rulings on codex's returned design choices (research-build, 2026-09-20)

1. **Reflection recency:** the pack's petition/complaint display window is the current Cycle plus the two before it; the Task 6 counter stays current-Cycle only. Both labelled in the block so a seat can see which it is reading.
   - **Status:** implemented locally by codex. Display filters C−2 through C inclusive, rejects invalid/future stamps, and labels both windows; counter code unchanged. Regression boundaries pass.
2. **Passed-over problem:** identity is hood + condition key from the Task 6 counter. A problem is passed over when it appears in a seat's pack and the move ledger shows no `propose`/`work`/`canvass`/`answer` by that seat touching that hood that Sunday. It is resolved when the counter no longer reports it or a landed move addressed it. No new stored state: derived each week from the ledger and the counter.
3. **Confrontation answer:** an `answer` move binds to the directive Cycle and the named seat, one per directive; a second is refused. No new consequence in this build (coalitions stay out of scope): an unanswered demand simply reappears in the next pack until a move addresses it.
4. **Working-city selection:** latest row per staff member, one each, capped by the block's character budget — one chatty director cannot crowd out the rest.
   - **Status:** implemented locally by codex. Select latest eligible Cycle, timestamp, then append order per POPID before packing whole staff lines into the character budget; future rows excluded, omitted staff counted.

## Changelog

- 2026-09-20 (codex) — Ruling 4 implemented: latest work reflection per staff member before applying the character cap. Canonical ReflectionExcerpt, same-Cycle timestamp ordering, future exclusion and five distinct staff covered; repair/ruling tests 12/12.
- 2026-09-20 (codex) — Ruling 1 implemented: three-Cycle complaint display, explicitly distinct current-Cycle condition counter. Game 26/26, counter 15/15, repair/ruling tests 11/11; local only.
- 2026-09-20 (research-build) — Ruled codex's four returned design choices (§Rulings). Housing-lever design `2026-09-20-housing-lever` accepted for engine-sheet execution; rate/enable stay World_Config keys, off until activation.
- 2026-09-20 (codex) — Completed temporary-owner script defect pass in seven repair commits plus the separate agy fixture commit; evidence, stale-code captures and undecided design choices recorded above. Task 1 script repairs complete; Task 3 still depends on the shared engine helper and unresolved design semantics. Kimi ownership resumes tomorrow.
- 2026-09-20 (codex) — Filed Task 1+3 adversarial review (c052b127) and housing-first design linked from Open questions; counter defect fixed in 3274f309; Kimi follow-up repairs recorded in the review.
- 2026-09-20 (codex) — Verified and repaired agy finding 6.1: district-scoped invalid-care counts and non-blocking unlocated-row warnings; regression failed before the fix, all 15 counter tests pass after it.
- 2026-09-20 (engine-sheet) — Builder ruled the stall drain: half weight. `World_Config bizInitiativeStallDrag` = 0.5, self-armed, tunable live; bench C122 Temescal mean −0.17 against −1.0 at full weight; PROD @108. The losing clock's business cost is settled for Task 4 step 3.
- 2026-09-20 (engine-sheet) — Task 5 steps 1–2 landed `95b67423`, bench C120–C121 (four cases held: stall entry and held stall −2 to owners, revival 0, sponsor outside the lead faction and the row's district takes the owner delta), PROD @107 HEAD push. The sponsor owns the drains too: a seat-authored row on a stale clock costs its sponsor `silence (-3)`. Same revival guard added to the engine.250 business marker. [[../reference/DEPLOY_HISTORY]] §PROD @107.
- 2026-09-20 (engine-sheet) — Task 4 step 0 landed: `INTERVENTION_CATALOG` in `lib/initiativePhaseContract.js`, 8 keys (`health-service`, `transit-project`, `school-program`, `economic-program`, `workforce-program`, `sports-district` playable; `safety-program`, `housing-program` listed and refused). Entry = label, policyDomain, type, effectChannel, stage3Metric, playable. Environment left out — no stage-3 metric ruled. engine.250 landed first (PROD @106): the business channel pays on a phase TRANSITION and drains on a stalled row, so Task 4's losing clock will cost a hood's businesses `-scale` per stalled cycle — open builder dial, [[../reference/DEPLOY_HISTORY]] §PROD @106. The engine-side mirror + parity test ride Task 4 step 1.
- 2026-09-20 (research-build) — Task 1+3 landed (kimi, 8b07fc29). Task 3 step 3 accepted as disk-first: working-city block reads chief/director reflections from the beats Reflection_Intake dump instead of Supermemory readback (no network in the pack builder, testable); missing input degrades to a stated absence. `propose` is refused until INTERVENTION_CATALOG (Task 4 step 0) lands in lib/initiativePhaseContract.js — engine-sheet lands step 0 ahead of the rest of Task 4.
- 2026-09-20 (codex) — Task 6 counter, 13 passing tests, OPTIONAL Reflection_Intake export, interface, C108 measurements, verified wiring card, and traced defects landed in `7291d25e`. The concurrent engine-sheet commit included Codex's four path-staged files before the intended Codex commit ran; attribution recorded here without rewriting history. Sunday-prep wiring remains kimi-owned.
- 2026-09-20 (research-build) — Builder ruled three open questions: Baylight metric = district retail/nightlife vs baseline; housing band 0.30 is a counter threshold only, housing gating stays off until the lever lands; housing lever built before safety.
- 2026-09-20 (engine-sheet) — Codex review accepted into `docs/research/` and reconciled, builder-direct. All eight findings re-verified against the files. Task 2 rebuilt on a move ledger + Sunday fold; Task 3 retargeted at the live pack builder; Task 4 gains the intervention catalog, column-held machine state and an explicit stage↔phase mapping; Task 5 shrinks to the sponsor read and a revival guard (a stalled row already pays −2 per cycle through the existing `failed` motion); Task 6 formula annualized; Task 7 withdrawn on measured evidence (the affect tag already pays the complaint cost). New defect filed: engine.250, the initiative effects bus emptied before its phase-3 and phase-5 readers.
- 2026-09-20 (codex) — Linked the builder-requested [[../research/2026-09-20-codex-civic38-game-loop-review]]; review proposals await reconciliation, with tasks and assignments unchanged.
- 2026-09-20 (research-build) — Lane assignments added; house guests booted against them.
- 2026-09-19 (kimi) — Initial draft. Builder approved drafting in-session (research record §10/§11 is the contract). Anchors verified by two read-only exploration passes + wiring cards for civicInitiativeEngine and citizenDialMap (both attached). Corrections the verification surfaced, baked into the tasks: sitting is free post-engine.213 so the stall must carry the cost (Task 5); no per-citizen crime-victim data exists so safety signatures are hood-aggregate (Task 6); the grounding gate never covered `statement` and still doesn't (Task 1); Chaos_Cars is not in the beats dump (out of scope, named); datawake rota is 18 seats incl. project directors, not 19 (Task 9).
