---
title: Ripple Trace — Crime / Chaos (updateCrimeMetrics, chaosCarsEngine, cityDynamics, conduct)
created: 2026-07-04
type: research
tags: [engine, ripples, attribution, crime, chaos, trace, reference]
pointers:
  - "[[../2026-07-04-ripple-attribution-trace]] — synthesis doc (findings K1–K5 derive from this trace)"
  - "[[TEMPLATE]] — the trace template this instantiates"
---

# Ripple Trace: CRIME / CHAOS

> Raw S291 trace, preserved verbatim as reference.

Scope note: two **disjoint** crime representations exist and must not be conflated:
- **Crime_Metrics tab** (0–95 indices, per-hood, Phase 3, `updateCrimeMetrics.js`) — rich but nearly write-only downstream.
- **Neighborhood_Map `CrimeIndex`** (0–1 scale, Phase 8/10 `v3NeighborhoodWriter.js`, fed by citizen-event pulse + chaos-cars fold) — this is the value citizens actually react to next cycle.

---

## 1. CAUSAL MECHANISMS

**M1 — worldEvents CHAOS/CRIME count → per-hood crime indices (Crime_Metrics)**
`updateCrimeMetrics.js:159-164` counts `worldEvents` whose domain is `CHAOS` or `CRIME` into a scalar `chaosEvents`. That scalar inflates every hood's indices: `updateCrimeMetrics.js:378-383` (`baseProperty *= 1+chaos*0.25`, violent ×0.5 of that, QoL ×0.12, `baseIncidents += chaos*2`). Also raises reporting rate `deriveReportingSignal_` L981-984 (`CHAOS_REPORTING_SURGE 0.12`). Output map → `S.crimeMetrics` (L268-296) + Crime_Metrics tab.

**M2 — crime metric → chaos/crime weighting into city dynamics**
`applyCityDynamics.js:494-513` `applyObservedFeedback_`: a `crime` count ≥3 cuts nightlife ×0.88, publicSpaces ×0.90, tourism ×0.92, sentiment −0.12 (rolling 6-cycle avg, L671). `applyCityDynamics.js:864-879` `applyCrimeRipple_`: per-cluster `crime≥3` → nightlife ×0.85, tourism ×0.88, publicSpaces ×0.88, sentiment −0.15. **Inputs are hollow** — see G1.

**M3 — the requested chain: crime metric → per-citizen event probability (conduct)**
`runConductEngine.js:92-103` `crimeSpikeFor_(hood)` blends `0.6×(hood crimeIndex/2 from S.neighborhoodState)` + `0.4×(citywide (avgProperty+avgViolent)/2 from S.crimeMetrics.cityWide)`; spike = ≥0.6. Consumption: `runConductEngine.js:190-191` a spike multiplies moral-test firing `chance *= 0.7`; `:203-209` gates commit only when `dialBands.crimeReachable` (integrity band −2, raw <20, `compressLifeHistory.js:949`) and a spike further cuts `commitP *= 0.6`. Net: a crime spike *lowers* both test rate and commit odds (resilience counterweight). This is the crime-metric → chaos-weighting → per-citizen-probability path.

**M4 — crime state → citizen event text (generic pool)**
`generateCitizensEvents.js:1098-1141` `neighborhoodStatePool_`: reads `S.neighborhoodState[hood].crimeIndex` (prev-cycle Neighborhood_Map via `loadNeighborhoodState.js:38,73-75`); `crimeIndex ≥ 1` pushes "watchful" flavor entries tagged `source:nbhdState`,`state:watchful` (L1136-1141) into that citizen's event pool (used at L1842).

**M5 — chaos-cars external adversity (the direct CHAOS injector, Phase 4)**
`chaosCarsEngine.js:runChaosCarsEngine_` L407-498 fires 3–15 events/cycle (`CHAOS_MIN/MAX` L23-24), each vehicle×scope×outcome×magnitude. Three scopes:
- citizen: `writeCitizenEvent_` L218-274 — mutates col-O LifeHistory with `[dialTag]`, appends LifeHistory_Log, and `accrueChaos_`/`applyChaosReaction_` bump `chaosExposure` on DialState (one-time wary→traumatized break, L255-263). No tier protection (`pickCitizenTarget_` L116-133).
- business: `accumulateBusinessEvent_` L279-299 → `Annual_Revenue`/`Employee_Count` deltas folded per (biz,col), flushed `flushBusinessFold_` L301-314.
- neighborhood: `accumulateNeighborhoodFold_` L321-330 → `chaosNeighborhoodFold` residual on the 4 movable cols incl. `CrimeIndex`.
Tier-1 + high-severity sets `consequenceFloorFired` → `tier1ChaosEvents` (L448-451, 481).

