# Beat Slices From Sheets Plan

**Goal:** A beat reporter's slice is built from that beat's own sheet tabs, dumped free at cycle time, and tells her to paint what she reads — not from the engine summary's crisis lane.

**Architecture:** Run-cycle Step 5.56 already dumps `Simulation_Ledger` to disk; extend it with `scripts/dumpBeatTabs.js`, one free read of the twelve beat tabs into `output/beats/*.jsonl`. Every `scripts/build*Slice.js` stays disk-first (their stated design) but reads the beat dump instead of only `desk_signal_c{XX}.json`; `desk_signal` shrinks to "what moved" pointers. The APPROACH / STANCE strings are rewritten per SIM_DOCTRINE §13: facts are the names, places and roles in the dump; everything else is hers. Builders fire in the cycle run and standalone (`--cycle N`) against the same dump.

**Terminal:** engine/sheet drafted (S433, with the context); execution owner per task below — `scripts/build*Slice.js` and `scripts/cron-desk-run.js` are research-build's files, coordinate before cutting.

**Pointers:**
- Ruling: `docs/SIM_DOCTRINE.md` §13 (gate the facts, not the color), civic.35 `5dbd899a` (the civic-side cut of the same ruling)
- Finding (S433): 13 slice builders + `buildDeskPackets.js` make zero `getSheet*` calls; `desk_signal_c106.json` has four lanes (civic/sports/culture/business), civic = 22/27 crisis anomalies; rota quotas civic 2 / sports 2 / culture 1 / business 1 / undocked 1 (`output/cron-compare/fanout-2026-09-04.json`); `cron-desk-run.js` folds HEALTH/SAFETY/INFRASTRUCTURE/EDUCATION/ENVIRONMENT RoleTypes into the civic desk
- Supersedes for the cron path: `docs/media/charge_brief_template.md` "pointers only (LOCKED #1)" — a headless writer reads only its prompt; a pointer to a tab is dead to her. The lock was built for CLI-era reporters who could retrieve.
- Related: [[2026-08-07-civic-solo-seats]] (pipeline.49, the seats this feeds), `docs/adr/0017-typed-lived-experience-packets.md`

**Acceptance criteria:**
1. The next run-cycle writes `output/beats/meta.json` whose per-tab row counts equal the live tabs' counts (verified by readback), and every builder runs standalone against it with no Sheets call.
2. The next unattended Mon–Fri rota in which the business/food seat draws produces a delivered article that names a `Business_Ledger.Name` and an `Employment_Roster.CitizenName` who works there. Measured from `output/reporters/` after the 18:15 write, never from a hand run.
3. No builder degrades silently: with `output/beats/` absent, each exits non-zero naming the missing dump (no fallback to the old signal-only slice).

---

## Tasks

### Task 1: Beat-tab dump at cycle time — owner engine-sheet

- **Files:**
  - `scripts/dumpBeatTabs.js` — create (mirror `scripts/dumpLedger.js`: same env load, same `lib/sheets` client, refuses to stamp a cycle backwards)
  - `.claude/skills/run-cycle/SKILL.md` — modify Step 5.56: add `node scripts/dumpBeatTabs.js {XX} --quiet` after `dumpLedger.js`
- **Steps:**
  1. Dump these tabs to `output/beats/<Tab>.jsonl` (one object per row, header keys verbatim) and write `output/beats/meta.json` `{cycle, generatedAt, rows: {<Tab>: n}}`:
     `Business_Ledger` (BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel) ·
     `Employment_Roster` (BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer) ·
     `Transit_Metrics` (Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes) ·
     `Crime_Metrics` (Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount) ·
     `Neighborhood_Demographics` (Neighborhood, Students, Adults, Seniors, Unemployed, Sick, SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding) ·
     `Youth_Events` (Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, Neighborhood, Outcome) ·
     `Hospital_Ledger` (POPID, Name, Neighborhood, Cause, AdmitCycle, StatusNow, Outcome) ·
     `Health_Cause_Queue` (POPID, Name, Status, CyclesSick, Neighborhood, AssignedCause) ·
     `Community_Programs` (Program_ID, Name, Founder_POPID, Neighborhood, Type, Status) ·
     `Faith_Organizations` (Organization, FaithTradition, Neighborhood, Congregation, Leader, LeaderPOPID, MembersList) ·
     `Cycle_Weather` (CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Streak, StreakType) ·
     `Household_Ledger` (HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HouseholdIncome, Status) ·
     `Casino_Ledger` (WagerId, CyclePlaced, CycleSettled, POPID, HouseholdId, MarketFamily, MarketId, EventId, Side, Stake, Odds, Payout) ·
     `Story_Seed_Deck` (Cycle, SeedID, Desk, Class, Domain, Neighborhood, What, Why, Citizens, CitizenEvents, Businesses, OtherEntities, Magnitude, Trend) ·
     `Story_Hook_Deck` (Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, SuggestedDesks, SuggestedJournalist, SuggestedAngle).
  2. Keep the prior cycle's dump as `output/beats/prev/` before overwriting, so builders can compute "what moved" (Transit_Metrics and Crime_Metrics deltas) without a second Sheets read.
  3. Read-only: no `appendRows`/`updateRange` anywhere in the file (pre-commit hook enforces).
