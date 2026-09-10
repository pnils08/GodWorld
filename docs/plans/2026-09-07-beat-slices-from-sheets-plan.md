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
- **Status:** [x] DONE S433 — ran live at C106: 14 tabs (Youth_Events dropped, dead by ruling since C102), readback line counts = meta for all, backward stamp (105) refused. Wired into run-cycle Step 5.56. Acceptance 1 is met on the next run-cycle.

### Task 2: Business / food slice reads the ledger — owner research-build (file), spec here

- **Files:**
  - `scripts/buildEconomicSlice.js` — modify (source + APPROACH)
  - `scripts/buildEconomicSlice.test.js` — modify
- **Steps:**
  1. Source: `output/beats/Business_Ledger.jsonl` joined to `output/beats/Employment_Roster.jsonl` on `BIZ_ID` (`Status` active rows), giving each business its named staff (`CitizenName`, `RoleType`, `POP_ID`). `desk_signal` business lane stays as the "what moved" pointer list only.
  2. Slice shape: pick ONE neighborhood (rotate least-recently-covered, from `output/reporters/` bylines), list 3–5 of its businesses with `Sector`, `Employee_Count`, `Growth_Rate`, `Key_Personnel`, and up to 4 named staff each. Add a `foodFilter` mode (Sector matching restaurant/food/hospitality vocab — read the live `Sector` values before writing the regex) for Mason Ortega.
  3. Replace `ECONOMIC_APPROACH` per §13: *facts* = the business names, hoods, sectors, staff names and roles on this slice (never invent a storefront or a worker); *color* = everything else — what the counter looks like on a Tuesday, who the regulars are, what the owner is worried about. Drop "do not lead with raw engine decimals" framing entirely; there are no decimals to lead with.
  4. `output/beats/` missing → `throw new Error('beat dump missing: run scripts/dumpBeatTabs.js <cycle>')`. No fallback to the signal-only slice.
- **Verify:** `node scripts/buildEconomicSlice.js --cycle 106` (and `--food`) → slice with ≥3 businesses and ≥3 roster workers present in the dump; `node scripts/run-tests.js --filter=buildEconomicSlice` → pass
- **Status:** [x] DONE S434 (engine-sheet, Mike-direct takeover) — live at C106: business variant picked West Oakland (12 named workers at 3 named businesses), food variant Jack London (6 named workers at 2 named kitchens); stale-dump refusal verified (`--cycle 107` exits 2 naming both cycles). Decisions recorded in the Changelog.

### Task 3: Mason Ortega draws the food slice — owner research-build (file), spec here

- **Files:**
  - `scripts/cron-desk-run.js` — modify (~line 823 stance block; the culture-consumer evening pack at ~881 stays for Kai/Sharon/Maria/Graye)
- **Steps:**
  1. When `persona.name` is Mason Ortega: load `loadEconomicSlice(cycle, { foodFilter: true })` instead of the evening pack; STANCE becomes "kitchens as workplaces — the people on this slice are real, the rest of the room is yours."
  2. Remove "Packet-named workers only." (the drone line).
- **Verify:** the angle stage has no dry-run (only the write stage does), so the proof is the typed packet built offline: `livedExperiencePacketV2.buildAnglePacket({ story, approach, slice: loadEconomicSlice(106, ROOT, { foodFilter: true }) })` → `task.creativeBrief.workplaces` names ≥1 `Business_Ledger.Name` and `exposure.candidates` carries ≥1 `Employment_Roster` POP_ID
- **Status:** [x] DONE S434 — Mason's W1 packet at C106: Jack London, workplaces Harborline Grill / Blue Lantern Bar / Green & Gold Tavern / Jack London Square Markets / Dockhouse BBQ, 9 interview candidates all from the roster (Tomas Renteria, Quynh Le, Jalen Hill, Bruce Wright, Yuki Ji, Guadalupe Lee + 3 seed citizens), 9 known FACTs sourced to the dump. Business desk W1 at C106: West Oakland, 12 candidates. Live proof: the first unattended rota that seats Mason or the business desk.

### Task 4: The folded beats get their own slices — owner research-build (files), spec here

