---
title: Ripple Ledger + Per-Desk Slices — persist cause→effect, hand desks the truth
created: 2026-07-04
updated: 2026-07-04
type: plan
tags: [engine, ripples, attribution, story-seeds, desk-slices, token-burn, active]
sources:
  - "Mike S291 (2026-07-04) — ripple thesis + R1–R5 design requirements (per-desk slices, forward ripple chains, coherence, synthesis gate, honesty forcing function)"
  - "[[../research/2026-07-04-ripple-attribution-trace]] — the five-domain trace this plan closes (findings E/C/K/S/P, failure classes 1–6)"
  - "docs/research/ripple-traces/ — the raw per-domain traces (reference layer, kept + extended via TEMPLATE)"
pointers:
  - "[[../research/2026-07-04-ripple-attribution-trace]] — research doc; verdict + plan direction §6"
  - "[[2026-06-15-story-seed-deck-engine-emergence]] — engine.35 substrate; Task 6 here supersedes its WHY-layer markdown scraping"
  - "[[2026-07-03-sift-deep-dispatch-reconcile]] — consumption-side sibling (research-build); Task 4's slice files are what its desks will eventually read"
  - "[[../engine/ROLLOUT_PLAN]] — engine.45 row points here"
  - "[[../index]] — registered same commit"
---

# Ripple Ledger + Per-Desk Slices

**Goal:** The engine writes down cause→effect the moment it computes an effect (ripple ledger),
ripple state survives cycle boundaries so multi-cycle stories exist, the dead couplings that
falsify attribution are repaired, and a deterministic post-cycle step hands each desk its
pre-computed slice — so edition LLMs write prose instead of hunting, and the WHY behind every
seed is engine-persisted truth instead of post-hoc reconstruction.

**Why (one line):** the S291 trace proved the engine computes the ripple story every cycle and
destroys it at the cycle boundary; the fix pattern (Chaos_Cars: cause travels with effect) is
already proven in-repo.

**Terminal:** engine-sheet (build + deploy). Task 4/5 output feeds media/research-build's
sift-dispatch fork later — that consumption seam is theirs, the producer side is all here.

**Deploy discipline:** S250 attribution rule binds hard here — Tasks 2 and 3 change live cycle
behavior. One unverified change in flight at a time; nothing new rides a cycle that is itself a
smoke test (C101 is already carrying the S289 window smoke — engine.45 code does NOT ride C101).

**Test base (Mike S291):** the **Sandbox Simulation Ledger** — current with all deploys, sitting
at **C103**. Build and test engine.45 there: Task 1 instrumentation dry-runs, Task 2 ripple-
carryover simulation, Task 3 before/after comparisons, and Task 4/5 slice generation all run
against sandbox cycles before anything touches the production spreadsheet. Production deploys
only after sandbox verification per task.

**Sandbox identity + deploy route (explicit — this sheet, nothing else):**
- Spreadsheet: `SANDBOX_Simulation_Narrative_SANDBOX_0702`, ID
  `1syShVWfudY0eCC9rnR7AWZ8-b-fs5RpJW2bhn6nZtzs`. Bound Apps Script ID
  `1bT3o5r6adZhSv20pa0ijoHv_HdeEbONtBT2bsw_8U-sHbWgyJz94ueIW`.
- Deploy: copy repo to a temp dir, drop a `.clasp.json` with the sandbox Script ID +
  the project `.claspignore`, `npx clasp push -f`. Production `.clasp.json` at repo
  root is never touched. Cycle runs are Mike-fired from the sheet; execution logs come
  back as Drive links.
- **Fresh copy every time — NEVER reuse a prior session's deploy dir (S294 incident).**
  `clasp push -f` pushes the whole tree; a stale dir silently downgrades every file
  that changed since it was made. S294 reused the S292-era dir + copied only the T3a
  files → C109 ran without T2 aboard (no restore, no ripple serialization; C109
  snapshot lost its ripples). Build the dir with `git archive HEAD | tar -x` and
  diff-check the session's critical files against the repo before pushing.
- All reads/writes from this terminal go through the service account
  (`lib/sheets.js`) with the env override: `GODWORLD_SHEET_ID=<sandbox ID> node …`.
  Without the override, lib/sheets.js resolves to PRODUCTION — check the ID before
  any write.

