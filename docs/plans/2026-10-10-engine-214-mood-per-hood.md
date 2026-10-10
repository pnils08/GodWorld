---
title: Mood Per Hood Plan (engine.214 — the clusters go)
created: 2026-10-10
updated: 2026-10-10
type: plan
tags: [engine, active]
sources:
  - docs/plans/2026-09-13-run-cycle-packages-the-world.md §engine.214 — the map (2026-10-09), builder's words (2026-10-07, 2026-10-10), pushback, ruling
  - phase02-world-state/applyCityDynamics.js @ d794209b (2,111 lines; cluster surface :647–704, :1099–1281, :1389–1521, :1572–1666, :1938–2080)
  - phase01-config/canonNeighborhoodLoader.js (S.canonHoods, getHoodScenes_, getHoodAttention_), phase02-world-state/loadNeighborhoodState.js (S.neighborhoodState)
  - Neighborhood_Map live read 2026-10-10 (22 rows; authored cols IncomeTier / BoomExposure / BoomIndex / EmployerCharacter / WealthMin / WealthMax / WeatherZone / Scenes / Adjacent / District; live cols A–O written by v3NeighborhoodWriter)
  - output/carry_forward_c110.json — 22-hood dynamics at C110
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — engine.214"
  - "[[2026-09-13-run-cycle-packages-the-world]] §engine.214 — parent; the map and the builder's words live there, not restated here"
---

# Mood Per Hood Plan (engine.214 — the clusters go)

**Builder's words (2026-10-10):** "West Oakland will always be the boom town, that doesn't mean at any point in the future it remains that. The data and crons will decide, but even if it does get debunked it doesn't change that it was the boom town, and all future coverage will say that it used to be a boom town, if it goes that way. So canon is permanent, that's the point. And the city runs a cycle just like A's entities. I'm not suggesting a major change. What I'm saying is you told me the sim looks at the clusters for the hand written canon, I'm saying that's likely outdated, all the goods are written off the institutions baseline of institutions.md, the homes are priced as such, hoods data is set to that. Mood should be per hood, how that's set idk, some creative algorithm can make that become the city wide figure. Same goes for almost all the city wide numbers." — and, same day, on the plan: "grab a plan.md template and start to design it, incorporate all we spoke for this, use codex and agy for reviews. Once plan agreed upon start having es build … we will stick to this one build overnight while I sleep as its pretty well laid out."

**Goal:** every hood's dynamics start from its own authored `Neighborhood_Map` row (the INSTITUTIONS seed, the permanent referent) and move on its own live inputs; the five cluster templates, their anchors and their hand weights are gone; the city figure is derived from the 22 hoods by one stated rule; `S.neighborhoodDynamics` and `S.cityDynamics` keep their shapes for their readers (11 and ~50 files).

**Rows:** engine.214 · **Owner:** research-build (design, reviews, step declaration) / engine-sheet (build, bench, PROD)

## Design (the rule set es builds from)

**D1. Seed columns are the base; live columns are never read as a base.** `NightlifeProfile`, `RetailVitality`, `EventAttractiveness`, `Sentiment` (cols A–O) are written by `v3NeighborhoodWriter` *from* this engine's output — reading them as input is the engine feeding itself. The base reads only `IncomeTier`, `BoomExposure`, `BoomIndex`, `EmployerCharacter`, `WeatherZone`, `Scenes`, `Adjacent` (all authored, all already loaded: `S.neighborhoodState[hood]`, `S.canonHoods.scenes`, `S.neighborhoodAdjacency`). `AttentionWeight` is a media knob (`mediaFeedbackEngine.js:69`, four hoods carry 0) and is not read here.

**D2. One hand table remains, keyed by the sheet's vocabulary, not by hood.** `HOOD_CHARACTER_BY_EMPLOYER` — one row per `EmployerCharacter` label on the live sheet (institutional, clinic, schools-retail, campus, transit-retail, nightlife, professional, residential, retail, medical, family-retail, mixed, village-retail, service-labor, arts, stadium, construction): the seven multipliers (traffic / retail / tourism / nightlife / publicSpaces / culturalActivity / communityEngagement, same 0.80–1.25 range as today) and `capacitySensitivity` (0.6–1.4; institutional / nightlife / campus / stadium / arts feel congestion most, residential / village-retail least). The old `applyLocalPlaceBias_` folds into this table (it was the same character stated twice). A label on the sheet with no row **throws** (Engine_Errors, no dynamics that Cycle — the engine.214 :119 policy), never silently defaults. This is a hand table by design: it is the engine's reading of the sheet's authored label, and changing a hood's character is a sheet edit, not a code edit.

