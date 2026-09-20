---
title: Civic Wake Game Loop Plan — seat moves, three-stage initiatives, petitions, confrontation
created: 2026-09-19
updated: 2026-09-19
type: plan
tags: [civic, citizens, engine, cron, active]
sources:
  - docs/research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives.md — design record; §10 Mike rulings, §11 measured baseline (this plan's build contract)
  - Mike rulings 2026-09-19 (third pass, captured in the design record §10) — seats author; districts own hoods / mayor anywhere; petition from citizen wakes + condition data; Mara-style confrontation; 4–5 cycle losing clock; benefit on deploy; all six rows convert; three stages; no special news rule
  - output/agent_engine-wiring_2026-09-19T08-04-59.md — wiring card, phase05-citizens/civicInitiativeEngine.js
  - output/agent_engine-wiring_2026-09-19T08-05-44.md — wiring card, utilities/citizenDialMap.js
  - output/agent_engine-wiring_2026-09-16T17-17-23.md — wiring card, Reflection_Intake / citizenPage write path (civic.37)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout, row civic.38"
  - "[[../research/2026-09-19-kimi-initiative-stage-voting-and-wake-incentives]] — design record (rulings + measured gaps)"
  - "[[2026-09-16-work-wake-packs]] — civic.37, the wake chassis this plan's packs ride"
  - "[[../SCHEMA]] — doc conventions"
  - "[[../index]] — registered 2026-09-19"
---

# Civic Wake Game Loop Plan

**Goal:** The Mon–Thu civic datawake stops being a speech generator and becomes a turn in a game: each elected seat chooses from a closed set of moves that persist through the existing Sunday gate to Initiative_Tracker, initiatives clear three work-gated stages (Funded → Standing → Delivering) on a 4–5-cycle losing clock, and citizen complaints become petitions and dial pressure the seats must answer.

**Architecture:** Scripts-side, the datawake gains a structured move set whose payloads accrete into the same `decisions_c{XX}.json` channel the Sunday chain already reads, so `applyTrackerUpdates.js`'s existing mechanical gate + clerk verdict + `normalizeTrackerWrite` carry seat work to the sheet with zero new sheet-write machinery. Engine-side (cuts proposed for engine-sheet, wiring cards attached), `civicInitiativeEngine.js` trades the `NextActionCycle` time gate for stage clearance observed off the tracker and off domain target metrics, a stall pays approval through the existing motion-ladder machinery, and `citizenDialMap.js`'s empty `Civic` entry makes unanswered complaints cost the complaining citizen. A Mara-style confrontation step re-aims the Sunday directive at the elected seats, and the datawake rota splits: elected seats keep the political turn, project directors move to work-wake operational shifts.

**Terminal:** research-build / engine-sheet (scripts-side tasks implemented by kimi, house-guest lane; engine substrate cuts — Tasks 5–7 — land through engine-sheet)

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
- Benefits: `applyInitiativeImplementationEffects.js` — PHASE_INTENSITY `:179`, DOMAIN_EFFECTS `:207`; only health (`:448-482`) and transit (`:484-490`) reach real world-state; per-hood `S.initiativeNeighborhoodEffects` has no consumer (`:515-517`). HEALTH_DELIVERING_PHASES `:167-175` ("a building site treats nobody", `:480-481`).
- `utilities/citizenDialMap.js:48` — `'Civic': {}` (verified). Entry shape: `{ <dialName>: <signed int> }`, ordinary scale ±1–2. Consumed by `nudgesForReflection_` (`:316`) ← `compressLifeHistory_` (Phase 9, `phase01-config/godWorldEngine2.js:543`) → accreted at ×0.225 (`utilities/compressLifeHistory.js:126-127`). The gated read filters on `applied` only — daypart is never read (`:289-299`).
- Petition condition data: Household_Ledger carries `MonthlyRent` + `HouseholdIncome` per household (rent burden derivable — prefer MonthlyRent, `HousingCost` seen 0 on rented units); Hospital_Ledger is per-citizen illness with POPID (current care board only); **no per-citizen crime-victim data exists anywhere** — Crime_Metrics is per-hood aggregate. Neighborhood_Demographics has per-hood `Sick` counts.
- Mara directive: `runDirective` (`cron-civic-run.js:883`, blocks written `:1039-1052`), first Sunday chain stage; addressee pool = office-map rows with `agentDir` non-null (`:936-943`) — includes project directors; content driven by world summary + engine audit + tracker snapshot (`:890-1006`).
- Rota: 39 map rows (35 offices + 4 projects); 18 wake agents (mayor, DA, 9 council, Okoro, Baylight, police chief, 4 project directors); datawake exits clean Sun/Fri/Sat (`cron-civic-run.js:2077-2080`). Police chief stays datawake-only (standing builder ruling, civic.37).
- The grounding gate validates only `action` + `numberMoved`, never `statement` (`cron-civic-run.js:2161-2162`); identity numbers are allowed (`:2018-2024`).

**Acceptance criteria:**
1. `node scripts/cron-civic-run.js --stage=datawake --dry-run` (or the smallest equivalent harness) shows a seat choosing from the closed move set with its board + petition pool in the pack, and the grounding gate rejecting a move that names an initiative or hood not on that seat's slice.
2. A week of synthetic moves accreted into the decisions channel appears in `applyTrackerUpdates.js` dry-run output, passes `normalizeTrackerWrite` unchanged, and a `propose` move produces a well-formed candidate row via `scripts/createInitiative.js` — no new sheet-write path, no live `--apply` without builder approval.
3. On the sandbox bench (groundhog loop, `docs/reference/DEPLOY.md` §Groundhog): a converted initiative clears Funded→Standing only when a `work` move has landed on its row; a stage left untouched for N cycles (default 5) flips to `stalled` and the owner takes an approval hit through the motion ladder; Delivering clears when the domain target metric moves the right way from the vote-time baseline.
4. `node scripts/civicPetitions.js --dry-run` counts condition-matched signatures for a sample proposal from live local beats files (housing from Household_Ledger, health from Hospital_Ledger + Neighborhood_Demographics) with no LLM in the count, and a Civic-tagged reflection sample raises visibility without counting as signatures.
5. On the sandbox bench: a citizen whose reflection classifies `Civic` takes the new dial nudge through the Phase-9 gated read (base accretion, ×0.225), verified in the bench ledger.
6. `node scripts/cron-civic-game.test.js` passes — move validation, grounding, accretion, pack builders, petition counter, stage-transition fixtures (synthetic, visibly non-canon, no network).

---

## Tasks

### Task 1: Closed move set in the datawake

- **Files:**
  - `scripts/cron-civic-run.js` — modify (datawake section, ~`:1861-2180`)
- **Steps:**
  1. Replace the free-text `action` field in the datawake JSON schema (`:1968`) with a closed `moves` array. Move types: `propose` `{title, policyDomain, hoods[], problem, targetMetric}`, `work` `{initiativeId, stageGoal}`, `answer` `{confrontationId?, text}`, `canvass` `{hood, note}`. `statement` stays free text and ungrounded (standing behavior, `:2161-2162`). Unknown move types are rejected loudly and logged; the wake still records the seat's statement.
  2. Extend the grounding gate: `work.initiativeId` must be on the seat's board block (Task 3); `propose.hoods` must intersect the seat's district hoods for council seats — the mayor may name any hood (ruling 2); `canvass.hood` same rule. Rejected moves are dropped with a `[datawake] MOVE REJECTED <seat> <reason>` line; valid moves in the same wake survive (seat-drop discipline, never fatal to the run).
  3. Persist the accepted moves into the per-seat datawake JSON (`:2177-2188`) alongside the existing fields.
- **Verify:** fixture seat + fixture slice in the Task 9 test: valid move accepted, off-board initiative rejected, out-of-district hood rejected for a council seat, allowed for the mayor.

### Task 2: The write path — moves reach the tracker through the Sunday gate

- **Files:**
  - `scripts/cron-civic-run.js` — modify (datawake persist)
  - `scripts/applyTrackerUpdates.js` — modify (new-row candidate path)
  - `scripts/createInitiative.js` — read (row builder, pure Node mirror of `createInitiative_`)
- **Steps:**
  1. Accrete each accepted move into `output/city-civic-database/initiatives/<agentDir>/decisions_c{XX}.json` in the exact shape applyTrackerUpdates already reads (`trackerUpdates`, `:100-101`, `:237-265`) — mirror a live C106/C107 decisions file for the shape before writing the builder. `work` moves become trackerUpdates candidates (MilestoneNotes + stage token); `propose` moves become a new `candidateRows` array on the same file.
  2. `applyTrackerUpdates.js`: add a gated `candidateRows` section — each candidate is built into a full tracker row via `scripts/createInitiative.js`, validated (policyDomain in DOMAIN_EFFECTS vocabulary, hoods canonical, `VoteCycle` = next cycle, initial phase per `lib/initiativePhaseContract.js:45-59` vote arc), and appended only in `--apply` mode after the same clerk-verdict gate. Dry-run prints the would-be rows. **This extends the live Sunday write path — dry-run default preserved, builder flips.**
  3. A `propose` whose petition has not cleared (Task 6) is written with a `petition-pending` marker in MilestoneNotes, never as `vote-scheduled` — the signature counter, not the seat, moves it to a vote.
- **Verify:** synthetic decisions file → dry-run shows the trackerUpdate + candidate row; `--apply` untouched in tests; malformed candidate (bad domain) refused with a loud line.

### Task 3: Seat pack upgrade — board, petition pool, working city, confrontation

- **Files:**
  - `scripts/cron-civic-run.js` — modify (`domainSlice`, `:1861`)
- **Steps:**
  1. **My board:** the seat's own initiatives (sponsor/owner match off the beats `Initiative_Tracker.jsonl` dump, already optional-tab 22) with current phase/stage, cycles-since-last-stage-change, and what each needs next (stage rules from Task 4 — text built from a shared helper so the pack and the engine never drift on what clears a stage).
  2. **My district's petition pool:** Civic-tagged reflections for the seat's hoods (beats `Reflection_Intake.jsonl` — added to the dump in Task 6) as the "people are talking" signal, plus the condition counts from the petition counter (Task 6) for problems matching live proposals.
  3. **The working city:** latest work-wake reflections from chiefs/directors (Supermemory page readback via the civic.37 `loadOwnPageReadback` discipline — read-only).
  4. **Confrontation block:** when the Sunday directive named this seat (parse the latest `output/mara-directives/mara_directive_c{N}_AUTO.txt`), the pack carries the demand verbatim and an `answer` move is expected.
  5. Cap each block (~600 chars, same discipline as civic.37 node builders); missing inputs degrade to a stated absence, never a fabricated board.
- **Verify:** fixture-based test per block; dry-run on live local data shows a real seat's board matching the live tracker rows.

### Task 4 (ENGINE CUT — engine-sheet lands): three stages, no time gate, losing clock

- **Files:**
  - `phase05-citizens/civicInitiativeEngine.js` — modify (proposed; wiring card `output/agent_engine-wiring_2026-09-19T08-04-59.md`)
  - `lib/initiativePhaseContract.js` — modify (stage vocabulary)
- **Steps:**
  1. Stage model on the row: `Funded` (clears on the vote passing — existing machinery, `:301-308`, `:1051`), `Standing` (clears when a `work` move has landed on the row through the Sunday gate — the engine reads the tracker, so the write IS the observation), `Delivering` (clears when the domain target metric has moved the right way from its vote-time baseline — baseline stamped on the row at VoteCycle). Stage + baseline + LastStageChangeCycle persist on Initiative_Tracker (new columns, SHEETS_MANIFEST + schema docs updated in the same cut).
  2. Remove the v1.9 `NextActionCycle` rescheduling trigger (`:254-267`) for converted rows — time stops being how you win. Keep the ENGINE-CLOCK hold only as the stall detector's input.
  3. Losing clock: a stage unchanged for N cycles (default 5, World_Config key `civicStageStallCycles` — Mike: "4–5 sounds like a good starting point") flips the row to `stalled` (joins NEGATIVE_PHASES vocabulary, contract `:62`). A landed `work` move revives `stalled` → its prior stage and resets the clock.
  4. All six live rows convert at cut time (ruling 6): each row gets stage + baseline stamped from its current phase (mapping table in the cut's test: e.g. OARI `dispatch-live` → Standing with Crime_Metrics baseline; the Temescal health center `construction-active` → Standing; Stabilization Fund `disbursement-active` → Standing). Fruitvale transit hub (never voted) enters at petition/Funded-pending — see Open questions.
  5. `applyInitiativeImplementationEffects.js` unchanged here — benefits keep paying per phase intensity (ruling 5: benefit on deploy, already true for delivering phases). The per-hood consumer gap (`:515-517`) and the domains whose effects move only sentiment scalars are filed as follow-up engine rows, not fixed in this plan.
- **Verify:** bench groundhog cycles on SANDBOX 0908: vote → Funded; no work move for N cycles → stalled + approval hit (Task 5); work move → Standing; metric moved → Delivering. Pull-back js byte-identical check per house deploy pattern.

### Task 5 (ENGINE CUT — engine-sheet lands): stall pays through the motion ladder

- **Files:**
  - `phase05-citizens/updateCivicApprovalRatings.js` — modify
- **Steps:**
  1. `classifyInitiativeMotion_` (`:1037-1059`) gains a `stalled` motion: owner −2, nearby 0 (proposed deltas — builder-tunable), paid once per stall entry, diffed against `previousCycleState` like the existing motions.
  2. Rationale recorded in the cut: sitting became free under engine.213 (`MOTION_LADDERS_.sitting = []`, `:1072-1076`); without a stall cost the losing clock has no teeth and the calendar stops running both ways (SIM_DOCTRINE §15).
  3. Existing drains unchanged: silence still −3/−2, challenger <40, chair <20.
- **Verify:** bench: a stalled row moves the owner's approval by exactly the ladder delta, once; a revived row does not re-pay.

### Task 6: Petition mechanics — signatures counted, reflections seen

- **Files:**
  - `scripts/civicPetitions.js` — create (counter)
  - `scripts/dumpBeatTabs.js` — modify (add `Reflection_Intake` as an OPTIONAL beats tab)
  - `scripts/cron-civic-run.js` — modify (Sunday prep wires the counter into vote gating)
- **Steps:**
  1. Signature counter, deterministic, no LLM: given a proposal `{policyDomain, hoods[]}`, count — housing: Household_Ledger rows in those hoods with `MonthlyRent / HouseholdIncome` above the band (builder-set, proposed 0.30; the tracked ledger is a sample, never the denominator — band scales against hood population from Neighborhood_Demographics); health: Hospital_Ledger rows in care + hood `Sick` share; safety: hood-aggregate only (Crime_Metrics ViolentLevel above the city median — no per-citizen victim data exists; stated honestly in output); education/transit/economic/sports: defer to per-domain rules as the stage-3 metrics land (Open questions). **All hood matching folds child areas to parents** (SIM_DOCTRINE §17: "a child area is its parent, in every count and every read") — scripts-side via `lib/canonNeighborhoods.js` + the sheet-sourced ChildAreas map (parent links live on the sheet, canonNeighborhoodLoader.js:146; never a hard-coded copy), so a Coliseum household counts for East Oakland.
  2. `Reflection_Intake` joins the beats dump as OPTIONAL (`dumpBeatTabs.js` BEAT_TABS, `scripts/dumpBeatTabs.js:44-61` shape) so seats and the counter read local files, never a fresh sheet read. Civic-tagged rows (`lib/reflectionClassifier.js:37` vocab) feed the pack's "people are talking" block — visibility, never signatures.
  3. Sunday prep: a `petition-pending` proposal whose signature count clears its band moves to `vote-scheduled` through the same gated tracker write (VoteCycle stamp, `applyTrackerUpdates.js` G-R3 path). Below band: stays pending, public, and costs the seat nothing beyond the stall clock once Funded.
- **Verify:** Task 9 fixtures: burden ratio math, band scaling, safety aggregate path, reflections excluded from counts. Dry-run on live local beats prints a real count table.

### Task 7 (ENGINE CUT — engine-sheet lands): the Civic dial entry

- **Files:**
  - `utilities/citizenDialMap.js` — modify (`:48-49`; wiring card `output/agent_engine-wiring_2026-09-19T08-05-44.md`)
- **Steps:**
  1. `'Civic': {}` → a small negative entry — proposed `{ composure: -1, warmth: -1 }` (ruling 3: "the more they complain the more their dials go down and become more upset"; exact dials/deltas builder-tunable, ordinary ±1 scale per the file's own conventions). Leave `'Civic Perception': {}` untouched (engine.201 ruling 1b — a routine generator line is a plain day).
  2. Note in the cut: engine.39 (citizenDialMap pure-integrity) is in-progress on this file — coordinate, don't collide.
  3. The loop this creates (complaint → dial pressure → visibility in seat packs → seat action) is the ruled behavior; the accretion discount (×0.225) keeps one complaint small and a neglected problem cumulative.
- **Verify:** bench: a synthetic Civic reflection through the Phase-9 gated read moves the citizen's base dials by the discounted delta; a non-Civic reflection does not.

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
| kimi | 1 → 2 → 3, then 8, then 9 rota + work-wake packs, then the Task 6.3 Sunday-prep wiring | `scripts/cron-civic-run.js`, `scripts/applyTrackerUpdates.js`, `scripts/cron-work-wake.js`, `scripts/work-wake-packages.json` | Task 3.2 reads Task 6's Reflection_Intake beats tab once codex lands it |
| codex | 6 (counter + beats tab), no cron-civic-run.js edit | `scripts/civicPetitions.js` (new), `scripts/dumpBeatTabs.js` | Tells kimi when the counter lands so the Sunday-prep wiring can follow |
| antigravity | 9 tests, plus adversarial review of every landed task | `scripts/cron-civic-game.test.js` (new) | Findings go to `output/antigravity/`; re-read the file before every claim |
| engine-sheet | 4, 5, 7 engine cuts on the bench, after engine.249 | `civicInitiativeEngine.js`, `initiativePhaseContract.js`, `updateCivicApprovalRatings.js`, `citizenDialMap.js` | Task 7 coordinates with engine.39 on `citizenDialMap.js`; Task 4 needs the write path (Task 2) visible on the tracker |
| research-build | Sequencing, review against this plan, the builder-gated Open questions | this plan, ROLLOUT row civic.38 | Baylight metric blocks Task 4.4; signature bands block Task 6.3 live gating |
| grok | none (no pane) | | |

## Out of scope (sibling pieces, their own ignitions)

- Chaos-car data nodes for the 21 dark seats (design record §5) — belongs to the civic.37 work-wake registry; needs a `Chaos_Cars` beats dump entry + node builder. Mags take: staff seats' turns are operational.
- Player named-trigger wakes (design record §6) — sports pilot, next week per the design record.
- Ladder legibility blocks (bonds/household/approval "where am I" pack sections, design §2) — accretive follow-up once the move economy is live.
- Per-domain effect-side gaps (DOMAIN_EFFECTS sentiment-only domains; `S.initiativeNeighborhoodEffects` consumer gap) — filed as engine rows from Task 4, not built here.

## Open questions

- [ ] **Baylight (INIT-006) stage-3 target metric.** Sports domain has no natural civic metric (DOMAIN_EFFECTS sports → retail/nightlife/traffic/sentiment scalars). Options: Baylight-district retail/nightlife activity vs baseline, or a builder-named metric. Blocks Task 4.4's conversion mapping for one row.
- [ ] **Fruitvale transit hub (INIT-003)** has never had a council vote — convert as petition-pending (needs signatures, then a vote) rather than grandfathering a stage? Default in Task 4.4: petition-pending.
- [ ] **Signature bands per domain** — the share of affected-hood condition-matched population that puts a proposal on the board (§15: the tracked ledger is a sample, never the denominator). Proposed starting band: housing 0.30 rent-burden ratio; counts scaled against hood population. Blocks Task 6.3's first live gating (not the counter itself).
- [ ] **Civic dial deltas** — proposed `{ composure: -1, warmth: -1 }`; builder may pick different dials. Blocks Task 7's cut text only.
- [ ] **Stall deltas** — proposed owner −2; and whether `stalled` rows still drain approval for silence on top. Blocks Task 5's cut text only.
- [ ] **DA / Okoro / Baylight seats** after the rota split — work-wake packs (operational) or keep one datawake slot? Default: deferred; elected + police chief only.
- [ ] **Losing clock 4 vs 5** — plan defaults 5 (`civicStageStallCycles` World_Config key, tunable live).

## Changelog

- 2026-09-20 (research-build) — Lane assignments added; house guests booted against them.
- 2026-09-19 (kimi) — Initial draft. Builder approved drafting in-session (research record §10/§11 is the contract). Anchors verified by two read-only exploration passes + wiring cards for civicInitiativeEngine and citizenDialMap (both attached). Corrections the verification surfaced, baked into the tasks: sitting is free post-engine.213 so the stall must carry the cost (Task 5); no per-citizen crime-victim data exists so safety signatures are hood-aggregate (Task 6); the grounding gate never covered `statement` and still doesn't (Task 1); Chaos_Cars is not in the beats dump (out of scope, named); datawake rota is 18 seats incl. project directors, not 19 (Task 9).