- **Files:**
  - `scripts/buildSafetySlice.js` — modify · `scripts/buildCivicDomainSlice.js` — modify (Trevor, Lila, Noah, Angela packets) · `scripts/buildTransitSlice.js`, `scripts/buildSchoolsSlice.js`, `scripts/buildHealthSlice.js`, `scripts/buildEnvironmentSlice.js`, `scripts/buildFaithSlice.js` — create only if `buildCivicDomainSlice.js`'s packet model can't carry the tab data cleanly (decide at Task 4 start, note the decision in Changelog)
- **Steps (tab.column per seat):**
  1. Trevor Shimizu — `Transit_Metrics` rows for this cycle vs `prev/`: per `Station`/`Corridor`, `RidershipVolume`, `OnTimePerformance`, `TrafficIndex` deltas; `Notes` verbatim. Fact = stations, corridors, numbers on the slice. Color = the platform at 7:40.
  2. Sgt. Rachel Torres — `Crime_Metrics` per `Neighborhood` (`PropertyCrimeIndex`, `ViolentCrimeIndex`, `ResponseTimeAvg`, `ClearanceRate`, `IncidentCount`) with deltas vs `prev/`; `desk_signal` incidents as pointers. Delete `scene.colorRoom: 'carries no incident fact, quote, or public sentiment'`.
  3. Angela Reyes — `Neighborhood_Demographics` (`Students`, `SchoolQualityIndex`, `GraduationRate`, `CollegeReadinessRate`, `TeacherQuality`, `Funding`) per hood, ranked — "which school is doing well" is answerable from `SchoolQualityIndex`. **`Youth_Events` is dead by ruling** (`phase05-citizens/runYouthEngine.js:105`, last row C102) and is deliberately NOT in the dump; students she names come from `Simulation_Ledger` snapshot rows with student roles in the hood, not from that tab.
  4. Dr. Lila Mezran — `Neighborhood_Demographics.Sick` per hood (the volume) + `Health_Cause_Queue` (`Name`, `AssignedCause`, `CyclesSick`, `Neighborhood`) + `Hospital_Ledger` (`Name`, `Cause`, `StatusNow`). Note in the slice when the named rows are few (3 today) so she writes the neighborhood, not a fake ward.
  5. Noah Tan — `Cycle_Weather` this cycle + streak (`Type`, `Temp`, `Impact`, `Advisory`, `Comfort`, `Mood`, `Streak`, `StreakType`).
  6. Elliot Graye — `Faith_Organizations` (`Organization`, `FaithTradition`, `Neighborhood`, `Congregation`, `Leader`, `MembersList`) + `Community_Programs` (`Name`, `Founder_POPID`, `Type`, `Status`).
  7. Every builder: fail loud on missing dump (Task 2 step 4 wording); `desk_signal` becomes an optional pointer list, not the source.
  8. Decks are cumulative — `Story_Seed_Deck` C101→C106 (44 rows at C106), `Story_Hook_Deck` C68→C106 (39 at C106, 1,716 total): **filter by `Cycle === current`** before handing anything to a reporter. A seed's `What`/`Why` are engine-metric strings ("sentiment +48.03", "traffic/retail +0.26") — use `Citizens`, `Businesses`, `Neighborhood`; never quote the `What` as a fact in prose (canon-is-color rule). `Transit_Metrics` carries 18 station rows per cycle, so this-cycle-vs-`prev/` is real.
- **Verify:** each builder `--cycle 106` emits a slice whose `facts[]` entries resolve to a dump row; `node scripts/run-tests.js --filter=beatSlices` → pass
- **Status:** [x] DONE S434 — **one builder and one artifact per journalist** (ruling: every journalist gets their own slice): `scripts/buildTransitSlice.js` (Trevor), `buildHealthSlice.js` (Lila), `buildSchoolsSlice.js` (Angela), `buildEnvironmentSlice.js` (Noah), `buildFaithSlice.js` (Graye), `buildSafetySlice.js` rewritten (Rachel); shared mechanics in `scripts/beatSliceKit.js`. Live at C106: Trevor 19 facts / 9 transit workers; Lila Chinatown 125 sick / 5 named; Angela Rockridge index 9 / 10 students+educators; Noah overcast 52°F / 4 residents; Graye Bay Pure Land Buddhist Temple / Rev. Kenji Tanaka; Rachel Downtown 14 incidents / 1 staff. Each seat's LEP/2 packet built offline: brief `beat-slice`, every fact a known FACT with its source, candidates = the slice's people.

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

  ≈22 slots/week + Nia ×5 ≈ 27 articles, down from 35 attempts; every seat exactly once.
  **Off the rota by ruling (Mike, S433):** the OakTown Echo six are a background competitor — they never publish, they run on the civic clock; the podcast hosts belong to a separate skill that is not run; photographers, photo assistant, Data Analyst (Ariana) and Copy Chief (Rhea) are roles, not writers. Bay Tribune seats with no voice agent (Farrah Del Rio, Reed Thompson, Lena Carrow, Dana Reeve, Celeste Tran) stay off until seated.
