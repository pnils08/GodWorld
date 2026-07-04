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
- **Status:** [ ] not started

### Task 2 — Serialize ripple state across cycles (behavior change — gated deploy)

- **Files:** `phase09-digest/finalizeCycleState.js`, `phase06-analysis/applyShockMonitor.js` (whichever serializer is canonical — settle in-task), `phase06-analysis/economicRippleEngine.js`, `phase05-citizens/civicInitiativeEngine.js`
- **Steps:**
  1. Add to the cycle snapshot: active `economicRipples` (trimmed: type/impact/hood/startCycle/endCycle/currentStrength), active `initiativeRipples` (same grain), `migrationDrift` scalar.
  2. Restore on cycle start so `processActiveRipples_` / `applyActiveInitiativeRipples_` see prior-cycle ripples — the existing decay/expiry code becomes reachable (fixes E1/E2/C2). Cap restored list length (bounded accumulator — no unbounded snapshot growth).
  3. Update `RemainingStrength` on the corresponding Ripple_Ledger rows each cycle (or append a decay row — decide by write cost).
  4. **Blast-radius note:** ripples applying for their full 4–20 cycle durations is a real economy/sentiment behavior change. Simulate against C99/C100 snapshots before deploy; deploy alone in a clean window; smoke = ripple carried across one live cycle with sane magnitudes.
- **Verify:** acceptance criterion 2; `economicMood` trajectory across two cycles shows decayed carryover, magnitudes within historical bands.
- **Status:** [ ] not started

### Task 3 — Dead/hollow coupling repairs (independent, bounded items — each its own deploy)

- **Files/Steps:** (each sub-item measure-twice'd per engine.md before the cut)
  - **3a Sports fold (trace S1):** route `S.sportsSentimentBoost` into the `applyCityDynamics` sentiment fold alongside `editionSentimentBoost`; delete the dead `S.sentiment +=` write. Ledger row per fold (Task 1 helper).
  - **3b Crime→dynamics inputs (trace K1):** populate `S.crimeSpikes`/`S.crimeByNeighborhood` from prev-cycle Crime_Metrics (Phase-2 position means prev-cycle is the honest input; document that grain) or move the crime branch to Phase 3+ — settle by caller-graph in-task.
  - **3c Crime event/headline generators (trace K2):** wire `generateCrimeEvents_`/`getCrimeStorySignals_` into the cycle path with ledger attribution, or retire them explicitly — decision on live data volume (don't let dead pools sit ambiguous).
  - **3d Hood-grain crime (trace K3/G4):** reconcile the two crime worlds so a hood's Crime_Metrics spike reaches that hood's citizens as a local signal, not a citywide average. Scope-bound: the reconciliation design (which representation is canonical) is a one-pager inside this task before code.
- **Verify:** per-item before/after cycle comparison; 3a acceptance criterion 3.
- **Status:** [ ] not started

### Task 4 — Per-desk slice assembler (Node, post-cycle — additive)

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

- [ ] **Ledger medium:** sheet tab (queryable in-cycle + by service account; recommended) vs
  per-cycle JSON (cheaper writes). Recommend tab + the assembler exports JSON per cycle anyway.
  Settle at Task 1 step 1.
- [ ] **Slice desk list v1:** civic/business/sports/culture/letters, or start with civic+letters
  (highest attribution value) and grow? Mike call at Task 4.
- [ ] **Crime-worlds canon (3d):** which representation is canonical is a design one-pager before
  any code — flagged so 3d doesn't balloon silently.

## Changelog

- 2026-07-04 — Drafted (S291, engine-sheet) from the five-domain ripple attribution trace +
  Mike's R1–R5. Raw traces filed in `docs/research/ripple-traces/` with TEMPLATE for the
  remaining domains (trace-first rule, acceptance criterion 6).