**D3. BoomIndex is the one numeric seed on the base.** retail ×(1 + 0.10·BoomIndex), tourism ×(1 + 0.10·BoomIndex) — West Oakland (+0.9) and Baylight (+1.0) start warm, Temescal (−0.7) cool. IncomeTier / WealthMin / WealthMax stay placement and pricing (engine.135, engine.160); they move no mood.

**D4. Weather fronts target `WeatherZone`, not a cluster.** MARINE → `waterfront`, `bay-fog` (tourism ×0.92, publicSpaces ×0.88, sentiment −0.06) and `lake` (publicSpaces ×0.94); HEAT → `inland`, `valley` (publicSpaces ×0.92, sentiment −0.04); COLD → `hills`, `piedmont-edge` (publicSpaces ×0.90, traffic ×0.95); `urban-core`, `urban-corridor`, `moderate` take the citywide weather only. The realised-microclimate line (:1411, `S.neighborhoodWeather[hood].type === 'fog'` → tourism ×0.95, traffic ×0.97) stays: a front is the forecast, fog on the ground is the event; the two magnitudes are stated here so no reviewer finds a duplicate.

**D5. Calendar keys on `Scenes`.** First Friday: `Scenes.FirstFriday` weight w — w ≥ 3 is the epicenter (today's DOWNTOWN_CORE magnitudes: nightlife ×1.5, culturalActivity ×1.6, communityEngagement ×1.4, publicSpaces ×1.3, retail ×1.3, traffic ×1.3, sentiment +0.25 — Uptown 4, KONO 3), w 1–2 is spillover (NORTH_HILLS magnitudes — Downtown 1, Jack London 1, Temescal 2), w 0 the modest citywide lift. Creation Day: citywide lift as today, plus the East Oakland extra (communityEngagement ×1.1, sentiment +0.05) for any hood with `Scenes.CreationDay` > 0 (Downtown 3, West Oakland 2, Lake Merritt 2, Jack London 1). Seed calendar boosts (`seedCalendarBoost_`): arts = `Scenes` has `arts` or `EmployerCharacter` ∈ {arts}; nightlife = `EmployerCharacter` ∈ {nightlife, stadium}; public-space = `WeatherZone` = `lake`. The hood is the key; nothing in World_Config names hoods.

**D6. Sports.** Citywide crowd and result effects unchanged (every hood). The stadium lift lands on the venue hood direct and full (`S.sportsWeek[f].venue` names it). Whether adjacent hoods feel a share is a sim call — Open question 1, not designed.

**D7. Live inputs apply once, per hood.** Demographics: `applyDemographicModifiers_` on the hood's own ratios (rates are scale-free; thresholds unchanged) replaces the micro demographics block (:1424–1435) — one application, not cluster-then-hood. Economy: `applyEconomyLocal_` on the hood's own mood vs `hoodMoodMedian` replaces the micro economy block (:1439–1448). Crime: the per-hood block (:1451–1453, ≥1 / ≥2 prev-cycle spikes) stays; the cluster ripple (`applyCrimeRipple_`, summed ≥3) goes — Needs proof P1. Observed feedback (`applyObservedFeedback_`) is citywide counts and applied to every hood identically today; it applies once to a shared base before the per-hood pass. Seeds: `seedSignals.byNeighborhood` already exists; `byDomainCluster` becomes `byDomainHood` with the same thresholds, Needs proof P2. Commute daytime lift, initiative/approval fold, momentum 0.3: unchanged.

**D8. Sentiment bleed on the hood graph.** Same formula as today (`newSent = base + (neighbourAvg − base) × 0.12`) over `S.neighborhoodAdjacency[hood]` instead of `CLUSTER_ADJACENCY`; one pass, post-momentum, pre-clamp. 22 nodes smooth harder than 5 — Acceptance 4 pre-declares the spread floor; the factor rescales if it collapses.

**D9. Capacity friction per hood.** Peak demand is the max across hoods (was across clusters); congestion × the hood's `capacitySensitivity` from D2. `World_Config.cityCapacity` unchanged.

**D10. The city figure: the equal mean of the 22 canon hoods, every metric.** Reasons: one source (the canon hood list, ADR-0016); reads no live column; no sample-vs-population confusion (tracked counts 508–2,751 are a sample, rule 2026-10-02); no hand weights. Every hood is a character and the city is its hoods. Estimated step at the cut (C110 carried values: five-weight cluster means 0.382 vs equal-22 0.369): **sentiment −0.013 on the raw aggregate**; the media / edition / sports boosts and city momentum apply after the aggregate as today, so `Riley_Digest.CitySentiment` (+0.85 at C110) moves by about that much and no more. Exact number at the bench readback (Task 10); declared in DEPLOY_HISTORY before PROD.

**D11. Retire surface (named so nothing is missed).** `applyCityDynamics.js`: `CLUSTERS`, `CLUSTER_ADJACENCY`, `clusterWeights`, `seedClusterAnchors_`, `buildHoodClusterAssignment_`, `hoodClusters`, `clusterDynamics`, `getClusterDynamics_`, `S.clusterDefinitions`, `S.previousClusterDynamics`, `applyLocalPlaceBias_`, `getClusterCrimeCount_`, `applyCrimeRipple_`, `isArtsCluster_` / `isNightlifeCluster_` / `isPublicSpaceCluster_` (re-keyed per D5), `byDomainCluster`, `maxAcrossClusters_`, `weightedAvg_` / `weightedSent_`. `godWorldEngine2.js:507` `ensureEngine214Config_` call; `engine94SheetContract.js:312–317` `ENGINE214_CONFIG_SEEDS` + `ensureEngine214Config_`; the five `World_Config.clusterAnchors_*` rows (deleted by hand through lib/sheets after PROD, Task 12). Tests: `scripts/hoodBlindTables.test.js` (asserts the anchor move — rewritten to assert no cluster literal and a base from the sheet row), `scripts/engine94SheetContract.test.js` B2 (removed), `scripts/hoodEconomyRelative.test.js` + `scripts/activityObservationsCarry.test.js` (harness seeds). Docs same commit: STUB_MAP regen, SHEETS_MANIFEST World_Config rows, DEPLOY_HISTORY. No reader outside the file touches any of these (grep 2026-10-10: `getClusterDynamics_` 0, `.clusters` 0, `byDomainCluster` 0, `previousClusterDynamics` 0; the three `clusterDefinitions` mentions elsewhere are doc comments).

**D12. Gate.** Build and bench now. PROD only after the C112 readback (Sun 2026-10-18) — the ten adopted hoods got their first carried Cycle at C110 and momentum proves on the second; cutting before that leaves no before-series for the hoods the cut most affects. First live fire **C113, Sun 2026-10-25**; the city-series step is pre-declared there. Not "no code ever waits" — the wait is evidence, dated.

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | `HOOD_CHARACTER_BY_EMPLOYER` table (D2) + `hoodCharacterBase_(ctx, hood)` (D2, D3): seven multipliers + capacitySensitivity from `S.neighborhoodState[hood].employerCharacter` / `.boomIndex`; throw on an unknown label. `applyCityDynamics.js` | es | not started |
| 2 | Weather fronts by `WeatherZone` (D4): `applyWeatherModifiers_(m, weather, extra, zone)`; the :1411 line stays | es | not started |
| 3 | Calendar by `Scenes` (D5): `applyHolidayModifiers_` and `seedCalendarBoost_` take the hood; First Friday / Creation Day / arts / nightlife / public-space keys per D5 | es | not started |
| 4 | Sports (D6): citywide unchanged; stadium lift on the venue hood direct; `hoodClusters.byHood` read removed | es | not started |
| 5 | Per-hood pass rebuilt (D7): base → season → weather → holiday → sports → observed feedback → demographics → economy → crime → seeds → lag drags → microclimate → momentum → fold → commute → clamp; the cluster first-pass loop (:1137–1242) and the micro blocks it duplicated are gone | es | not started |
| 6 | Bleed on `S.neighborhoodAdjacency` (D8) | es | not started |
| 7 | Capacity friction per hood (D9) | es | not started |
| 8 | City figure = equal mean of the 22 (D10); boosts and momentum after it unchanged | es | not started |
| 9 | Retire surface (D11) incl. `ensureEngine214Config_` call + seeds; tests rewritten; new `scripts/perHoodDynamics.test.js` (22 keys; two hoods of different `EmployerCharacter` differ on nightlife and tourism on identical inputs; unknown label throws; MARINE hits `bay-fog` not `inland`; `FirstFriday:4` is epicenter, `:1` spillover, blank modest; bleed moves a hood toward its neighbours; equal-22 city; `S.neighborhoodDynamics` shape unchanged) | es | not started |
| 10 | Bench: SANDBOX 1004 at C112 on the real numbers (sequenced by es against engine.284's `@expect=112` fire — es's call which goes first). Readback: 22 ΔSentiment vs the current engine on the same Cycle; nightlife and tourism spread inside each former cluster; citywide sentiment spread; the city sentiment step; 0 new Engine_Errors; the trace for one hood (West Oakland) line by line | es | not started |
| 11 | rb reads the bench readback against Acceptance 1–6; builder reads the West Oakland trace; PROD after the C112 live readback (Sun 2026-10-18), first fire C113 (Sun 2026-10-25); step declared in DEPLOY_HISTORY before the push | rb / es | not started |
| 12 | After PROD: delete the five `World_Config.clusterAnchors_*` rows through lib/sheets, read back, SHEETS_MANIFEST row | es | not started |
| 13 | STUB_MAP regen, SHEETS_MANIFEST, parent plan §engine.214 status, ROLLOUT row → done-pending-archive | es / rb | not started |

## Acceptance

1. Every canon hood has an entry in `S.neighborhoodDynamics`, shape unchanged (eight metrics), and no reader outside `applyCityDynamics.js` changed — proven by the test suite + bench C112 0 Engine_Errors.
2. Two hoods with different `EmployerCharacter` on identical live inputs produce different nightlife and tourism — proven by `perHoodDynamics.test.js`; on the bench, nightlife and tourism spread inside each former cluster is > 0.05 (C110 today: 0.00 in all five).
3. A hood's base is set by its sheet row: editing `EmployerCharacter` or `BoomIndex` on the bench changes that hood's next-Cycle base and no other hood's — proven by one bench edit + fire.
4. Citywide sentiment spread across the 22 stays ≥ 0.18 after bleed (C110: 0.23 across clusters) — proven at bench C112; if lower, the bleed factor rescales before PROD.
5. The city sentiment step at the cut is within ±0.03 of the raw-aggregate estimate (−0.013) — proven at bench C112 vs the current engine on the same inputs; declared in DEPLOY_HISTORY.
6. No cluster name, anchor list or `clusterAnchors_` key remains in engine code or tests; the five World_Config rows are gone after PROD — proven by grep + sheet readback.
7. First live fire C113 (Sun 2026-10-25): 131 phases, 0 new Engine_Errors, 22 hood rows written, city series stepped as declared.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| codex plan review | codex | docs/for-claude-review/2026-10-10-codex-engine214-plan-review.md (requested 2026-10-10) | pending |
| agy plan review | agy | output/antigravity/2026-10-10-review-engine214-plan.md (requested 2026-10-10) | pending |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | Clusters are outdated; mood is per hood from the hood's authored row; the INSTITUTIONS seed is the permanent referent | builder · rb | parent §engine.214 Builder's ruling (2026-10-10); map (2026-10-09) |
| A2 | Districts read hood data for the civic side and never generate mood | builder · rb | parent §engine.214 pushback 3, uncontested |
| A3 | PROD after the C112 readback; first fire C113 | rb (pushback 8, uncontested) | parent §engine.214 |
| A4 | The media's hood-vs-seed read is a separate job, not this plan | builder · rb | ROLLOUT pipeline.71 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|
| P1 | Retiring the cluster crime ripple (summed ≥3) loses nothing the per-hood block (≥1/≥2) does not already carry, and the per-hood thresholds do not over-fire once the cluster layer is gone | rb | bench C112: count of hoods hitting each crime branch vs the current engine on the same inputs | `applyCityDynamics.js:1049–1063`, `:1451–1453` |
| P2 | Seed domain thresholds (`wCulture ≥ 6/3`, `wNight ≥ 6/3`) tuned on cluster sums do not go silent at hood grain | rb | bench C112: domain-boost fire counts by hood vs by cluster today; rescale to the hood median if silent | `:977–1030` |
| P3 | Bleed over 22 nodes does not collapse the citywide spread | rb | Acceptance 4 | D8 |

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|

## Open questions

- Does the stadium lift reach the venue hood's adjacent hoods, and at what share? — blocks nothing (Task 4 ships venue-direct); for the builder.

## Changelog

- 2026-10-10 (research-build) — Created from the parent plan's map and the builder's ruling; codex + agy reviews requested.