- **Steps:**
  1. Replace desk quotas with a day→seats table (above, once ruled), each seat bound to its beat slice (Tasks 2–4) and its `Story_Seed_Deck` rows.
  2. Nia keeps the undocked lane, daily.
  3. Baseline for before/after (S433): 14 days, most reporters 1 byline, Nia 4, Jordan 3; 70 attempts, 35 staged, 35 flagged.
- **Verify:** first full cycle after cut: `output/cron-compare/staged|flagged` sidecars show every rota seat exactly once, on its day.
- **Status:** [x] CUT S434 — `WEEK_GRID` in `scripts/newsroom-fanout.js` replaces desk quotas + LRU (Mon Carmen/Jordan/Lila/Trevor/Anthony · Tue Luis/Rachel/Angela/Selena · Wed Jax/Noah/P Slayer · Thu Graye/Simon/Hal|Tanya by week parity/Talia · Fri Mason/Kai/Sharon/Maria); Nia daily on top when an episode is un-recapped; Jax seated seedless so his stink slice builds at the wake, no forced extra slot. Elliot Marbury has no wake package and Celeste Tran no voice agent — both off until seated. Dry-built in memory Mon–Fri 09-07 → 09-11: every grid seat lands except Selena/Talia (see Changelog).

### Task 7b: Article latency — audit, then cut