- **Verify:** `node scripts/dumpBeatTabs.js 106 --quiet && node -e "const m=require('./output/beats/meta.json');console.log(m.cycle,m.rows)"` → cycle 106; Business_Ledger 176, Employment_Roster 859, Transit_Metrics 522, Crime_Metrics 23, Neighborhood_Demographics 22, Youth_Events 168, Household_Ledger 712 (live counts 2026-09-07; re-read live before asserting)
- **Status:** [ ] not started

### Task 2: Business / food slice reads the ledger — owner research-build (file), spec here

- **Files:**
  - `scripts/buildEconomicSlice.js` — modify (source + APPROACH)
  - `scripts/buildEconomicSlice.test.js` — modify
- **Steps:**
  1. Source: `output/beats/Business_Ledger.jsonl` joined to `output/beats/Employment_Roster.jsonl` on `BIZ_ID` (`Status` active rows), giving each business its named staff (`CitizenName`, `RoleType`, `POP_ID`). `desk_signal` business lane stays as the "what moved" pointer list only.
  2. Slice shape: pick ONE neighborhood (rotate least-recently-covered, from `output/reporters/` bylines), list 3–5 of its businesses with `Sector`, `Employee_Count`, `Growth_Rate`, `Key_Personnel`, and up to 4 named staff each. Add a `foodFilter` mode (Sector matching restaurant/food/hospitality vocab — read the live `Sector` values before writing the regex) for Mason Ortega.
  3. Replace `ECONOMIC_APPROACH` per §13: *facts* = the business names, hoods, sectors, staff names and roles on this slice (never invent a storefront or a worker); *color* = everything else — what the counter looks like on a Tuesday, who the regulars are, what the owner is worried about. Drop "do not lead with raw engine decimals" framing entirely; there are no decimals to lead with.
  4. `output/beats/` missing → `throw new Error('beat dump missing: run scripts/dumpBeatTabs.js <cycle>')`. No fallback to the signal-only slice.
- **Verify:** `node scripts/buildEconomicSlice.js --cycle 106` → JSON with ≥3 `BIZ_ID`s and ≥3 `POP_ID`s present in the dump; `node scripts/run-tests.js buildEconomicSlice` → pass
- **Status:** [ ] not started

### Task 3: Mason Ortega draws the food slice — owner research-build (file), spec here

- **Files:**
  - `scripts/cron-desk-run.js` — modify (~line 823 stance block; the culture-consumer evening pack at ~881 stays for Kai/Sharon/Maria/Graye)
- **Steps:**
  1. When `persona.name` is Mason Ortega: load `loadEconomicSlice(cycle, { foodFilter: true })` instead of the evening pack; STANCE becomes "kitchens as workplaces — the people on this slice are real, the rest of the room is yours."
  2. Remove "Packet-named workers only." (the drone line).
- **Verify:** `node scripts/cron-desk-run.js --stage=angle --desk culture --persona mason-ortega --dry-run` (or the existing shadow path) prints ≥1 `Business_Ledger.Name` in the prompt
- **Status:** [ ] not started

### Task 4: The folded beats get their own slices — owner research-build (files), spec here

- **Files:**
  - `scripts/buildSafetySlice.js` — modify · `scripts/buildCivicDomainSlice.js` — modify (Trevor, Lila, Noah, Angela packets) · `scripts/buildTransitSlice.js`, `scripts/buildSchoolsSlice.js`, `scripts/buildHealthSlice.js`, `scripts/buildEnvironmentSlice.js`, `scripts/buildFaithSlice.js` — create only if `buildCivicDomainSlice.js`'s packet model can't carry the tab data cleanly (decide at Task 4 start, note the decision in Changelog)