**M6 — crime narrative → economic ripple (business)**
`economicRippleEngine.js:453-454` any world-event text containing `crime`/`robbery` → `createRipple_('CRIME_SPIKE')`; ruleset L53 = impact −8 to retail/entertainment/tourism, duration 4 cycles, hoods Downtown/Fruitvale; narrative L817 "Business owners express concern over crime."

**M7 — citizen conduct/chaos events → next-cycle Neighborhood_Map CrimeIndex**
`v3NeighborhoodWriter.js:338` folds `pulseFoldDelta_(pulse,'crime')` (this cycle's emitted citizen events) and `:350` `cFold.CrimeIndex` (chaos residual) additively into the written `CrimeIndex`. Pulse recorded from event tags: `runConductEngine.js:278`, `generateCitizensEvents.js:2430`, `generateGenericCitizenMicroEvent.js:567`. (Tag→`'crime'` dimension mapping lives in `neighborhoodPulseMap.js` — **UNVERIFIED**, file not located under lib/.)

---

## 2. PERSISTENCE (lands where / attribution survives?)

| Effect | Lands | Cause recorded alongside? |
|---|---|---|
| M1 per-hood indices, QoL, reporting, enforcement, hotspots | Crime_Metrics tab (`batchUpdateCrimeMetrics_`, `updateCrimeMetrics.js:299-300`) + `S.crimeMetrics` (L268) | **Lost.** `factors.chaosEvents` is an aggregate count (L277); which specific CHAOS/CRIME event drove which hood's rise is not stored. No per-hood cause field. |
| M2 crime→dynamics multipliers | `S.cityDynamics/clusterDynamics/neighborhoodDynamics`; sentiment reaches Neighborhood_Map `Sentiment` via v3 writer | **Lost + hollow.** Multipliers are ratios with no cause tag; evaporate at cycle end except the sentiment scalar. |
| M3 conduct suppression | The presence/absence of a Transgression/Resisted event (col-O + LifeHistory_Log) | **Lost.** The event (or non-event) persists; the crime-spike cause that lowered its rate is never stamped. |
| M4 "watchful" citizen events | col-O + LifeHistory_Log + Simulation_Ledger, tag `state:watchful` | **Partial.** Generic state tag survives; specific "C97 West Oakland spike" does not. |
| M5 chaos-cars citizen | col-O + LifeHistory_Log `EventTag={dialTag}\|chaos_cars\|{vehicle}[\|chaos:wary/trauma]` (`chaosCarsEngine.js:269-273`); DialState `chaosExposure` cross-cycle | **Survives.** Provenance (vehicle, chaos_cars, reaction) in the log row. |
| M5 chaos-cars business | Business_Ledger cell (`flushBusinessFold_:310`) | **Lost at ledger.** Only the summed number lands in the cell; but the Chaos_Cars source row (below) carries `targetId`/`vehicleType`/`metricMagnitude`. |
| M5 chaos-cars neighborhood | `chaosNeighborhoodFold` → PropertiesService (`CHAOS_NBHD_FOLD_JSON` L342-357) → Neighborhood_Map CrimeIndex/Sentiment/etc (v3 writer L347-354) | **Lost at map.** Blended additively into the column; the Chaos_Cars row holds only the *primary* metric (secondary cols not in that row per L332-338). |
| M5 all chaos events | **Chaos_Cars tab** source-of-truth row (`writeChaosCarsRow_`, called L479) — cycleId, vehicleType, targetScope, targetId, targetTier, diceOutcome, primaryMetric, metricMagnitude, consequenceFloorFired, narrativeSeed | **Survives — best attribution in the system.** A later reader can reconstruct "vehicle X hit citizen/biz/hood Y on cycle Z." |
| M6 economic ripple | `S`-resident ripple objects; World_Population write at `economicRippleEngine.js:691` (per engine.md) | Ripple keyed by type/neighborhood/cycle; cause = the triggering event text. Partial attribution. |
| M7 pulse/chaos → CrimeIndex | Neighborhood_Map tab | **Lost.** Additive fold; no per-event trail on the column. |

---

## 3. MEDIA SURFACE

Visible:
- **Neighborhood_Map CrimeIndex** → `neighborhoodSlice.js:61` (`crimeIndex`), surfaced `:86` as `mv('crime', st.crimeIndex)` → **engine_audit_c99.json** carries `CrimeIndex` (×21), `PropertyCrimeIndex`/`ViolentCrimeIndex` (×20 each), `Crime_Metrics` (×1).
- **baseline_briefs** report crime cycle-over-cycle deltas (`generateBaselineBriefs.js:28`).
- **Story seeds / Story_Seed_Deck:** `applyStorySeeds.js:1518-1528` Tier-1 chaos → forced front-page `ACCOUNTABILITY` seed (priorityScore 9.5, consequenceFloor); `:1549-1565` broad chaos field with non-empty `narrativeSeed` → `CRIME`/`BUSINESS`/`COMMUNITY` seeds (`chaosSeedDomain_`, `CrimeIndex→CRIME`).
- **Storyline_Tracker:** `storylineWeavingEngine.js:158` appends an arc per `tier1ChaosEvents`.
- Media weighting references crime topically (`mediaFeedbackEngine.js:73`).

Invisible / not surfaced:
- `updateCrimeMetrics.js` **`getCrimeStorySignals_`** (L701-790) — property/violent/response-time/citywide/QoL/hotspot **headlines** — has **no cycle-path caller** (G2), so those crime-shift headlines never reach any surface.
- Crime_Metrics `hotspots`, `categoryCityWide`, `enforcement`, `reporting`, `shifts` land in the tab/summary but drive no media output.
- No engine-auditor detector keys on crime/chaos (`scripts/engine-auditor/detectors/` grep empty).

---

## 4. GAPS (computed-but-unattributed / dead / hollow)

- **G1 — crime→cityDynamics inputs are never populated.** `applyCityDynamics.js:104,108` read `S.crimeSpikes`/`S.crimeEvents`/`S.crimeByNeighborhood`; a repo-wide grep finds **no writer** for any of them → they fall back to `[]`/`{}`. So `applyObservedFeedback_` crime branch (L508-509) and `applyCrimeRipple_` (L864-879) run on zero every cycle — **hollow coupling**. Compounded by ordering: applyCityDynamics is Phase 2, `updateCrimeMetrics` is Phase 3 (`godWorldEngine2.js:236`), so live crime metrics aren't even available to it.
- **G2 — `generateCrimeEvents_` and `getCrimeStorySignals_` are unwired.** Only `updateCrimeMetrics_Phase3_` is called (`godWorldEngine2.js:236,1580`); the two event/headline generators (`updateCrimeMetrics.js:601-695`, `701-790`) have no cycle-path callers. The rich per-hood indices therefore **never become discrete attributed citizen/business/media crime events** — the PROPERTY/VIOLENT/QOL/SAFETY pools (L614-641) are dead. (Confirms prior observation 26594: "Crime tracking exists only at city level — no individual citizen crime events.")
- **G3 — Crime_Metrics is near write-only.** Of the whole Phase-3 output, the only value read downstream is the citywide average (`runConductEngine.js:92-93`). Per-hood indices, hotspots, reporting, enforcement, shifts drive nothing → computed and persisted to the tab, unattributed to any downstream effect.
- **G4 — the two crime worlds barely connect.** Citizens/conduct react to Neighborhood_Map `CrimeIndex` (0–1, pulse/chaos-fed, `loadNeighborhoodState.js:73-75`), **not** to `updateCrimeMetrics`'s 0–95 indices. So a "C97 crime spike in West Oakland" recorded in Crime_Metrics reaches citizens only through the diluted citywide-average term in `crimeSpikeFor_` — never as a West-Oakland-specific signal.
- **G5 — attribution lost at every fold except Chaos_Cars.** The `chaosEvents` aggregate (M1), the pulse fold (M7), the neighborhood chaos fold secondary cols (M5), and the conduct suppression (M3) all leave no cause→effect trail. Only the **Chaos_Cars row** (M5) lets a later reader reconstruct cause→effect ("vehicle X → citizen/biz/hood Y, cycle Z, magnitude M"). A reader could **not** reconstruct "the C97 Crime_Metrics spike in West Oakland caused these specific citizen/business events" — because (a) those events are never generated (G2) and (b) even the flavor/suppression effects that do fire carry only generic state tags, not the spike's identity.
- **UNVERIFIED:** the tag→`'crime'` pulse-dimension mapping in `neighborhoodPulseMap.js` (file not located under lib/), i.e. exactly which citizen event tags raise next-cycle CrimeIndex via M7.