- **Current:** one article spans three wakes, angle 06:15 → report 13:15 → write 18:15 (12 h). Builder: too slow, and the civic articles read alike week to week.
- **Steps:** measure per-stage value on the last 14 days of sidecars (what the report stage adds that the angle stage lacked); propose collapsing to one wake per article where the beat slice already carries the citizens (Tasks 2–4 make the report stage's citizen-quote hunt largely redundant). Decision recorded here before cutting.
- **Status:** [ ] not started

### Task 7c: Canon = published only — builder-ruled S433, CUT

- **Files:** `scripts/cron-saturday-run.js` `stepSweep` — modified S433
- **Ruling (Mike, 2026-09-07):** published articles are canon; no paying to canonize copy that isn't used. The Saturday sweep (step 5) now upserts only `edition_curation_c{N}.selected` stems to Supermemory; missing curation fails loud. Steps 6 (Citizen_Media_Usage credits) and signals still read the full staged set — not ruled on; flag if a citizen quoted only in an unpublished article should earn no credit.
- **Verify:** `node scripts/cron-saturday-run.js --step sweep --cycle 105` (dry) → scope = curated count, not staged count. Live proof: Saturday 09-13 16:00 run.
- **Status:** [x] cut S433; live proof Saturday

### Task 8: Docs — same commit as Task 1

- **Files:** `docs/media/charge_brief_template.md` (LOCKED #1 note: superseded for the cron path per §13, kept for CLI-era retrieval), `docs/index.md` (this plan registered), `docs/engine/ROLLOUT_PLAN.md` pipeline.68
- **Verify:** `grep -c "beat-slices-from-sheets" docs/index.md` → 1
- **Status:** [ ] not started

---

## Open questions

- [ ] Task 4: extend `buildCivicDomainSlice.js`'s packet model or split per-beat builders — decide at Task 4 start from the packet code, not here.

---

## Status log

### pipeline.68 — status (drained from ROLLOUT, 2026-09-07 / S436)

Beat slices from Sheets (§13). T1 dump (ac808611) · T2 economic/food slice (662e614d) · T3 Mason + packet-v2 wiring (6860e07f) · T4 one builder + artifact per journalist: transit/health/schools/environment/faith/safety (1e1f0ead) · T7 WEEK_GRID rota, seat-scoped failure (69396c28, a553ca9c) — all LIVE 2026-09-07. Open: T5 approach strings (non-beat seats), T6 write-gate audit, T7b latency, T8 docs. Acceptance = unattended Mon–Fri rota from 2026-09-07

## Changelog

- 2026-09-07 — Initial draft (S433 engine-sheet, drafted from the facts-not-color ruling and the desk-signal audit the same night).
- 2026-09-07 — Task 1 cut and verified live (S433): `scripts/dumpBeatTabs.js`, 14 tabs incl. Story_Seed_Deck / Story_Hook_Deck / Casino_Ledger, run-cycle Step 5.56 wired. Tasks 2–7 handed to research-build (their files).
- 2026-09-07 — Tasks 2–7 taken back by engine-sheet (S434, Mike-direct). **Task 2 cut**: `scripts/buildEconomicSlice.js` rewritten (v `ECONOMIC-SLICE-2`); the world_summary parsers (trajectory / retail-decay / evening-venue / initiative) are gone — they fed the crisis lane the plan's Goal moves away from. Decisions from the C106 dump: (1) **hood pool = hoods with ≥1 business carrying ≥1 Active roster worker** — only 39/176 businesses have roster staff and the 6-per-hood ledger fill (Glenview, Ivy Hill, Eastlake…) has none, so an unrestricted pick fails Acceptance 2 by construction; `City-wide` is an org address, never a hood. (2) **Rotation source is prior slice artifacts** (`output/cron-compare/economic_slice_c*.json`, `pulse.hood`) — `output/reporters/` does not exist; the plan's Acceptance 2 path should read `output/cron-compare/staged/`. (3) **Food sectors** (live strings): Restaurant & Dining, Cafe / dining, Cafe / gallery, Food & Beverage, Fast Food & Quick Service, Sports Bar & Dining, Retail & Food, Nightlife & Entertainment, Bar / nightlife, Bar / lounge, Hospitality — 52 rows, 5 staffed (Blue Lantern Bar, OakTown Social, OakHouse, Harborline Grill, Fruitvale Diner), food pool = Jack London / Temescal / Rockridge / Fruitvale. (4) **Business variant excludes** Municipal Government, Public Transit/Services/Safety, Legal & Judicial, faith bodies, Community Development, Transit & Infrastructure, Housing & Social Services, Media & Journalism, Crisis Response and the sports franchises — first live pick was Downtown with City of Oakland + Bay Tribune as its "businesses", then Baylight with the A's; civic gravity is drift, the teams are the sports desks'. (5) `story.citizens` is `"Name (POP-xxxxx)"` — the shape `citizenBrief` (cron-desk-run) parses into the AFFECTED CITIZENS line; every Active worker on the slice plus this cycle's seed citizens. (6) **Fail loud**: missing dump, stale-cycle dump (stable filenames, so `meta.cycle` must equal the requested cycle) and a missing tab all throw naming `dumpBeatTabs.js <cycle>`; `enrichAssignment` no longer swallows. Roster join = `Status === Active` + ledger `BIZ_ID` (the 66 `unmatched` rows are all `UNTRACKED`, so nothing mis-attaches). Story_Seed_Deck business seeds for the cycle ride along (citizens + businesses + the engine's colour lines, never the `What` metric). Cache keyed on version + variant (`economic_food_slice_c{N}.json` for Mason).
- 2026-09-07 — **Task 4 first attempt REVERTED** (S434): four seats were folded into the shared civic-domain builder as per-seat packets — one file for six reporters with a scoring pass in the middle. Mike: "I thought I said every journalist gets their own slice." Reverted with git checkout; nothing of it survives.
- 2026-09-07 — **Task 4 cut per journalist** (S434). Six files, six artifacts (`output/slices/c{N}/<slug>.md` + `output/cron-compare/<beat>_slice_c{N}.json`), no ranking against any other seat. Mechanics shared through `scripts/beatSliceKit.js` (dump load, roster-by-BIZ_ID join — never a RoleType regex: "BART Bar" bartenders and a "Vertical Farm **Systems** Engineer" were the traps — hook-deck lookup, cache-by-version, markdown, enrich, CLI). Rules: Transit_Metrics and Cycle_Weather are cumulative in-table (this cycle vs last available now); Crime_Metrics and Neighborhood_Demographics are snapshots, so deltas need `output/beats/prev/` and until it exists the slice says `NO_PRIOR_CYCLE`; a pro athlete on Hospital_Ledger is a sports story; Angela's students come from the ledger snapshot in the lead hood, and the lead hood alternates top/bottom of the school table by cycle parity; Graye's congregation rotates by cycle number through the active list. Wiring: `cron-desk-run.js` routes the six to their builders (`BEAT_BUILDERS`), Graye leaves the evening pack, Rachel's old safety branch is gone, the typed packet gets a `beat-slice` brief (`livedExperiencePacket.js`); `newsroom-fanout.js` enriches the six per seat. **Failure scope (Mike-direct, "the daily news arrives, period"): a builder that throws drops THAT seat with a loud `[fanout] SEAT DROPPED` line; the rest of the rota runs. The run never dies for one seat.** The Task 3 economic block was changed to the same rule. The shared civic-domain builder now serves Carmen and Luis only at runtime (its `CIVIC_SEATS` table still lists the four; trimming it is a follow-up, not a runtime concern).
- 2026-09-07 — **Found on the way, fixed for the news, needs one sheet write (S434):** pipeline.67 activated Selena Grant (POP-00591) and Talia Finch (POP-00592) as daily wake packages on 09-06 but never added them to the `Bay_Tribune_Oakland` tab, which the fanout checks every package against. Unfixed, the next 06:15 fanout would have thrown `active wake package absent from canonical byline roster` and no article would have run that day. The fanout now drops such a seat loudly instead of dying. The two rows (`POP-00591 | Selena | | Grant | 2 | Journalist - The Oakland Oaks Beat Reporter`, `POP-00592 | Talia | | Finch | 4 | Journalist - The Oakland Oaks Ground Reporter`) still need to be appended to the tab — the append was blocked by the session's permission gate; until they land, Selena (Tue) and Talia (Thu) sit out.
- 2026-09-07 — **Task 3 cut** (S434). The live wake contract is packet-v2: the free-text `ask` in `cron-desk-run.js` is overwritten by `livedExperiencePacketV2.buildAnglePacket`, so the slice reaches the reporter through (a) `slice.prewrite.anchorFacts` → `known` FACTs (with `prewrite.evidence` giving each its dump source), (b) `slice.citizens` → `exposure.candidates` (every roster worker on the slice, profile "Name — Role — Business, Hood"), (c) a `creativeBrief` branch in `scripts/livedExperiencePacket.js` for kinds `economic-storefront` / `food-workplaces` (hood, workplaces with roster names, the engine's colour lines, "the room is yours"). `cron-desk-run.js`: Mason removed from `EVENING_SLUGS` and the evening-pack prompt regex; business desk and `mason-ortega` load the slice (food variant for Mason) with no try/catch — a missing or stale dump throws the wake; stance line rewritten ("the people on this slice are real, the rest of the room is yours"); the lane-state block and the legacy free-text ask rewritten to the new shape; the angle artifact records `businesses` / `seeds` / `rotation` instead of the dead `texture`. `newsroom-fanout.js`: Mason joins the economic enrich (food) and is skipped by the evening enrich; the enrich rethrows instead of logging "skipped" — with no dump the fanout fails, which is the ruled behaviour (Acceptance 3). Ledger oddity seen on the way, not touched: Oakmesh Systems' roster carries a construction laborer and a plumber (Employment_Roster mapping, engine-side).
- 2026-09-10 (kimi) — **Faith lane deep-dive (builder-directed lane program):** `Faith_Ledger` added to the Task 1 dump (15 tabs); `buildFaithSlice.js` v FAITH-SLICE-2 leads with the last 7 cycles of Faith_Ledger events (weekly seat, crisis/holy-day first), adds event-org leaders to the record, and picks up FAITH-domain hooks by domain — the engine's `storyHook.js` deskMap misroutes them all to "City Desk" and `buildContractSeeds.js` stamps faith seeds `COMMUNITY→culture` (engine-side cuts filed for engine-sheet: `docs/for-claude-review/2026-09-10-kimi-faith-lane-routing.md`). POPID bug fixed: the slice's SEAT said POP-00159 — that is Sharon Okafor; the ledger's Graye is POP-00012 (rosterLookup had it right). Graye's cron STANCE loses "Packet institutions only" (§13). Note: the slice fails loud on Faith_Ledger until the dump re-runs.
- 2026-09-10 (kimi) — **Business lane deep-dive (builder-directed lane program):** `Business_Archive` added to the dump as an OPTIONAL tab (lazy-created per engine.119 — absent on the sheet dumps empty, never aborts; 16 tabs). `buildEconomicSlice.js` v ECONOMIC-SLICE-3: movement facts vs `prev/` (headcount/revenue deltas, typed NO_PRIOR_CYCLE until C107), closures from Business_Archive + prev-diff ("gone, no archive row" reported, not silenced), contraction watch (shedding + growth ≤ 0, business variant), casino section (S433 ruling: business covers the casino — ledger-tracked patrons only, house float), BUSINESS/Jordan Velez hooks consumed (the builder had no hooksFor call), Key_Personnel POPID tags stripped from fact lines (was leaking `POP-00789` into the C106 slice). Engine-side filed for engine-sheet (`docs/for-claude-review/2026-09-10-kimi-business-lane-lifecycle.md`): closure world-events are stamped `domain: 'COMMUNITY'` and ≥10-job closures (severity high) get no hook at all — the biggest business story routes away from the business desk; closures emit no ripples so they never seed. Builder rulings requested: "Community Services" sector exclusion (C106 slice led with West Oakland Community Center); the Monday seat slug is `business-desk`, not `jordan-velez`.
- 2026-09-10 (kimi, captured by research-build S442 from the kimi pane — kimi hit its weekly quota wall mid-lane and wrote nothing to disk) — **Education lane audit (Angela Reyes, `buildSchoolsSlice.js`), diagnosis only, no fixes applied.** (1) **The school table is frozen backfill:** nothing in the engine drifts `SchoolQualityIndex` / `GraduationRate` / `CollegeReadinessRate` / `TeacherQuality` / `Funding` on Neighborhood_Demographics — backfilled once by script, no phase touches them; half of Angela's cycles are "weakest school" stories off static data. (2) **Routing is faith-class broken twice:** `storyHook.js` deskMap sends EDUCATION hooks to an "Education Desk" no roster carries; those hooks are `hookType: 'demographic'`, mapped to the community signal before the education signal is consulted, so from C84 they pre-match Sharon Okafor, never Angela; DROPOUT_WAVE alerts bypass `makeHook` and land with no desk and no journalist, re-alerting identically every cycle (West Oakland 62% forever). (3) **What actually moves:** per-hood `Students` counts drift every cycle (population engine) and the slice does not use them; age-18 graduation/dropout credentials mint onto ledger Education fields and are never surfaced; citizen education LifeHistory texture (≤10 events/cycle) is never read. (4) **Ledger:** OUSD is BIZ-00016 (5,201 employees) with `Annual_Revenue: "-15"`; nobody joins district data to the per-hood Funding column; the roster is mis-mapped — 12 of 29 active BIZ-00016/00035 rows are off-role: POP-00040 City Manager, POP-00198/00267/00649 line cooks, POP-00217 Plumber, POP-00226 Bakery worker, POP-00239 Mover, POP-00532/00631 Youth Basketball Coach, POP-00539 Actor, POP-00641 Taxi Driver, POP-00743 Grade Schooler (BirthYear 2030, CareerStage student). All `MappingLayer: existing` — `EmployerBizId` was already on the sheet; 9/12 carry SkillTags `Education`, so the field tag, not the job, placed them. Filed **engine.191**. Also canon.5 still holds the BIZ-00016 rename (OUSD → Oakland City Schools). (5) Slice `desk: 'civic'` vs rosterLookup `culture` — kimi's own question, unruled. **Kimi's proposed course (not started):** scripts-side — `buildSchoolsSlice.js` v2 consumes EDUCATION + DROPOUT_WAVE hooks by domain, leads with Students deltas vs `prev/`, adds an OUSD district card, widens the people pool to educators citywide; engine-side — deskMap EDUCATION to a desk that exists + the demographic→community short-circuit, DROPOUT_WAVE normalization carries desk/journalist, and **a school-drift pass (quality/graduation off hood pressure, funding, initiatives)** — a design decision kimi answered itself ("propose drift engine") via its own prompt; **that is the builder's call, not kimi's.** Engine routing cuts wait on that ruling; they are the same shape as engine.189.
