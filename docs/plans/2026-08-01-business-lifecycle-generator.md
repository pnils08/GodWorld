---
title: Business Lifecycle Generator Plan
created: 2026-08-01
updated: 2026-08-01
type: plan
tags: [engine, economy, citizens, media, active]
sources:
  - docs/research/2026-08-01-simulation-realism-audit.md — verdict adopt, build-order item 6 (the one genuinely undesigned gap); builder approved the row 2026-08-01
  - docs/plans/BACKLOG.md §27.10 (negative feedback loops, HIGH, Grok review S139) and §27.7 (delayed-fuse seeds, adjacency)
  - phase05-citizens/applyChaosDecay.js — the only existing per-cycle Business_Ledger economic writer (pattern to copy)
  - phase05-citizens/runCareerEngine.js v2.6/v2.7 — Employee_Count write-back + rehire matcher; reads Growth_Rate as the hiring signal (:1081-1082)
  - scripts/ingestPublishedEntities.js economicSeedForSector() — mint-time seeding; Growth_Rate is never written again after mint
  - docs/research/godworld_city_functions_analysis_2026-04-20.pdf — Phase 43 city-functions analysis (5-domain priority order)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (engine.96)"
  - "[[../research/2026-08-01-simulation-realism-audit]] — research basis; this plan is build-order item 6"
  - "[[2026-07-27-employment-living-system]] — engine.85, business BIRTH (mint) stays there; this plan owns decline/death"
  - "[[2026-07-31-citizen-memory-perception]] — engine.94 Track A owns the scandal-ceiling slice of 27.10; not duplicated here"
  - "[[../research/2026-07-29-citizen-archive]] — the Citizen_Archive pattern this plan mirrors for businesses (builder-generalized to all sim exits 2026-08-01)"
  - "[[../adr/0015-world-config-tunable-values]] — tunables live in World_Config (migrate-on-touch); this plan's Task 3 is the ADR's first application"
  - "[[2026-07-31-platform-ceiling-resilience]] — engine.95 Task 4 (checkpoint/resume) is the platform prerequisite for heavy engine additions"
  - "[[SCHEMA]] — doc conventions"
  - "[[../index]] — registered same commit"
---

# Business Lifecycle Generator Plan

**Goal:** Businesses in `Business_Ledger` live on a per-cycle economic trajectory — `Growth_Rate` and `Annual_Revenue` drift with city state, sustained decline produces layoffs through the existing career-engine path, and terminal decline produces a closure the newsroom can report — so success has consequences and no economic figure stays mint-static.

**Architecture:** One new per-cycle evaluator, `phase05-citizens/applyBusinessDynamics.js`, modeled on `applyChaosDecay.js` (the only existing per-cycle `Business_Ledger` economic writer: reads the sheet directly, queues cell intents via `queueCellIntent_`, fails loud on missing columns). It drifts `Growth_Rate`/`Annual_Revenue` from city state plus tunable thresholds held as **`World_Config` key→value rows** (Mike ruling 2026-08-01: tunables live in the sheet, not in code — `loadConfig_` at `phase01-config/godWorldEngine2.js:591-608` already loads every World_Config row into `ctx.config` with numeric parsing, so tuning is a cell edit, never a deploy), routes decline into the *existing* layoff/rehire machinery (`runCareerEngine` businessDeltas → Phase-6 `economicRippleEngine` narration), and emits closure events into `worldEvents` for the desks. **Everything-is-earned doctrine (Mike, 2026-08-01):** no static/free numbers anywhere in this design — every drift modifier derives from live sim state (retail vitality, approval trends, coverage, competitive density). Static fallbacks of the 0.91-employment / uniform-8%-growth class are the disease this plan kills; it must not introduce new ones. Birth is explicitly out of scope: engine.85 Task 8 already mints businesses economically alive. Scandal ceilings are explicitly out of scope: engine.94 Track A owns that slice of BACKLOG 27.10. This plan owns the remaining 27.10 items — business death, outside-investment disruption, success-pressure coupling — the audit's one genuinely undesigned gap.