- **Steps (tab.column per seat):**
  1. Trevor Shimizu — `Transit_Metrics` rows for this cycle vs `prev/`: per `Station`/`Corridor`, `RidershipVolume`, `OnTimePerformance`, `TrafficIndex` deltas; `Notes` verbatim. Fact = stations, corridors, numbers on the slice. Color = the platform at 7:40.
  2. Sgt. Rachel Torres — `Crime_Metrics` per `Neighborhood` (`PropertyCrimeIndex`, `ViolentCrimeIndex`, `ResponseTimeAvg`, `ClearanceRate`, `IncidentCount`) with deltas vs `prev/`; `desk_signal` incidents as pointers. Delete `scene.colorRoom: 'carries no incident fact, quote, or public sentiment'`.
  3. Angela Reyes — `Neighborhood_Demographics` (`Students`, `SchoolQualityIndex`, `GraduationRate`, `CollegeReadinessRate`, `TeacherQuality`, `Funding`) per hood + this cycle's `Youth_Events` (`YouthName`, `Age`, `EventType`, `School`, `Outcome`). "Which school is doing well" is answerable from `SchoolQualityIndex` ranked.
  4. Dr. Lila Mezran — `Neighborhood_Demographics.Sick` per hood (the volume) + `Health_Cause_Queue` (`Name`, `AssignedCause`, `CyclesSick`, `Neighborhood`) + `Hospital_Ledger` (`Name`, `Cause`, `StatusNow`). Note in the slice when the named rows are few (3 today) so she writes the neighborhood, not a fake ward.
  5. Noah Tan — `Cycle_Weather` this cycle + streak (`Type`, `Temp`, `Impact`, `Advisory`, `Comfort`, `Mood`, `Streak`, `StreakType`).
  6. Elliot Graye — `Faith_Organizations` (`Organization`, `FaithTradition`, `Neighborhood`, `Congregation`, `Leader`, `MembersList`) + `Community_Programs` (`Name`, `Founder_POPID`, `Type`, `Status`).
  7. Every builder: fail loud on missing dump (Task 2 step 4 wording); `desk_signal` becomes an optional pointer list, not the source.
- **Verify:** each builder `--cycle 106` emits a slice whose `facts[]` entries resolve to a dump row; `node scripts/run-tests.js Slice` → pass
- **Status:** [ ] not started

### Task 5: Approach strings rewritten per §13 — owner research-build (files), spec here

- **Files:**
  - `scripts/build*Slice.js` APPROACH constants · `scripts/buildCivicDomainSlice.js` `CIVIC_SEATS[*].approach/hook` · `scripts/cron-desk-run.js` STANCE lines (~800–900)
- **Steps:**
  1. Strike: "use only packet-backed … facts", "choose one packet-backed incident", "Packet-named … only", "never invent scores, students" (keep "never invent a *named* student" — identity is a fact; a score trend is color unless it lands in a ledger), `colorRoom` "carries no … sentiment".
  2. Standard tail on every approach: *"Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent people or places. Everything else about this beat — what it looks like, who is there, what they want and hate — is yours to paint."*
- **Verify:** `grep -nE "packet-backed only|Packet-named .* only|carries no incident fact" scripts/build*Slice.js scripts/cron-desk-run.js` → no matches
- **Status:** [ ] not started

### Task 6: Write-stage gate audit — owner research-build

- **Files:**
  - `scripts/cron-desk-run.js` write stage (`--gate-backend api`, the Rhea gate) — read; `lib/` quote-wall / number checks it calls — read
- **Steps:**
  1. Enumerate every check the 18:15 write gate applies. Classify each as fact-layer (citizen/business/place identity, roster, vote record) or color (numbers in prose, sentiment, scene).
  2. Color checks get the civic.35 treatment (move or delete); fact checks stay. Record the table in this plan's Changelog.
- **Verify:** a test article with an invented crowd size and a real citizen passes; one with an invented citizen name fails
- **Status:** [ ] not started

### Task 7: Rota = every journalist once per cycle, on a themed week — builder-ruled S433