**Dummy data is required to truly test — organic cycles prove nothing here (S293 C106).**
The engine's event pathways are gated on operator-entered state by design: the sports feed's
`SeasonType` column tells the engine the season (Mike's manual entries are the season
authority — the engine's sports output is atmospheric); votes fire only when a tracker row
schedules them; edition effects need prior-cycle ratings. A clean cycle with no seeds births
zero ripples (C106: `ripples=0`) and therefore exercises none of the attribution or carryover
machinery. Every verification cycle needs a seeded birth cycle in front of it.

**Seed method (proven C105/C107):** append rows via `lib/sheets.js appendRows()` under the
sandbox env override, tag every row `(SANDBOX TEST)`, read back after writing. Shapes:

| Tab | Seed shape | Births |
|---|---|---|
| `Oakland_Sports_Feed` | row at target cycle, `SeasonType=playoffs`, `EventType=game-result`, streak/mood/neighborhood filled (copy a C105/C107 row) | sports sentiment + hood effect rows; `S.sportsSeason='playoffs'` → `PLAYOFF_SPENDING_<N>` (dur 3) |
| `Initiative_Tracker` | row `Type=vote`, `Status=pending-vote`, `VoteCycle=<target cycle>`, AffectedNeighborhoods + PolicyDomain set (28 cols — copy INIT-T105/T107) | council vote fires at that cycle; passage births a multi-cycle initiative ripple (safety=8, economic=15 cycles) |
| `Edition_Coverage_Ratings` | rows at cycle **N−1**, `Processed=FALSE` | edition-coverage sentiment + neighborhood effects at cycle N |
| gentrification / migration | no seed — West Oakland `Neighborhood_Map` state persists and fires hooks every cycle | gentrification + MASS_EXODUS rows |

Multi-cycle verification pattern: seed cycle N (births) → run N → run **N+1 clean** →
carryover rows in Ripple_Ledger with decayed `RemainingStrength` are the proof (T2: C107
seeded, C108 clean, PLAYOFF_SPENDING 9.6 → 6.4 exact).

**Acceptance criteria:**
1. After an instrumented cycle, `Ripple_Ledger` rows let a reader reconstruct "cause X →
   effect Y on targets Z, magnitude M, duration D" for every instrumented domain — no ctx
   spelunking, no markdown scraping.
2. A ripple born in cycle N demonstrably still applies (decayed, `RemainingStrength` visible)
   in cycle N+1 — the first multi-cycle ripple in the sim's history.
3. Sports results measurably move persisted city sentiment; the crime→dynamics branch runs on
   real inputs (both verified by before/after cycle comparison, not code inspection).
4. `output/desk_slices_c{N}/` contains one slice file per desk: that desk's ripples, affected
   citizens (actual event participants from LifeHistory_Log, not residence inference), and a
   majorEvents block gated by severity/volume.
5. Seed-deck WHY anchors cite ledger rows; the `world_summary` markdown scrape in
   routePatternSeeds is deleted (kills the S2/G-RC5 mis-attribution class).
6. Every remaining engine domain has a filed trace in `docs/research/ripple-traces/` before its
   writers are instrumented (trace-first rule — no instrumenting untraced code).

---

## Tasks

### Task 0 — Extend the trace base (ongoing, template-driven)

- **Files:** `docs/research/ripple-traces/<domain>.md` (per domain, from [[../research/ripple-traces/TEMPLATE|TEMPLATE]])
- **Steps:** Trace remaining domains before instrumenting them. Priority order (by ripple relevance): weather/seasons, faith, bonds/relationships/arcs, health/generational, businesses, media-feedback/edition-coverage effects, calendar, youth/education, elections, evening systems, world-events bus. Fold each trace's findings into the research doc's domain tables. Close the open items V1–V5 as they're touched (V1 coherence weights-vs-vetoes belongs to the weather trace).
- **Verify:** each new trace filed + findings numbered in the synthesis doc.
- **Status:** [ ] not started (5/16 domains done S291)

### Task 1 — Ripple_Ledger substrate (additive, no behavior change)

- **Files:** `utilities/rippleLedger.js` — create (writer helper + lazy tab create, schema-setup carve-out per Phase 42 §1.1); `phase10-persistence/` intent path where phase position allows
- **Steps:**
  1. Tab `Ripple_Ledger`, one row per attributed effect: `{Cycle, CauseType, CauseId, CauseDetail, EffectType, TargetScope (citizen|business|neighborhood|citywide), TargetIds (POPIDs/bizIds/hoods, capped list), Neighborhood, Magnitude, Duration, RemainingStrength, SourceEngine}`. Model: the Chaos_Cars row (trace K4).
  2. Writer helper `recordRipple_(ctx, entry)` — queues via `queueAppendIntent_` for Phase ≤9 callers; batch-flush. Fail-soft (never throws into a phase), logs drops.
  3. Instrument the sites that already hold full attribution in ctx at compute time — zero new detection: initiative ripples (`applyNeighborhoodRipple_`, trace C2), approval `reasons[]` (trace C5), economic ripples (`createRipple_`, trace E1), sports `totalSentiment` + per-hood effects (trace S1/S3), gentrification/migration story hooks (trace E4), citywide sentiment contributors in `applyCityDynamics` fold.
  4. No consumer changes this task. Ledger rows are write-only until Task 4/6.
- **Verify:** dry-run cycle writes ledger rows for every instrumented site; row count and content spot-checked against the same cycle's ctx (log-based); zero engine errors.
- **Status:** [x] **verified on sandbox** (S292): C104 organic run (sports + approval rows, tab lazy-created, 0 errors) + C105 seeded run (all six causeTypes: initiative vote → 8-cycle safety ripple, PLAYOFF_SPENDING economic-event dur 3, edition-coverage boost +0.0285, gentrification transformation/crisis, MASS_EXODUS 13 residents). Dedup guard added after C104 log showed runEconomicRippleEngine_ double-runs per cycle (87a093dc). **Production clasp push pending** — held behind C101 smoke per one-in-flight rule. Open item: C105 approval rows = 0 (hypothesis: new passed initiative +1 offset decay everywhere; confirm via C105 log or C106). Note: GENTRIFICATION_ACCELERATING hook lags its trigger one cycle by pre-existing design (phase commits via intent at Phase 10 after Phase-5 hooks read).

### Task 2 — Serialize ripple state across cycles (behavior change — gated deploy)

- **Files:** `phase09-digest/finalizeCycleState.js`, `phase06-analysis/applyShockMonitor.js` (whichever serializer is canonical — settle in-task), `phase06-analysis/economicRippleEngine.js`, `phase05-citizens/civicInitiativeEngine.js`
- **Steps:**
  1. Add to the cycle snapshot: active `economicRipples` (trimmed: type/impact/hood/startCycle/endCycle/currentStrength), active `initiativeRipples` (same grain), `migrationDrift` scalar.
  2. Restore on cycle start so `processActiveRipples_` / `applyActiveInitiativeRipples_` see prior-cycle ripples — the existing decay/expiry code becomes reachable (fixes E1/E2/C2). Cap restored list length (bounded accumulator — no unbounded snapshot growth).
  3. Update `RemainingStrength` on the corresponding Ripple_Ledger rows each cycle (or append a decay row — decide by write cost).
  4. **Blast-radius note:** ripples applying for their full 4–20 cycle durations is a real economy/sentiment behavior change. Simulate against C99/C100 snapshots before deploy; deploy alone in a clean window; smoke = ripple carried across one live cycle with sane magnitudes.
- **Verify:** acceptance criterion 2; `economicMood` trajectory across two cycles shows decayed carryover, magnitudes within historical bands.
- **Status:** [x] **verified on sandbox** (S293): C106 first cycle on T2 code (boundary cycle — C105's
  pre-T2 snapshot had nothing to carry; expected). C107 seeded (sports playoffs feed + INIT-T107 vote +
  edition ratings) birthed PLAYOFF_SPENDING_107 (dur 3) + Temescal Night Market initiative ripple
  (economic, dur 15). C108 clean run: `restoreCarriedRipples_: carried 1 economic + 1 initiative`,
  carryover rows landed — PLAYOFF_SPENDING RemainingStrength 6.4 (= 9.6 × 2/3, exact), initiative 0.95
  (= 1 × (1 − 0.8/15)), `prevMigration=3` (migration→mood loop alive first time), mood 50→50.14,
  0 engine errors, snapshot 4854 bytes. Node round-trip test (28 asserts) drives the real decay code:
  `phase09-digest/finalizeCycleState.test.js`. **Production clasp push pending** — rides with T1
  behind C101 smoke, single deploy window.

### Task 3 — Dead/hollow coupling repairs (independent, bounded items — each its own deploy)

- **Files/Steps:** (each sub-item measure-twice'd per engine.md before the cut)
  - **3a Sports fold (trace S1):** route `S.sportsSentimentBoost` into the `applyCityDynamics` sentiment fold alongside `editionSentimentBoost`; delete the dead `S.sentiment +=` write. Ledger row per fold (Task 1 helper).
  - **3b Crime→dynamics inputs (trace K1):** populate `S.crimeSpikes`/`S.crimeByNeighborhood` from prev-cycle Crime_Metrics (Phase-2 position means prev-cycle is the honest input; document that grain) or move the crime branch to Phase 3+ — settle by caller-graph in-task. **Built + sandbox-verified S294 (C112–C114):** C112 flat (no shifts — silence legitimate, updateCrimeMetrics logs nothing). Seeded C113 by lowering two PropertyCrimeIndex cells (70/30 smoothing means observed delta = 0.3×(raw−prev), so −25 seed → ~+7 shift; first −12 attempt was under threshold). C113: `carrying 2 crime spike(s)`. C114: branch fired for DOWNTOWN_CORE + WATERFRONT_WEST, ledger crime rows with per-hood cause (Downtown +6→41, West Oakland +7→34), and C114 organically carried 5 spikes onward — loop alive on real data. Acceptance criterion 3 (crime half) met. settled on prev-cycle-carry via the T2 snapshot (same channel as migrationDrift, no phase move, no new sheet reads). `compactCrimeSpikes_` (finalizeCycleState v1.6) serializes prev-cycle Crime_Metrics increase-shifts (property/violent only, cap 12); applyCityDynamics derives both consumer shapes from the one list (spike array → citywide rolling avg; per-hood counts → cluster thresholds 1/2/3 — shift grain matches the small-integer thresholds, 0–95 indices would saturate them). Ledger row per cluster fire (`causeType: crime`), T3b log lines at both ends. Node test §6 added (7 asserts), full suite ALL PASS.
  - **3c Crime event/headline generators (trace K2):** wire `generateCrimeEvents_`/`getCrimeStorySignals_` into the cycle path with ledger attribution, or retire them explicitly — decision on live data volume (don't let dead pools sit ambiguous).
  - **3d Hood-grain crime (trace K3/G4):** reconcile the two crime worlds so a hood's Crime_Metrics spike reaches that hood's citizens as a local signal, not a citywide average. Scope-bound: the reconciliation design (which representation is canonical) is a one-pager inside this task before code.
  - **3e Initiative-implementation hollow engine (found S294 during 3a caller-graph):** `applyInitiativeImplementationEffects_` is wired (Phase2-InitiativeEffects, godWorldEngine2.js:222/1566) but ALL outputs are dead — sentiment scalar wrote dead `S.sentiment`, `S.initiativeNeighborhoodEffects` + `S.initiativeImplementationTriggers` have zero readers. Measure-twice in-task: fold-vs-retire decision (may overlap civicInitiativeEngine's Phase-5 ripples).
- **Verify:** per-item before/after cycle comparison; 3a acceptance criterion 3.
- **Status:** [~] **3a verified on sandbox (S294, C109–C111)** — `S.sportsSentimentBoost` folds into `finalCity.sentiment` (applyCityDynamics.js, before clamps; ordering verified Phase2-SportsFeed :219 → CityDynamics :224 both entry points); dead `S.sentiment +=` deleted in applySportsSeason.js AND applyEditionCoverageEffects.js (same dead-write class, pre-S216 leftover; sole `S.sentiment` reader is a mediaRoomBriefingGenerator.js:228 fallback behind always-set `dynamics.sentiment`). No new ledger row at the fold — T1's compute-site row in applySportsFeedTriggers_ is the attribution. Evidence: fold log 0.110→0.1100 on C109/C110/C111, ledger sports row mag 0.11, all 21 hoods' NM Sentiment up off C108 baseline. Acceptance criterion 3 (sports half) met. Note: fold repeats each cycle while the feed's last row stays playoffs — feed is the season authority by design. T2 clean-stack regression check C111 PASSED post-incident: carried 2 econ + 1 init; PLAYOFF_SPENDING_110 rem 5.33 = 8×2/3 exact; Fruitvale Mercado rem 0.95 exact. **Production push rides with T1+T2 behind C101 smoke.** 3b/3c/3d not started.

> **2026-07-05 (S296, Mike-direct): Tasks 4–6 DEAD.** Mike rejected this plan's consumption
> layer as not his design: sheets are the world, no JSON carries logic, and entities attach at
> generation time — no post-hoc joins. The corrected contract lives in
> [[2026-06-15-story-seed-deck-engine-emergence]] §"2026-07-05 — Corrected row contract."
> T1–T3b code survives only as substrate: the ledger tab as audit trail, the T2 carry as the
> cross-cycle state feeding Why/Trend in seed rows. This plan takes no further tasks.

### Task 4 — Per-desk slice assembler (Node, post-cycle — additive) — DEAD (superseded 2026-07-05)

- **Files:** `scripts/engine-auditor/buildDeskSlices.js` — create; `output/desk_slices_c{N}/{civic,business,culture,sports,letters}.json`
- **Steps:**
  1. Sibling of `routePatternSeeds.js` in the post-cycle Node chain (after /engine-review artifacts exist). Reads: Ripple_Ledger, `engine_audit_c{N}.json`, `baseline_briefs_c{N}.json`, Story_Seed_Deck, LifeHistory_Log (service account).
  2. Per desk: that desk's domains' ripples (cause→effect chains, multi-cycle state), affected citizens as **actual event participants** (LifeHistory_Log join by POPID/source-tag — fixes trace P4's residence inference), the relevant neighborhood packets, and the desk's seed-deck rows.
  3. Letters desk slice = affected-citizen POPIDs + their event lines (the letters desk finally gets handed its writers).
  4. Slice shape co-designed against `/deep-dispatch` + the sift-dispatch fork's input expectations (read their SKILLs; do not edit them — mismatches fix on this side, same rule as the reconcile plan Task 4).
- **Verify:** slices generated for a real cycle; a spot-audit confirms every ripple in a slice traces to a ledger row and every named citizen actually has a matching LifeHistory_Log event.
- **Status:** [ ] not started

### Task 5 — Synthesis gate (R4) inside the assembler

- **Files:** `scripts/engine-auditor/buildDeskSlices.js` (same file, promotion pass)
- **Steps:**
  1. Promotion rule: an item enters a slice's `majorEvents` block iff severity ≥ threshold OR ≥N similar events (same metric/domain/hood family) this cycle — the general rule Mike named; the seed router's citywide collapse is the precedent, applied sign-aware (G-RC5 lesson).
  2. Below-threshold items stay in the slice as `texture` (available, not promoted). Log counts of promoted vs held (no silent caps).
- **Verify:** a decay-dominant test cycle (C98 replay) promotes the decay cluster as one major event with the correct sign.
- **Status:** [ ] not started

### Task 6 — Re-point the WHY layer at the ledger

- **Files:** `scripts/engine-auditor/routePatternSeeds.js`
- **Steps:**
  1. Causal anchors resolve from Ripple_Ledger rows (CauseType/CauseDetail/Magnitude) instead of regex-scraping `world_summary_c{N}.md`. Delete the scrape path.
  2. Sign-aware by construction (the ledger row carries the real driver and sign) — closes G-RC5 and the S2 sports mis-attribution class in one move.
- **Verify:** seed anchors for a live cycle cite ledger rows; no `Streak (W\d+)` regex remains; a decay cycle gets decay-pole anchors.
- **Status:** [ ] not started

---

## Sequencing

Task 1 first (additive, safe, everything downstream needs it). Task 2 second (gated, alone in
its deploy window). Task 3 items interleave as bounded singles whenever a clean window exists —
none block Tasks 4–6. Tasks 4–5 build once Task 1 has one live cycle of ledger rows. Task 6
last (needs ledger coverage of the anchor domains). Task 0 runs continuously; trace-first rule
applies to any domain before its writers are instrumented.

## Open questions

- [x] **Ledger medium:** settled S292 — sheet tab (`Ripple_Ledger`, lazy-created via
  queueEnsureTabIntent_); assembler exports JSON per cycle at Task 4.
- [ ] **Slice desk list v1:** civic/business/sports/culture/letters, or start with civic+letters
  (highest attribution value) and grow? Mike call at Task 4.
- [ ] **Crime-worlds canon (3d):** which representation is canonical is a design one-pager before
  any code — flagged so 3d doesn't balloon silently.

## Changelog

- 2026-07-04 — Drafted (S291, engine-sheet) from the five-domain ripple attribution trace +
  Mike's R1–R5. Raw traces filed in `docs/research/ripple-traces/` with TEMPLATE for the
  remaining domains (trace-first rule, acceptance criterion 6).
- 2026-07-04 — **Task 1 built + sandbox-verified (S292).** utilities/rippleLedger.js
  (recordRipple_/recordHookRipple_, Chaos_Cars model) + six-site instrumentation, commits
  4cda513c/87a093dc. Sandbox bound-script deploy route established (clasp push from temp dir
  to sandbox Script ID — production untouched). Sandbox C104 organic + C105 seeded runs green;
  acceptance criterion 1 met on sandbox. Production push held behind C101 smoke.
- 2026-07-04 — **Task 2 built + sandbox-verified (S293), commit cf1c2997.** Serializer canon
  settled: finalizeCycleState_ + savePreviousCycleState_ (PropertiesService), not
  applyShockMonitor. Snapshot carries compacted active ripples (12+12 cap, explicit field copy
  strips per-cycle ledger guards) + migrationDrift/factors; restoreCarriedRipples_ seeds the
  live arrays at Phase1-PrevCycleState. Ledger decay tracking decided as append-only
  'carryover' rows (join key CauseId) over cell-update. Acceptance criterion 2 met on sandbox
  C106→C108 (see Task 2 status). C105 approval-rows=0 open item resolved by observation:
  C106/C107 both wrote 6 approval rows — C105 zero was the net-zero offset hypothesis, closed.
- 2026-07-04 — **Task 3a built + deploy-downgrade incident (S294), commit b5dadb67.** Sports fold
  live; dead `S.sentiment` writes deleted (3 writers found, only a dead fallback reader). New 3e
  filed: `applyInitiativeImplementationEffects_` is a hollow engine (all outputs unread). Incident:
  S294 reused the S292-era sandbox deploy dir → C109 ran WITHOUT T2 (no `restoreCarriedRipples_`
  log; C107-born ripples not carried; C109 snapshot saved ripple-less, so PLAYOFF_SPENDING_109 is
  lost — sandbox-only, acceptable). Diagnosis chain: C109 log silent on restore → C108 log confirmed
  save-side ran → snapshot byte arithmetic suggested C108 snapshot had ripples → file diff between
  deploy dir and repo HEAD confirmed 4 stale T2 files. NOT an engine bug; T2 code unchanged. Fix:
  fresh `git archive HEAD` deploy dir, 167 files pushed, 5 critical files diff-verified SAME.
  Re-verification staged: C110 seeded (sports + INIT-T110 Fruitvale Mercado vote), C111 to run clean
  — expect fold line at C110 (T3a) and carryover rows at C111 (T2 regression check).
- 2026-07-04 — **Task 3a sandbox-verified + T2 regression check passed (S294, C110/C111).** C110:
  fold 0.110→0.1100, INIT-T110 passed+signed → 15-cycle economic ripple, snapshot 5098 bytes,
  0 errors. C111 clean: `restoreCarriedRipples_: carried 2 economic + 1 initiative`, carryover rows
  exact (PLAYOFF_SPENDING_110 rem 5.33 = 8×2/3; Fruitvale Mercado rem 0.95 = 1×(1−0.8/15)), fold
  fired again off the feed's standing playoffs state (by design). Sandbox now at C111 with
  T1+T2+T3a aboard, HEAD-parity confirmed. Next 3-items (3b crime inputs, 3c crime generators,
  3d hood-grain crime, 3e initiative-implementation hollow engine) each remain bounded singles.