**Terminal:** Design + config research-build → engine code engine-sheet.

**Sequencing (audit build order):** after engine.83/84 (reconciliation — kills the static-economy bug class this extends), engine.93, engine.94 Track A, and engine.85 (hire/fire write-back — this plan's decline path rides it). engine.95 Task 4 (checkpoint/resume) is the platform prerequisite for any heavy engine addition; this plan's per-cycle pass must be measured against the engine.95 instrumentation before deploy.

**Acceptance criteria:**
1. Every `Business_Ledger` row's `Growth_Rate` and `Annual_Revenue` move per cycle from city state — no value stays mint-static. Bench output is deterministic (seeded, no wall-clock).
2. A business pushed into sustained decline sheds headcount through the *existing* `runCareerEngine`/`economicRippleEngine` path — this plan adds no second headcount writer.
3. A business crossing the closure threshold emits a `worldEvents` closure event the desks can report, and its workers enter the existing rehire matcher as unemployed (a lived state), not deletion.
4. The pass's cycle-time cost is measured against engine.95's per-phase instrumentation and documented in this plan's changelog before deploy.

---

## Tasks

### Task 1: Establish the layoff-trigger contract (read-only)

- **Files:**
  - `phase05-citizens/runCareerEngine.js` — read (:1050-1290, the v2.6 write-back + v2.7 matcher)
  - `docs/research/2026-07-27-employment-as-a-living-system.md` — read (the layoff/businessDeltas design)
- **Steps:**
  1. Determine exactly what causes `runCareerEngine` to emit a layoff today. Specifically: does a negative `Growth_Rate` on a `Business_Ledger` row already produce layoffs via the openings formula (:1081-1082), or is an explicit decline signal required?
  2. Record the answer in this plan's Build notes (Task 3 step 5 consumes it) — Task 6's shape depends on it.
- **Verify:** the answer is written down with a `runCareerEngine.js` line reference; if negative growth already lays off, Task 6 shrinks to "write the drifted value and let the existing engine fire."
- **Status:** [x] DONE 2026-08-01 (Kimi, read-only) — **negative Growth_Rate stops hiring but never fires anyone.** `matchUnemployedToOpenings_` skips any business with `growth <= 0` (`runCareerEngine.js:1163`); firings happen ONLY in `reconcileBusinessHeadcounts_` Half 2, when *stated* `Employee_Count` falls below the *tracked* count (:1284+). So Task 6 takes the explicit-signal branch: the dynamics pass must emit `careerSignals.businessDeltas[bizId].lost` entries; Half 1's write-back (:1271-1282) then lowers the stated count via `queueCellIntent_`, Half 2 converts any stated-below-tracked gap into real firings (LifeHistory + income hit + employer clear), and Phase-6 `economicRippleEngine` narrates the losses. No new headcount writer — the deltas feed the existing machine exactly as designed in engine.85.
- **Full inventory — every consumer tied to these numbers (Mike's question 2026-08-01):**
  - `Growth_Rate`: ONE mechanical consumer — the v2.7 hiring formula (:1163, :1169). Display-only: `buildDeskPackets.js:2293`, `buildInitiativePackets.js:370`, `buildBusinessCards.js`. No threshold, ceiling, or constant anywhere keys off growth values. The dynamics pass can write it freely — worst case is hiring slows, which is the intended behavior.
  - `Annual_Revenue`: one writer (`applyChaosDecay.js:95`, chaos-incident decay), display-only readers. No mechanic reads revenue today — the closure floor in this plan would be the FIRST revenue mechanic. No conflict: chaos decay and the drift pass both multiply revenue down/up; they compose.
  - `Employee_Count`: `runCareerEngine` write-back + pool capacity checks; `linkCitizensToEmployers` overwrite hazard is engine.84's row, not this plan's.
  - Hardcoded tunables already living in this code (ADR-0015 migrate-on-touch candidates when next worked): the ÷52 annualization (:1169), cadence clamps (:1172), rehire income recovery +5–10% / career-change 0.95–1.05 (:1208), poorest-first/cross-field 1-in-4 rules (:1184, :1190). None conflict with the new keys; they are siblings, not overlaps.

### Task 2: Extract the writer pattern (read-only)

- **Files:**
  - `phase05-citizens/applyChaosDecay.js` — read (whole file; the queueCellIntent_ pattern for Business_Ledger)
  - `phase05-citizens/applyChaosDecay.test.js` — read (the bench harness shape: fake sheet, header row, intent assertions)
- **Steps:**
  1. Note the exact call signature of `queueCellIntent_` for `Business_Ledger` cells and the fail-loud header check (`applyChaosDecay.js:82` throws on missing trimmed columns — copy this behavior).
  2. Confirm where `applyChaosDecay_` is invoked in the cycle (which phase calls it) so the new pass lands adjacently.
- **Verify:** invocation site identified by file:line.
- **Status:** [ ] not started

### Task 3: Thresholds as World_Config keys (design — research-build, Mike review)

- **Files:**
  - this plan — the defaults table lives here until Mike signs off
  - `World_Config` sheet — keys appended at implementation time (engine-sheet), NOT a code config file (Mike ruling 2026-08-01: "editing code for this is too much work when a world config can have every variable")
- **Steps:**
  1. Define tunables per BACKLOG 27.10 as `World_Config` key→value rows: drift bounds per sector class (reuse `economicSeedForSector()`'s 9 keyword classes in `scripts/ingestPublishedEntities.js:812+`), decline-streak length before layoffs, closure threshold (N consecutive cycles of negative drift AND revenue below floor), success-pressure window (prosperity sustained 3+ cycles), modifier magnitudes.
  2. Read path already exists — do not build one: `loadConfig_` (`phase01-config/godWorldEngine2.js:591-608`) loads every World_Config row into `ctx.config` with numeric auto-parsing each cycle; the dynamics pass reads `ctx.config.<key>`. Tuning = editing a sheet cell. Missing-key behavior must fail loud at bench, never silently default (a silent default would be the 0.91-fallback disease in a new home).
  3. Everything-is-earned doctrine (Mike, 2026-08-01): defaults are *starting calibration only*; every modifier must derive from live sim state in operation (retail vitality, approval trends, coverage, competitive density), never apply as a bare constant.
  4. Canon constraint (CLAUDE.md prosperity-era doctrine): modifiers are *consequences of success*, never imported recession cynicism.
  5. Include the Task 1 layoff-contract finding in this plan's Build notes.
- **Verify:** key/defaults table in this plan reviewed by Mike before Task 5; at implementation, one bench cycle shows `ctx.config` carrying the new keys.
- **Status:** [x] DONE 2026-08-01 — SIGNED OFF by Mike ("sounds good… I'll trust your concept"). Defaults derived from: sector mint table (`scripts/ingestPublishedEntities.js:815-825` — 9 classes + fallback, mint growth 2–8), live calibration (Task 4: legacy rows uniform 8%, live range 0–40 median 8; vitality observed 6.13–9.27; Mayor approval 95), and the `runCareerEngine.js:1082` convention (Growth_Rate = annual percent; per-cycle effect = value/100/52).

**Drift formula (design, per business per cycle — all draws seeded cycle+BIZ_ID hash):**

```text
EVENT-DRIVEN FIRST (Mike's design concept 2026-08-01: "the engine determines these
numbers based on events — the random mix of events causes the shift in data").
Ambient state + noise are the background; the cycle's event mix is the signal.

eventModifier     = sum over the cycle's events touching this business/hood/sector:
                      chaos incident at the business or in its hood  -> -bizEventShockScale
                      initiative implementation landing in its hood   -> +bizEventShockScale
                        (post-engine.93: S.initiativeNeighborhoodEffects has readers)
                      edition coverage sentiment about the business   -> +-0.5 * bizEventShockScale
                    each source scaled by bizEventShockScale, capped +-2.0 pp total
vitalityModifier  = clamp((hoodVitality - bizVitalityNeutral) * bizVitalityGain, -0.5, +0.5)
successPressure   = -bizSuccessPenalty  IF hood vitality >= bizSuccessVitalityHigh
                    AND mayor approval >= bizSuccessApprovalHigh
                    for bizSuccessWindow consecutive cycles  ELSE 0
disruptionShock   = -bizDisruptShock    IF seededDraw < chance
                    chance = bizDisruptBaseChance/100 * (successWindowActive ? bizDisruptSuccessMult : 1)
noise             = seeded uniform in [-bizNoiseBound, +bizNoiseBound]   // texture only, kept small
drift             = clamp((eventModifier + vitalityModifier + successPressure + disruptionShock + noise)
                          * bizVol_<class>, -bizDriftMaxDown, +bizDriftMaxUp)   // percentage points
Growth_Rate'      = clamp(Growth_Rate + drift, bizGrowthFloor, bizGrowthCeil)
Annual_Revenue'   = Annual_Revenue * (1 + Growth_Rate'/100/52)   // runCareerEngine :1082 convention
distress          = consecutive cycles Growth_Rate < 0  (streak state in companion tab, see note)
closure           = distress >= bizClosureStreak AND
                    Annual_Revenue < bizClosureRevenueFloorPct% of sector mint median
```

**World_Config key table (defaults — Mike review):**

| Key | Default | What it governs |
|---|---|---|
| `bizDriftMaxUp` | 1.0 | Max +pp Growth_Rate move per cycle |
| `bizDriftMaxDown` | 1.0 | Max −pp move per cycle |
| `bizGrowthCeil` | 40 | Growth_Rate ceiling (matches live range top) |
| `bizGrowthFloor` | -10 | Growth_Rate floor |
| `bizNoiseBound` | 0.25 | Seeded noise half-width (pp) |
| `bizVitalityNeutral` | 6.0 | Hood retail vitality at which vitalityModifier = 0 |
| `bizVitalityGain` | 0.15 | pp drift per vitality point from neutral (clamped ±0.5) |
| `bizSuccessWindow` | 3 | Consecutive prosperous cycles before success pressure bites (27.10) |
| `bizSuccessVitalityHigh` | 9.0 | Hood vitality that counts as "prosperous" (Grand Lake reads 9.27) |
| `bizSuccessApprovalHigh` | 85 | Mayor approval that counts as golden-era (observed 95) |
| `bizSuccessPenalty` | 0.3 | pp drift penalty on incumbents under sustained success |
| `bizDisruptBaseChance` | 2 | % per-cycle disruption-shock chance per business (seeded draw) |
| `bizDisruptSuccessMult` | 3 | Disruption-chance multiplier while success window active (27.10: correction increasingly likely, never guaranteed) |
| `bizDisruptShock` | 2.0 | pp one-cycle negative shock on disruption |
| `bizClosureStreak` | 8 | Consecutive negative-growth cycles for closure eligibility |
| `bizClosureRevenueFloorPct` | 40 | Revenue below this % of sector mint median (27.10: BOTH conditions required) |
| `bizEventShockScale` | 1.0 | Scales each event-driven contribution into pp drift; event term capped ±2.0 total (Mike: events are the signal, ambient is background) |
| `bizVol_faith` | 0.5 | Sector volatility multipliers — scale the whole drift term per class: |
| `bizVol_retail` | 1.2 | |
| `bizVol_food` | 1.3 | food/nightlife most volatile of the small classes |
| `bizVol_health` | 0.7 | |
| `bizVol_tech` | 1.5 | tech most volatile (matches its mint growth 8) |
| `bizVol_professional` | 0.8 | |
| `bizVol_construction` | 1.1 | |
| `bizVol_arts` | 1.2 | |
| `bizVol_education` | 0.6 | |
| `bizVol_default` | 1.0 | fallback small-neighborhood class |

**Implementation notes (not config):** (a) distress-streak state needs a home — `Business_Ledger` has no spare column (A–I all owned); design calls for a small companion tab `Business_Dynamics_State` (BIZ_ID, declineStreak, lastDrift, successWindowCycles), documented in SPREADSHEET.md same commit per ADR-0015 §5. (b) Sector class resolved by reusing `SECTOR_ECON_SEEDS`' regex list — export it rather than duplicating (single source, engine.85's classifier already syncs to it). (c) Every key above is asserted present at bench startup — fail loud, no silent defaults (ADR-0015 §4). (d) 27.10's "correction isn't guaranteed" is preserved: all counter-pressure is probabilistic via seeded draws, and the success-pressure path only penalizes *drift*, it never forces decline.

### Task 4: Live-state calibration pull (approved Sheets read)

- **Files:**
  - none modified — an approved read-only pull (dashboard API or approved script)
- **Steps:**
  1. Pull current `Business_Ledger` economic columns and recent approval/prosperity trend data.
  2. Use it to sanity-check Task 3 defaults against live distributions (shared with engine.94 Open question 1 — one pull serves both plans).
- **Verify:** distributions recorded in this plan's changelog; defaults adjusted or confirmed.
- **Status:** [x] DONE 2026-08-01 (Kimi, builder-approved pull). Dashboard API is session-gated (401 without login — credentials not inspected per policy); pull ran over the derived-card layer (MCP world-data) + on-disk world summaries instead, which proved decisive:
  - **Growth_Rate is uniform and static in live data**: 6/6 sampled businesses (OPD BIZ-00024, Oakland Athletics BIZ-00005, SpeedyBurger BIZ-00051, Oakland Tech Collective BIZ-00030, Green & Gold Tavern BIZ-00041, Marigold Cafe BIZ-00068) all read exactly 8% (wd-business cards built 2026-07-17 from the live ledger). Matches the code finding (no post-mint writer) and confirms Task 3's drift bounds must assume every legacy row starts at the same value.
  - **Approval trend C92–C99** (`output/world_summary_c{92..99}.md`): Mayor 78→88→93→95→95 (monotonic, pinned at 95), D1 Carter 72→94, OPP cohort rising; CRC/IND seats −1/cycle to 58–59. Sustained-prosperity trigger for the success-pressure modifiers is real for the governing faction; design detail recorded in [[2026-07-31-citizen-memory-perception]] Open question 1.
  - **Neighborhood sentiment hovers near zero** (San Antonio −0.01, Eastlake +0.01) while retail vitality varies (Grand Lake 9.27 vs San Antonio 6.13) — vitality, not sentiment, is the livelier per-hood prosperity input for the drift pass.

### Task 5: Drift pass implementation (engine-sheet)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — create
  - phase invocation site from Task 2 step 2 — modify (add the call)
- **Steps:**
  1. Read `Business_Ledger` directly (chaos-decay pattern); per row, compute drifted `Growth_Rate` and `Annual_Revenue` from config + city state inputs available in `ctx` (verify which state objects exist at that phase — candidates: neighborhood prosperity/sentiment from Phase 3, `S.weather`/seasonal weights, initiative effects after engine.93 lands).
  2. Queue cell intents via `queueCellIntent_`; never write directly. Fail loud on missing trimmed columns (copy `applyChaosDecay.js:82`).
  3. Deterministic only: seed from cycle + BIZ_ID hash, no `Math.random()` without seed, no wall-clock.
- **Verify:** `node --check` clean; bench (Task 9) shows every row's values move and re-running with the same seed reproduces identical output.
- **Status:** [ ] not started

### Task 6: Decline → layoff wiring (engine-sheet)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — modify
  - `phase05-citizens/runCareerEngine.js` — NOT modified (Task 1 verified the contract; the existing machine consumes the deltas unchanged)
- **Steps:**
  1. Task 1 settled the branch: negative growth alone only stops hiring (`runCareerEngine.js:1163`); firings need the stated headcount to fall. So the dynamics pass emits explicit decline records into `S.careerSignals.businessDeltas[bizId].lost` — same shape the v2.7 rehire matcher already increments (`:1220-1221`).
  2. Cycle-order dependency (folds into the phase-placement open question): the dynamics pass must run BEFORE `runCareerEngine` so its deltas are present when `reconcileBusinessHeadcounts_` reads `S.careerSignals.businessDeltas` (:1236). Then Half 1 lowers stated `Employee_Count` via `queueCellIntent_` (:1279), Half 2 converts any stated-below-tracked gap into firings, and Phase-6 `economicRippleEngine` narrates. Do not build a second headcount writer, and do not fire citizens from the dynamics pass — decline enters ONLY as deltas.
  3. Decline sizing: workers shed per cycle = f(drift severity) — start with 1 tracked-equivalent per consecutive distress cycle beyond `bizDeclineStreak`, capped so a business cannot shed faster than its stated count falls (everything-is-earned: layoffs scale with the decline, never a flat cull).
- **Verify:** bench: force a business into decline streak; deltas appear in `S.careerSignals.businessDeltas`, its `Employee_Count` falls via the existing write-back, and a ripple narration row references it.
- **Status:** [ ] not started — branch resolved by Task 1 (explicit signal); sizing rule 3 signed off with the Task 3 table (Mike, 2026-08-01)

### Task 7: Closure mechanic (engine-sheet)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — modify
  - `docs/SPREADSHEET.md` — modify (Business_Ledger row, same commit, if the schema changes)
- **Steps:**
  1. Closure representation RESOLVED 2026-08-01 (Mike): a closure ledger — `Business_Archive`, mirroring the adopted `Citizen_Archive` pattern ([[../research/2026-07-29-citizen-archive]]): full-row snapshot + exit metadata (`ArchiveReason=closed`, `ExitCycle`, `SourceEventId`), copy-verify-remove, BIZ-IDs permanent and never reissued. Mike generalized the principle: every sim exit (death, traded, closed business) lands on an archive ledger; the ledger enforces ID non-reuse. WARNING — the POPID max-id hazard documented in that research applies to BIZ-IDs too: `phase05-citizens/generationalWealthEngine.js:1499` mints from a lazy max-id read over the active sheet, which breaks the moment rows move out. BIZ-ID allocation must be fixed BEFORE the first archive move ships; verify this in this task, not after. **Mechanism RESOLVED 2026-08-05 (S356, research-build):** persisted high-water mark with active-scan guard. (a) New World_Config key `bizIdHighWater` — machine-written state, precedent `cycleCount`. (b) Allocator contract in all three minters (`generationalWealthEngine.js:1594-1609`, `scripts/ingestPublishedEntities.js:738/883`, `scripts/processBusinessIntake.js:85+`): `next = max(bizIdHighWater, active-sheet max) + 1`, write the mark back after the batch. Never scan the archive — the mark is monotonic over every row that was ever active. (c) The archive move protocol (step 3 below) bumps the mark if it moves a row whose ID exceeds it — closes the hand-appended-then-archived leak. (d) Absent key: self-seed from active scan + write it, logged loud (one-time migration, not a silent default — ADR-0015 fail-loud intent honored). (e) Crash-safety inherent: a lost mark write-back is healed by next run's active max. (f) No locking — the three minters are timing-disjoint by design (M-F intake / Sat cron / Sun engine fire); revisit only if that cadence changes. Node side lands in `lib/sheets.js` as a helper, not a new file (fix-don't-add); Apps Script side inline or existing utility.
  2. In-cycle marking: on threshold cross, zero the headcount through the existing layoff path (workers become unemployed — the v2.7 matcher already treats the freshly fired as waiting a cycle, a lived state) and push a closure event into `worldEvents` with business name, neighborhood, and sector so desks can report it (E95/E98/E101 symptom sample showed the newsroom has almost no closure material — this is the fix). No Status column needed: a zero-headcount row fails every capacity check, so hiring pools skip it same-cycle with no schema change.
  3. Post-commit move: at the verified post-commit finalization point (the citizen-archive movement protocol — never mid-cycle while consumers hold `ctx`), append the full `Business_Ledger` row + exit metadata to `Business_Archive`, read back and verify by BIZ-ID, then remove the active row. Document the new tab in `docs/SPREADSHEET.md` in the same commit.
- **Verify:** bench: threshold-crossed business drains headcount via the existing path, closure event present in `worldEvents`, archive append → read-back → active-row remove protocol runs clean, pool rebuild excludes it, and the BIZ-ID allocator provably does not reissue the freed number.
- **Status:** [ ] not started

### Task 8: Success-pressure coupling (27.10 remainder)

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.js` — modify
  - `World_Config` sheet — modifier values tuned by cell edit, no code change (Task 3)
- **Steps:**
  1. Wire the Task 3 success-pressure modifiers into the drift computation: sustained neighborhood prosperity (3+ cycles) applies competitive-pressure drift penalty to incumbent high-growth businesses; outside-investment disruption probability rises with sustained city-wide growth.
  2. Thresholds stay probabilistic and tunable per 27.10 — "correction isn't guaranteed but becomes increasingly likely."
- **Verify:** bench: a sustained-prosperity fixture measurably increases incumbent drift penalty vs a flat-prosperity fixture.
- **Status:** [ ] not started

### Task 9: Tests + bench + cycle-time measurement

- **Files:**
  - `phase05-citizens/applyBusinessDynamics.test.js` — create (copy `applyChaosDecay.test.js` harness shape)
- **Steps:**
  1. Cover: drift determinism, decline-streak → layoff path, closure threshold → event + pool exclusion, success-pressure modifier on/off, fail-loud on missing columns.
  2. Run the pass under engine.95's per-phase instrumentation; record cycle-time cost in this plan's changelog.
- **Verify:** `node phase05-citizens/applyBusinessDynamics.test.js` green; timing recorded; `git diff --check` clean.
- **Status:** [ ] not started

---

## Open questions

- [x] **Closure representation** — RESOLVED 2026-08-01 (Mike): a closure ledger. `Business_Archive` mirrors `Citizen_Archive`; full-row snapshot + exit metadata; BIZ-IDs never reissued. Mike's general principle: any sim exit (death, traded, closed business) lands on an archive ledger. Detail in Task 7.
- [ ] **Phase placement** — 27.10 says "Phase 2 or Phase 3"; the writer pattern (`applyChaosDecay`) lives in Phase 5 beside the career engine it feeds. Task 2 step 2 produces the concrete invocation options; decide at Task 5. Blocks Task 5.
- [ ] **Golden-era confirmation** — does C91+ live data confirm the sustained-prosperity pattern 27.10 assumes? Shared with engine.94 Open question 1; gated on the Task 4 approved pull. Tunes thresholds, does not block the build.

---

## Changelog

- 2026-08-01 — Initial draft (Kimi CLI). Builder approved the new row from [[../research/2026-08-01-simulation-realism-audit]] build-order item 6. Scoped to the genuinely undesigned gap: business decline/death + 27.10 non-scandal counter-pressure. Birth stays engine.85, scandal ceilings stay engine.94 Track A. All mechanics routed through existing write-back/ripple machinery — no parallel writers.
- 2026-08-01 — Open question 1 RESOLVED (Mike): closure ledger. `Business_Archive` mirrors the adopted `Citizen_Archive` pattern; BIZ-IDs permanent. Mike generalized the archive-ledger principle to every sim exit (death, traded, closed business). Task 7 rewritten: in-cycle zero-headcount marking (no Status column needed), post-commit copy-verify-remove, BIZ-ID allocator hazard flagged (active-sheet max-id reads break once rows move out — same trap the citizen-archive research documented for POPIDs).
- 2026-08-01 — Task 4 DONE (builder-approved pull via derived cards + on-disk summaries; dashboard API is session-gated). Live data confirms the audit's core claims: Growth_Rate uniform 8% across all sampled businesses (static, matches "no post-mint writer"), golden-era approval pattern confirmed C92–C99 for the governing faction. Calibration notes in Task 4 status: drift bounds must assume all legacy rows start at 8%; retail vitality is a livelier per-hood prosperity input than sentiment.
- 2026-08-01 — Mike rulings folded in: (1) tunables live in `World_Config` key→value rows, not a code config file — `loadConfig_` already loads them into `ctx.config`, tuning is a cell edit; Task 3 rewritten, `utilities/businessDynamicsConfig.js` dropped from the design. (2) Everything-is-earned doctrine: no static/free numbers — every drift modifier derives from live sim state; missing keys fail loud, never silently default (the 0.91-fallback disease must not reappear in a new home).
- 2026-08-01 — Rulings promoted to [[../adr/0015-world-config-tunable-values]] (World_Config = house for tunables, migrate-on-touch not a project, everything-is-earned). This plan's Task 3 is the ADR's first application.
- 2026-08-05 — BIZ-ID allocator mechanism RESOLVED (S356, research-build): persisted `bizIdHighWater` in World_Config + active-scan max guard, all three minters; spec in Task 7 step 1. Same pattern answers the citizen-archive POPID allocator question (engine.90).
- 2026-08-01 — Task 3 DRAFTED (Kimi): full drift formula + 27-key World_Config defaults table, calibrated from the sector mint table (growth 2–8 by class), live pulls (uniform 8% legacy, vitality 6.13–9.27, Mayor 95), and the runCareerEngine annual-percent convention. Revenue moves at Growth_Rate/100/52 per cycle so both engines agree on what the number means. Closure requires streak AND revenue floor per 27.10. Awaits Mike sign-off before Task 5.
- 2026-08-01 — Task 1 DONE (Kimi, read-only): negative Growth_Rate stops hiring (`runCareerEngine.js:1163`) but never fires — firings require stated headcount to fall via `businessDeltas` (Half-1 write-back :1279 → Half-2 reconciliation :1284+). Full consumer inventory recorded in Task 1 status (Mike's "is any code tied to these numbers" question): Growth_Rate has exactly ONE mechanical consumer (the v2.7 hiring formula), revenue has one writer (chaos decay) and zero mechanic readers — the closure floor would be the first; hardcoded siblings (÷52, income-recovery multipliers) noted as ADR-0015 migrate-on-touch candidates, no overlaps. Task 6 branch resolved: explicit-signal path, dynamics must run before runCareerEngine; decline enters ONLY as deltas.
- 2026-08-01 — Mike's design concept folded into the formula: **events are the signal, ambient state is background.** Added `eventModifier` term (chaos incidents, initiative landings, edition coverage sentiment touching the business/hood/sector) with a new `bizEventShockScale` key (default 1.0, event term capped ±2.0pp); noise demoted to texture. 28 keys total.
- 2026-08-01 — **Task 3 SIGNED OFF (Mike):** "sounds good… I'll trust your concept" — 28-key World_Config defaults table + event-driven formula approved; Task 6 sizing rule approved with it. All design tasks (1, 3, 4) now closed; remaining work is engine-code Tasks 2/5/6/7/8/9 (engine-sheet), sequenced per the audit build order behind engine.83/84/93/94/85 + engine.95 Task 4.