- **Files:** `scripts/newsroom-fanout.js` (`quotas`, `boundDailyAssignments`), `scripts/cron-desk-run.js` (fanout stages)
- **Ruling (Mike, 2026-09-07):** each journalist gets their own slice and files one article per cycle. Nothing in the ledgers is confidential — health covers who is in `Hospital_Ledger`, business covers `Casino_Ledger` activity. Nia Rook writes every day the Undocked show runs (daily 20:30 cron). Days carry themes so the news reads differently day to day: civic / business / health / sports / transit early in the week, nightlife / culture Friday; sports has four seats across Mon–Thu counting the Oaks reporters; civic may carry a second reporter. City hall is a function, not a city.
- **Engine input already there:** `Story_Seed_Deck` (184 rows: Cycle, SeedID, Desk, Class, Domain, Neighborhood, What, Why, **Citizens, CitizenEvents, Businesses**, Magnitude, Trend) and `Story_Hook_Deck` (1,716 rows incl. **SuggestedJournalist**, SuggestedAngle) are the engine's own per-desk seeds with citizens and businesses attached. Add both to the Task 1 dump; each journalist's slice opens with their seeds for the cycle.
- **Draft week grid for the builder's yes/no (one slot = one journalist = one article; Nia daily on top):**

| Day | Seats |
|---|---|
| Mon | Carmen Delaine (civic ledger) · Jordan Velez (business + casino) · Dr. Lila Mezran (health, hospital rows) · Trevor Shimizu (transit) · Anthony Raines (A's) |
| Tue | Luis Navarro (investigations) · Sgt. Rachel Torres (safety) · Angela Reyes (schools) · Selena Grant (Oaks) |
| Wed | Jax Caldera (accountability) · Noah Tan (environment) · Elliot Marbury (data desk) · P Slayer (fan pulse) |
| Thu | Elliot Graye (faith) · Simon Leary (sports as civic architecture) · Hal Richmond / Tanya Cruz alternating (A's) · Talia Finch (Oaks, the street) |
| Fri | Mason Ortega (food) · Kai Marston (arts, nightlife) · Sharon Okafor (lifestyle) · Maria Keen (neighborhood) · Celeste Tran (social trends — seat exists on the ledger, no writer agent yet) |

  ≈22 slots/week + Nia ×5 ≈ 27 articles, down from 35 attempts; every seat exactly once. Unseated ledger journalists (Farrah Del Rio, Reed Thompson, Lena Carrow, Dana Reeve, the OakTown Echo six) stay off the rota until they have a voice agent.
- **Steps:**
  1. Replace desk quotas with a day→seats table (above, once ruled), each seat bound to its beat slice (Tasks 2–4) and its `Story_Seed_Deck` rows.
  2. Nia keeps the undocked lane, daily.
  3. Baseline for before/after (S433): 14 days, most reporters 1 byline, Nia 4, Jordan 3; 70 attempts, 35 staged, 35 flagged.
- **Verify:** first full cycle after cut: `output/cron-compare/staged|flagged` sidecars show every rota seat exactly once, on its day.
- **Status:** [ ] awaiting builder yes/no on the grid

### Task 7b: Article latency — audit, then cut

- **Current:** one article spans three wakes, angle 06:15 → report 13:15 → write 18:15 (12 h). Builder: too slow, and the civic articles read alike week to week.
- **Steps:** measure per-stage value on the last 14 days of sidecars (what the report stage adds that the angle stage lacked); propose collapsing to one wake per article where the beat slice already carries the citizens (Tasks 2–4 make the report stage's citizen-quote hunt largely redundant). Decision recorded here before cutting.
- **Status:** [ ] not started

### Task 8: Docs — same commit as Task 1

- **Files:** `docs/media/charge_brief_template.md` (LOCKED #1 note: superseded for the cron path per §13, kept for CLI-era retrieval), `docs/index.md` (this plan registered), `docs/engine/ROLLOUT_PLAN.md` pipeline.68
- **Verify:** `grep -c "beat-slices-from-sheets" docs/index.md` → 1
- **Status:** [ ] not started

---

## Open questions

- [ ] Task 4: extend `buildCivicDomainSlice.js`'s packet model or split per-beat builders — decide at Task 4 start from the packet code, not here.

---

## Changelog

- 2026-09-07 — Initial draft (S433 engine-sheet, drafted from the facts-not-color ruling and the desk-signal audit the same night).
