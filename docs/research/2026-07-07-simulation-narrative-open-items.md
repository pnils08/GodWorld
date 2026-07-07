---
title: Simulation_Narrative open items (Mike's list) — research
created: 2026-07-07
updated: 2026-07-07
type: reference
tags: [research, engine, ledger, wiring-audit, active]
sources:
  - Google Drive 1qPb4EHVQ_NQweIJwCiHsGU1HckKhULYS — "Simulation_Narrative open items", Mike-shared S302
  - S302 five-lane parallel wiring investigation (engine-sheet terminal) — findings embedded below with file:line evidence
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — registered same commit"
  - "[[../plans/2026-07-04-ripple-ledger-attribution]] — engine.45 plan; items 6 and 9 route there"
---

# Simulation_Narrative open items (Mike's list) — research

**Source:** Mike's Drive doc `1qPb4EHVQ_NQweIJwCiHsGU1HckKhULYS`, shared S302 (2026-07-07). Sixteen open questions about tab/system wiring. Answered by a five-lane read-only investigation: (1) event-ledger tabs, (2) sports atmospherics, (3) media/digest pipeline, (4) Simulation_Ledger columns, (5) health/chaos/misc. All evidence file:line-cited from live code at S302 HEAD.

**What this addresses:** Pre-C101 sweep — the engine is close; this settles which tabs are load-bearing, which are ghosts, and which of Mike's asks are new builds vs. wire-jobs.

**What it does:** Disposition per item: WIRED / PARTIAL / ORPHAN / NEW-BUILD, with the fix path where one exists.

---

## Extraction — per-item dispositions

### 1. WorldEvents_V3_Ledger — WIRED, deterministic
Atmospheric **city** events, not citizen events (citizen events go to LifeHistory_Log). Generator `phase04-events/worldEventsEngine.js` (live, `godWorldEngine2.js:244/:1602`), pools hardcoded at L99–171, weighted pick via `ctx.rng` (throws if rng absent, L59). Writer `phase10-persistence/recordWorldEventsv3.js:71`. Readers: compileHandoff, buildDeskPackets, buildCivicVoicePackets, engine-auditor detectors. Generator untouched since S199/S271 — wiring is fine; the upgrade question is **pool depth vs. the new engine texture** (bond/weather/cultural signals don't inform pools). → upgrade candidate, not a repair.

### 2. Sports atmospherics ("playoffs" in C122) — 9 UNGATED GENERATORS, surgical fix known
Wall-clock is already dead (`applySportsSeason.js` v3.0 removed month→sports). The leak: `applySportsSeason_` sets `S.sportsSeason` from the **last Oakland_Sports_Feed row's SeasonType** (`:61-64`), and 9 live generators fire generic sports atmosphere on that raw value with **no `sportsSource==='config-override'` gate**:
- `generateGenericCitizenMicroEvent.js:382/:477` (playoff/championship citizen texture pools L311–332)
- `generateGameModeMicroEvents.js:422` (pools L256/262)
- `buildCityEvents.js:526-532/:615` (watch-party/tailgate named events L448–457)
- `runEducationEngine.js:247`
- `applyDemographicDrift.js:183` + `deriveDemographicDrift.js:173-181` (**the World_Population sports-lore writer** — "Sports fans surge (championship fever)" etc.)
- `updateNeighborhoodDemographics.js:291/298`
- `generateCrisisSpikes.js:103/191/277`
- `calendarChaosWeights.js:393-401` (weights only)
- `applySeasonWeights.js:340-363` (weights only)
Correct pattern already exists in `worldEventsEngine.js:94-96` and `generateCrisisBuckets.js:63` (`config-override` gate). Correct citizen-facing model already exists: `applyGameNightMoments.js` (feed-driven, names real POPIDs). **Fix:** one `S.sportsAtmosphereEnabled = (sportsSource === 'config-override')` flag in `applySportsSeason.js` + guards at the 9 sites. → adopt, bounded fix.

### 3. Event_Arc_Ledger — PARTIAL (plumbing live, spawner deleted)
Load (`v3preLoader.js:164`) → advance (`eventArcEngine_` via `v3Integration.js:119`) → write (`v3LedgerWriter.js:50`) → read (`citizenContextBuilder.js:189`, buildDeskPackets) all live. But new-arc spawner `generateNewArcs_` was deleted in the S185 dead-code scan; `v3Integration.js:145` still guards `typeof generateNewArcs_ === 'function'` — permanently false. **Arc pool drains with nothing entering.** → decide: rebuild spawner (aligned to ripple/protagonism model) or retire the tab.

### 4. Riley_Digest — see §14 lane-5 findings (pending at first write; updated same-day)

### 5. Journalist router (Bay_Tribune_Oakland → Story_Seed_Deck) — HALF-EXISTS
Tab is `Story_Seed_Deck` (no tab named Story_Seeds_Desk). Deck col I `SuggestedJournalist` is deprecated/blank; col P `BylineCandidate` is **live** on the Node auditor lane: `scripts/engine-auditor/routePatternSeeds.js:354/:530`, scored by `utilities/bylineEngine.scoreAllBylines_` against the roster read by `scripts/engine-auditor/bayTribuneRoster.js` (RoleType col F → beat via BEAT_RULES L48–71). **Gap:** the live-cycle seed path `buildContractSeeds.js` → `saveV3Seeds.js` does NOT populate BylineCandidate. → adopt: wire byline scoring into the live-cycle seed path (or run seeds through the auditor lane), spreading bylines past the same 9 agents.

### 6. Ripple_Ledger — PARTIAL (tab write-only; data consumed in-memory)
Writer `utilities/rippleLedger.js:40` live at 10+ engine sites. Nothing reads the **tab** back; ripple data reaches seeds only via `S.rippleEvents` same-cycle (`buildContractSeeds.js:222`). Planned readers (T4 `buildDeskSlices.js`, T6 WHY layer) unbuilt; no decay/RemainingStrength update path. → already tracked: [[../plans/2026-07-04-ripple-ledger-attribution]] T2/T4/T6.

### 7. Health_Cause_Queue → "Oakland Hospital" — NEW-BUILD (with real foundations)
Queue+Intake are orphaned manual trackers (sole writer/reader `healthCauseIntake.js`, operator-fired, ~3 stale rows). But hospitalization-class events already exist live: `chaosCarsEngine.js` ambulance (`chaosCarsConfig.js:194` — minor_injury/medical_emergency/workplace_accident→Hospitalized) + oari_van (`:208`), writing dial tags + LifeHistory. Ambient HEALTH events in `worldEventsEngine.js:105`. **No per-citizen health/admitted column exists** — health is dial tags + aggregate illnessRate only. Build needs: admitted-state field, in-care event gating, intake feeds (illness roll, career risk, athlete injuries from sports feed), discharge loop. → adopt as new system; spawns its own plan. Retire the manual queue into it.

### 8. Chaos cars / OARI car — WIRED, consumed
Live Phase 4 (`godWorldEngine2.js:249/:1607`), persisted Phase 10 (`saveChaosCars.js`). Consumed: `applyStorySeeds.js:1549`, `storylineWeavingEngine.js:166` (Tier-1 hits → Storyline_Tracker), business/neighborhood folds, `buildWorldSummary.js:355`. OARI van's crisis outcomes carry `coverageContribution:true` (only vehicle that does). → no action.

### 9. Narrative_Bridge — ORPHAN (schema-only ghost)
9-col designed schema (`schemas/SCHEMA_HEADERS.md:896`), header-only tab, **zero code references anywhere**. Its intended job (per-cycle synthesis: theme, tone, causal link, key players) is what ripple T4/T6 + world-summary now aim at. → decide: delete tab, or make it the landing surface for ripple T6 WHY output. Don't build it standalone.

### 10. Business_Ledger — PARTIAL (events use it; join is hardcoded)
Readers: `economicRippleEngine.js:126` (BIZ→neighborhood), `runCareerEngine.js` (employment deltas → BUSINESS_CONTRACTION/EXPANSION ripples at `economicRippleEngine.js:305-321`), chaos business-scope (revenue/employee cell intents). **Gap:** `runCareerEngine.js:135` `INDUSTRY_BIZ_POOL` is hardcoded — new businesses on the ledger are never picked up (maintenance comment L136). Header whitespace hazard on ` Annual_Revenue `/` Avg_Salary `. → adopt: replace hardcoded pool with live ledger read.

### 11. LifeHistory bloat — OK BY DESIGN, watch
Col-O (per-citizen) is bounded: `compressLifeHistory_` folds into DialState then trims to 20 (`utilities/compressLifeHistory.js:293/:427`), fold-once, overflow → LifeHistory_Archive. LifeHistory_Log trims via `maintainLifeHistoryLog_` Phase 11 row-count trigger. Not runaway. JSON/off-sheet offload of the **Archive** is a someday-optimization, not a defect. → watch; trigger = Archive read latency or sheet cell limits.

### 12. Simulation_Ledger columns
- **Dials: WIRED.** Col-O → DialState (col AV) via compressLifeHistory (live `godWorldEngine2.js:444/:1786`); read by `lib/citizenDials.js`. "Accumulating" is the bounded 20-entry buffer — working as designed.
- **UsageCount: mechanism WIRED, feeder starves.** Increment+tier promote live (`processAdvancementIntake.js:285-301`, ≥3→T3 ≥6→T2 ≥9→T1) but only on **exact** First+Last match from Citizen_Media_Usage (`:279-280`). Misses = silent. Fix: reuse fuzzy/honorific matcher from `scripts/ingestPublishedEntities.js`. Note `pairMarriedCitizens.js:250` depends on UsageCount — preserve on merge.
- **YearsInCareer (AI): WIRED** (`educationCareerEngine.js:274/:288/:299`). **CareerMobility (AJ): WRITE-ONLY** (`:343`, no reader). **SchoolQuality (AG): DEAD** — engine reads Neighborhood_Demographics `SchoolQualityIndex` instead (`:428`).
- **Migration cols:** DisplacementRisk (AL) + MigrationIntent (AM) **WIRED** (written `migrationTrackingEngine.js:148/:293-294`; read by civic/initiative packets + `generateCitizensEvents.js:2118`). MigrationReason/Destination/MigratedCycle/ReturnedCycle (AN–AQ) **DEAD** — no live code moves citizens; city-level decision confirmed in code.
- **Middle (C): near-dead** — never generated, one display reader (`citizenContextBuilder.js:253`).
- **Reclaimable columns (~10-12):** DEAD: AG SchoolQuality, AN–AQ migration×4, AT CitizenBio. WRITE-ONLY: AJ CareerMobility, AB InheritanceReceived, Q Last Updated, P CreatedAt. Near-dead: C Middle, E OriginGame, N OriginCity, AK LastPromotionCycle (self-contained).
- **Unified citizen intake: NEW-BUILD on existing skeleton.** `processAdvancementIntake.js` already does name+partial-details→`deriveCitizenProfile_` completes row (`:513-524`), AND has the existing-name bump-not-duplicate branch (`:279-306`). Live add-paths today: processIntake_ (Intake tab), checkForPromotions_, processAdvancementIntake_; Node feeders editionIntakeV3.js → Citizen_Usage_Intake. Build = one canonical intake tab + category base salaries (Economic_Parameters has role/income table, 198 rows) + fuzzy-name guard (ingestPublishedEntities.js has honorific/alias tests) + shut off direct-write practice. → adopt; spawns its own plan.

### 13. Election_Log — candidates EXIST, campaign arc doesn't
`runCivicElectionsv1.js` builds a challenger pool from Tier 2-3 civic-adjacent citizens (`:145-195`), generates named challengers per seat (`:242-287`), resolves via IncumbentAdvantage+econ+sentiment. No multi-cycle campaign (polling/debates/fundraising). → Mike's call: single-cycle named-challenger model may be enough; campaign arc is an optional depth build.

### 14. Riley_Digest / Cycle_Packet / Media_Briefing / Edition_Coverage_Ratings / Reflection_Intake
(Lane-5 findings — appended on completion of the media-pipeline investigation, same day.)

---

## Not applicable / hazard

- Do NOT delete Event_Arc_Ledger or Narrative_Bridge tabs before the build-or-retire decision — Event_Arc data is read by citizenContextBuilder (citizens remember crises).
- Sports fix must NOT gate `applyGameNightMoments.js` — it's the correct feed-driven model, keep it.
- Column reclaims on SL are schema surgery — measure-twice, SCHEMA_HEADERS regen + SIMULATION_LEDGER.md same commit.
- Legacy spreadsheet copies contain plaintext API keys in tabs (GitHub_token etc.) — real-world credential hygiene issue, flagged to Mike S302.

## Verdict

**adopt** (multiple bounded fixes + two new-system plans). Routing: sports gate, byline wire, business pool, UsageCount fuzzy feeder = small engine fixes; Oakland Hospital + unified citizen intake = plan docs; arc spawner + Narrative_Bridge + campaign arc + WorldEvents pool refresh = Mike decisions; ripple readers already tracked in engine.45.

**Ignited plans:** none yet — ROLLOUT rows + plans follow Mike's pick from the disposition table (S302).

---

## Applications (living)

- 2026-07-07 — Created from Mike's Drive list; grounds the S302+ engine wiring sprint.

---

## Changelog

- 2026-07-07 — Initial extraction (S302). Lanes 1-4 complete; lane 5 (media pipeline) pending at first write.
