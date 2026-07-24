# Event Pools — Citizens' Lives Dictate What Fires (engine.67)

**Status:** DESIGN COMPLETE (S325) — matrix done, ALL rulings taken, build not started
**Owner:** engine-sheet | **ROLLOUT:** engine.67 | **Parent:** [[../engine/ROLLOUT_PLAN]]
**Sources:** 38-file generator audit, S325 (4-agent sweep, records in Appendix A–D)
**Related:** [[2026-07-01-persistence-seams-content-ledger]] (ECL build), [[../SIM_DOCTRINE]] (rules 9–12), [[2026-07-13-family-household-loop-build]] (engine.57)

## North star (Mike, S325 — verbatim intent)

> "The wiring of this is what creates the unique outcomes — how a citizen, its household with heritage alter what fires at them."

The citizen row + household + heritage line is the **antenna**. The grid (event generators) delivers to the antenna. Today most generators broadcast identically to everyone; the build makes the antenna determine reception. Grid rule: **no loose ends** — every generator either citizen-conditions or is explicitly classed city-level.

## Rulings taken (Mike, S325)

1. **Impossible content = HARD GATE.** A 6-year-old doing rent math is impossible, not improbable. Merely-unlikely content is down-weighted, not gated.
2. **Matrix is an MD** (this doc) + **sheet wiring-ledger GO** — `Event_Wiring_Ledger` tab created S325, 38 rows, rendered view of this matrix (repo MD = source of truth; regen tab on matrix change, same-commit rule).
3. Cheap-model agents for grunt work (sweep executed this way).
4. **Family simultaneous events: BOTH** quiet shared moments AND shared crises/celebrations that ripple — **skewed to rarity** (household lottery fires seldom; a shared crisis is a season-defining event, not weekly texture).
5. **Heritage ↔ city events: BOTH directions** — city events name/host heritage families AND heritage milestones spawn city events.
6. **Status-leak repairs fold into the gate build** (no separate pre-fix pass) — one gate ships once, closes deceased-in-chaos-cars, retiree-promotions, and the rest at the same choke point.

---

## 1. The conditioning matrix (truth map, S325)

Legend: ✅ real gate · ⚠️ partial · ❌ absent. "Wealth" = does WealthLevel/Income condition anything.

### Citizen-facing generators (need the gate)

| # | Generator | Age | Status | Wealth | Household | Heritage | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | chaosCarsEngine | n/a by design (chaos hits any age — S325 ruling) | ✅ **S325 step 2** | ❌ | ❌ | ❌ | Gone-status unpickable; proven C105/C106 |
| 2 | generateCitizensEvents | ✅ **S325 step 1 — life-state hard gate v2.9** | ✅ | ⚠️ 2 add-only lines | ⚠️ chaos-local shared line | ❌ | Pool filtered before draw; child/teen bands live; proven C103-C111 |
| 3 | generateGenericCitizenMicroEvent | ⚠️ content is universal-class | ✅ **S325 step 3** | ❌ | ❌ | ❌ | Gone draw no texture |
| 4 | generateGameModeMicroEvents | ❌ | ✅ | ❌ | ❌ | ❌ | Role-gated pools only |
| 5 | generateCivicModeEvents | ❌ role-verified | ✅ **S325 step 4** (+traded/pending) | ❌ | ❌ | ❌ | Role-gated |
| 6 | generateMediaModeEvents | ❌ role-verified | ✅ **S325 step 4** (+traded/pending) | ❌ | ❌ | ❌ | Role-gated |
| 7 | runRelationshipEngine | ❌ (bonds world-wide per §7c) | ✅ **S325 step 3** | ❌ | ❌ | ❌ | bondEngine feed clean — gone don't socialize |
| 8 | runCareerEngine | ✅ **S325 step 4 — 18+** | ✅ (+retired) | ❌ | ❌ | ❌ | First CareerStage consumer — retirees done |
| 9 | runEducationEngine | ⚠️ ≥15, no ceiling (lifelong learning OK) | ✅ **S325 step 4** | ❌ | ❌ | ❌ | Gone draw nothing; hospitalized read from bed |
| 10 | runHouseholdEngine | ❌ | ✅ **S325 step 4** | ❌ | ✅ **circumstance pools** | ❌ | Hospital-strain pool stays by design |
| 11 | runNeighborhoodEngine | ❌ | ✅ **S325 step 4** | ❌ | ❌ | ❌ | Gone walk no blocks |
| 12 | runYouthEngine | ✅ 5–22 | ✅ **S325 step 4b** (bench-caught) | ❌ | ❌ | ❌ | C109 caught pending youth; gated |
| 13 | runConductEngine | ✅ **18+ (S320 ruling precedent)** | ⚠️ | ❌ | ❌ | ❌ | The gate precedent — one file, never propagated |
| 14 | generationalEventsEngine | ✅ best-in-class | ✅ | ❌ | ✅ births | ✅ birth odds | Newborns hardcoded T4/Income-0 regardless of parent |
| 15 | bondEngine | ⚠️ romance 20–65; general bonds ❌ | ✅ at lookup | ⚠️ fitness | ✅ marriage | ❌ | Inherits #7's unfiltered feed |
| 16 | checkForPromotions | ✅ **S325 step 4 — minor guard** | ✅ | ❌ | ❌ | ❌ | Child GC emerges as student, zero economics (S320 convention) |
| 17 | processAdvancementIntake | ✅ family-match age-band+hood+sex | ✅ | ❌ | ✅ | ✅ slot weighting | **Best gate in system — the model** |
| 18 | applyGameNightMoments | n/a feed-driven | ✅ active only | ❌ | ❌ | ❌ | Direct LifeHistory_Log write — verify exception status |
| 19 | runAsUniversePipeline | structurally safe (UNI+retired) | ✅ | ❌ | ❌ | ❌ | Fine |
| 20 | educationCareerEngine | ✅ stage gates <22/≥65 | ⚠️ | ⚠️ | ✅ settleAdulthood | ✅ 18th-bday draw + SchoolQuality | Whole-ledger scope incl. T1/2 (flag); exact-18 check fragile |
| 21 | generationalWealthEngine | ✅ minors income-0, loop 18+ | ✅ | ✅ owns physics | ✅ | ✅ **owns Heritage_Ledger** | No retirement-income model (CareerStage never read) |
| 22 | householdFormationEngine | ✅ | ✅ FORMS_STATUS | ✅ | ✅ owns | ❌ | Divorce has NO implementation anywhere |
| 23 | migrationTrackingEngine | ⚠️ senior +1 only | ⚠️ deceased only | ✅ rent-burden | ✅ units | ❌ | Universal scope incl. T1/2 (flag) |
| 24 | runYouthEngine→community programs | — | — | — | — | — | covered in #12 |

### City-level (no citizen surface — safe by construction)

worldEventsEngine, buildCityEvents, eventArcEngine (involvedCitizens never populated), faithEventsEngine (org-level; known gap: never attaches POPIDs), textureTriggers (**no consumer found — verify**), cityEveningSystems, buildNightLife, buildEveningFood, buildEveningMedia, buildEveningFamous (REAL_PLAYERS pool occupationally safe), sportsStreaming, applyChaosDecay, applyNamedCitizenSpotlight (event-driven re-ranker, adds no gate), citizenContextBuilder (**unwired, 0 callers**).

City→citizen seam: evening builders → `finalizeCycleState.snapshotEveningForCarryForward_` → `S.previousEvening` → generateCitizensEvents `previousEveningPool_` — **no age/wealth gate at the consuming end** (any-age citizen draws nightlife-buzz texture). ~~Dead carry-forward fields: foodTrend, famousNames~~ **CORRECTED S325: both ARE consumed** — generateCitizensEvents previousEveningPool_ draws them (foodTrend L1040, famousNames L1046); a famousNames line fired live on bench C113 ('overheard someone saw Claire Ashford at OakHouse'). The sweep agent's dead-field claim was wrong; bench observation beats static analysis.

## 2. Structural findings

1. **No shared eligibility layer.** Every engine hand-rolls filters; consistency is accidental. The S320 kid-conduct ruling gated exactly one file.
2. **Wealth conditions almost nothing.** Outside generateCitizensEvents' two add-only lines and wealth physics itself, the event surface is wealth-blind.
3. **Retirement is a broken life-state.** `CareerStage='retired'` is written (educationCareerEngine L303-06) and read by nobody.
4. **ECL authoring vocabulary cannot say "child"** — ageband enum locked to youth(0-22)/youngAdult/adult/senior; no occupation/tier/heritage/lifestate fields (loader L60-69).
5. **Status leaks:** deceased/traded pickable by chaos cars; no status check at all in relationship/education/household/neighborhood engines.
6. **Dead wiring:** citizenContextBuilder (0 callers), foodTrend/famousNames carry-forwards, divorce unimplemented, settleAdulthood_ exact-18 fragility, textureTriggers consumer unverified.

## 3. Design — the life-state gate

**One shared helper, adopted by the ~17 citizen-facing generators.** Home: `lib`-level or a new shared phase05 helper — decision at build time; citizenContextBuilder is unwired and heavy (full profile build), so the gate is a **lean derivation**, not a wiring of that file.

```
deriveLifeState_(row, hdr) -> {
  band:      child|teen|youth|adult|senior     // age = 2041 - BirthYear, computed live (age-anchor convention)
  working:   student|working|retired|none     // EducationLevel + CareerStage + Status + Occupation
  status:    active|hospitalized|recovering|retired|deceased|traded|pending
  household: {id, hasKids, married}           // HouseholdId, NumChildren, MaritalStatus
  wealthBand: tight|mid|comfortable           // WealthLevel <=3 / 4-7 / >=8
  heritageTier: none|Founding|Established|Prominent|Dynasty  // via heritageTierByPop_ (lagged read, engine.65 pattern)
}
isEventEligible_(lifeState, eventClass) -> boolean   // HARD gate: impossible combinations return false
```

Age bands split `youth(0-22)` into **child ≤12 / teen 13-17 / youth 18-22** — the current single band is why authors and pools can't distinguish a toddler from a college student.

**Event classes** (tag-level, mapped from existing `source:*` tags — no pool rewrite): work, money-adult, nightlife, romance, school, play, civic-office, retirement, universal. Gate table = small matrix (lifeState × class → allowed). Impossible per ruling #1: child×work, child×nightlife, deceased×anything, traded/pending×anything, retired×career-transition, non-married×divorce, etc.

**Adoption order** (volume-first): 1) generateCitizensEvents (pool filter before draw, L1926 assembly) 2) chaosCarsEngine (eligible-pick filter) 3) GC micro-events 4) runRelationshipEngine (filter + fixes bondEngine's inherited feed) 5) mode engines 6) career (age + retired read) 7) education/household/neighborhood status checks 8) checkForPromotions minor guard. Each adoption = one commit, groundhog-proven before next.

## 4. Design — ECL deepening (SHIPPED S325 steps 5a/5b)

1. **DONE (5a, d1d28693):** DSL +5 fields — `lifestate`, `band` (6-band, child/teen addressable), `occupation`, `tier`, `heritage`; condScopes extended same commit; loader suite 17→23 green. Heritage scope rides Phase-4's cached lagged read.
2. **DONE (5b, 2865dfe9 — root-cause find):** the ledger has NO `Occupation` column (job = `RoleType`); `idx("Occupation")` was −1 since the rename, so the hardcoded work pool NEVER fired for anyone and `lifeState.working` starved. RoleType fallback wired — bench work texture went 0 → 19 events/cycle.
3. **DONE (library preload):** 135 rows authored (75 occupation-specific work moments across the top-25 real ledger jobs, 15 child, 15 teen, 10 retirement-depth, 12 wealth-band incl. the missing 4-7 middle, 8 heritage), every row validated through the real loader (parity-by-execution, 0 skipped), tagged `auth:library-s325`. **Bench: active, proven C112-C113 — 80 library lines fired, 0 condition mismatches. Live: preloaded Active=no — Mike's kill switch; activate per-row or in blocks to turn the library on.**

## 5. Design — family simultaneity (RULED: both, skewed to rarity)

Generalize the chaos-local household shared-line mechanism (generateCitizensEvents L1978-90, deterministic HouseholdId hash): a per-cycle **household event lottery** — rare draw, same text all members, each member's LifeHistory gets it from their own angle. Two tiers per Mike's ruling: **quiet shared moments** (the common face of rare — dinner-table, weekend outing) and **shared crises/celebrations that ripple** (job loss, windfall, milestone — rarer still, season-defining, feeds storyHooks). Rarity is the design constraint: this is 1:443 qualitative sampling, not weekly texture. Cost: one new pool + hash-variant pattern already proven.

## 6. Design — heritage ↔ city events (RULED: both directions)

Heritage_Ledger reaches: births (odds), drip (slot weight), 18th-birthday draw, SchoolQuality. It does NOT reach buildCityEvents/worldEventsEngine. Build both lanes: **(a)** city events name/host heritage families — buildCityEvents draws from Heritage_Ledger lines for event naming/hosting ("the Keane block party"), tier-weighted so Established+ lines surface more; **(b)** heritage milestones (founding, Prominent/Dynasty promotion, heritage business opening) spawn city events the following cycle. Mechanism both lanes: lagged `heritageTierByPop_` read in phase04 (engine.65 pattern already proven).

## 7. Sheet wiring-ledger (RULED: GO — SHIPPED S325)

Rendered view, not a second truth: this MD (repo) is the source; `Event_Wiring_Ledger` tab (created S325, 38 rows: Generator | Class | Phase | AgeGate | StatusGate | WealthGate | HouseholdGate | HeritageGate | Volume | Verdict | AuditSession) is the grid view in the sheets. Regenerate the tab whenever the matrix changes — same-commit rule, engine.md discipline. As the build closes gaps, NO cells flip to YES and the grid lights up. Push mechanism: direct lib/sheets.js write (one-off scratchpad script v1; mechanize only if churn warrants).

## 7b. Chaos vehicles as crisis igniters (Mike-direct, S325 mid-build — verified against config)

> "The point of these chaos cars is to create events that shake up the daily repetition and create a crisis — each likely has a generator to attach to: OARI truck with civic initiatives, ambulance with hospital, cop car with crime. This variety all lands in LifeHistory that folds into the citizen TraitProfile dials, so when a citizen cron wakes, its Events is now its voice."

**Verified state (utilities/chaosCarsConfig.js):** the fleet is 10 vehicles — cop_car, fire_engine, **ambulance (exists)**, oari_van, building_inspector, garbage_truck, mail_truck, ice_cream_truck, street_sweeper, pge_truck. The LifeHistory→dials→wake-voice loop Mike describes **already works**: citizen hits write `[dialTag]` LifeHistory lines + DialState chaos accrual (engine.42 trauma accumulator), compressor folds them into TraitProfile, wake-loop reads the result.

**The gap — tags name the domain but never enter it:**
- ambulance `workplace_accident` writes tag `Hospitalized` but does NOT set `Status=hospitalized` — the citizen never enters the hospital lifecycle (no recovery arc, no career-engine income hit, no health-cause chain)
- cop_car `arrested` writes `Transgression-Serious` but never touches the conduct/crime consequence path
- oari_van has `coverageContribution: true` (initiative-coverage seam, partial) but no Initiative_Tracker handoff

**Queued as build step 8 — chaos→domain coupling:** high-severity chaos outcomes hand off into their domain engines (ambulance severity-high → real Status transition into the health lifecycle; arrest → conduct consequence; OARI → initiative coverage), so a chaos event isn't just remembered — it CHANGES the citizen's running life-state, and the life-state gate then shapes everything that fires after. Crisis becomes causal, not decorative.

## 7c. Bonds are world-wide (Mike-direct, S325 mid-build — queued as step 9)

> "Bonds are world-wide, Tier 1 – Tier 5. Anyone can get married, anyone can become enemies, anyone's faith can grow and choose a faith ledger. It's just always random and never forced. Citizens have to have enough in common to have a chance at romance, a minimum to get along, and a threshold to clear to like each other at all. Likely to have more exposure to people in similar jobs or neighborhoods — but if this gets too complex we can look for easier ways."

**Verified vs current bondEngine:** the pool is fed by `S.cycleActiveCitizens`, which runRelationshipEngine populates from **Tier-3/4 ENGINE citizens only** — so Tier-1/2 named citizens mostly enter only via other engines' actives, and Tier-5 GCs only through the separate GC-courtship door. Not world-wide yet. Compatibility physics partially exist for ROMANCE (bondFitnessOf_: education/savings/debt; bondFamilyFactor_ trait dial; T1×T1 rarity), and exposure affinity partially exists (same-neighborhood neighbor bonds, shared UNI/MED/CIV domain tension/rivalry). What does NOT exist: any compatibility floor for non-romantic bonds ("minimum to get along," "threshold to like each other at all"), cross-tier general pool, job-similarity exposure, and faith entirely — no Faith column on any citizen, zero faith references in bondEngine, no faith-affiliation ledger membership.

**Step 9 SHIPPED S325 (Mike approved all four rulings — rivalry route, faith-on-org-ledger, T5-via-doors, dials tunable on bench):**
- **9a (8aa35dcf):** `bondCompatibility_` 0-10 (hood +3, 8 keyword job families +2, age ≤10y +2/≤20y +1, life-stage +1, trait warmth 0-2). Thresholds: <3 never bond; 3-5 get-along lane AND where enemies breed (proximity-friction TENSION branch — same block/trade + low compat); ≥6 friendship lane (neighbor 0.2→0.3, same-trade FRIENDSHIP branch) + romance flip requires compat ≥6 on top of all existing physics. Unknown metadata never hard-bars. BirthYear enrichment added to the bond name-lookup.
- **9b (a167d3d4):** faith — membership on `Faith_Organizations.MembersList` (heritage pattern, schema-armed column). Drawn `source:faith` texture = exposure → `S.faithExposures` → `processFaithJoins_` rolls 8% per exposure; congregation picked in the citizen's own hood; one at a time; 0.3%/member/cycle drift-away. `[Faith]` LifeHistory lines both directions.
- **Bench proof (C107-C109 post-acceptance bench):** first congregation member joined (POP-00664 → Lakeshore UU Fellowship), both compat lanes formed bonds, bond volume unchanged (342→348), 0 errors. LIVE-pushed with the stack.
- **T5 doors ruling:** GCs bond via existing doors (crossings/courtship/promotion-seeds) — no full-pool scan; no code change needed.

## 8. Final sweep — DONE S325 (agent audit, all remaining surfaces)

## 9. engine.68 — Cultural_Ledger joins the antenna (Mike-approved S325)

> Mike, verbatim: "Fame is its own attention and seeds more media attention and another level of event promotion."

Audit (agent, S325): POPID linkage (UniverseLinks) IS written on the cycle path since engine.44 but has ZERO cycle-path readers — fame conditions nothing. Fame is monotonic (no decay, Status permanently Active). Two writers with non-reconciling ID schemes (sightings + Dynasty). culturalFigure lookup built-but-unwired (name-match, wrong shape for cycle use). Dead: parseMediaIntake_ (zero callers). Dormant: ensureCultureLedger 17-col stale header.

Rulings (Mike, S325): plan approved in full; threshold FameScore >= 25 (the existing handoff cutoff); decay approved (quiet fame fades, namings refresh); hygiene folded in; fame COMPOUNDS — famous citizens' events seed media attention (watch-hooks) and event promotion (evening sightings, recognition scaling).

Build shape:
- 68a: culturalStatusByPop_ cached per-cycle map (heritage-read pattern); ECL condition fields `fame` (num) + `culdomain` (str); condScopes supply; recognition pool scales with FameScore (>=25 activates, weight by band; UsageCount>=8 path retained).
- 68b: compounding — high-fame citizens' drawn events roll a FAME_WATCH storyHook (media attention seed, scaled by fame); evening famous-sightings REAL pool widens from MLB-only to any SL citizen with cultural FameScore >= 25 (the city sees its own famous).
- 68c: decay (LastSeenCycle > 10 cycles stale -> FameScore -1/cycle, floor 0) + hygiene (20-col create header; Dynasty writer name-dedup; parseMediaIntake_ dead-flagged, not deleted).

**Next wiring target (Mike-direct S325): Cultural_Ledger** — audit its writers/readers (citizenFameTracker, culturalLedger v2.5 intents, registerCulturalEntity_ sightings, Dynasty rows from generationalWealthEngine) and wire cultural entities into the citizen antenna the way heritage was: who a citizen is culturally should shape what fires at them. Design pass first, engine.68 row.

**Clean (world-state only, no citizen surface):** civicInitiativeEngine (officeholder status guards present; fallback path checks fewer statuses — minor, low blast radius), neighborhoodTrajectoryEngine (= renamed gentrificationEngine), economicRippleEngine, storylineHealthEngine, processArcLifeCycle, updateStorylineStatus, applyMigrationDrift.

**Findings:**
1. **storylineWeavingEngine assigns dramatic roles to free-text citizen names with ZERO status/age checks** — a deceased/traded name in `Storyline_Tracker.RelatedCitizens` keeps its protagonist/antagonist role indefinitely. Parked: follow-up row when storyline layer is next touched.
2. **`involvedCitizens` — WIRED S325 (b8e5bb42 + 95e8d5b6):** generational writers populate subject + household at all 3 arc-creation sites; same-cycle consumers (bond arc-proximity, relationship arc boosts, spotlight) now receive real citizens. Cross-cycle persistence (v3LedgerWriter header-located append + preLoader parse) shipped but INERT by design — the S313 Mike ruling disabled the whole arc save/reload loop ('stories are seeded, never re-ingested'; 36 zombie arcs C82-C101). If that loop ever rewires, the people ride along day one.
3. **textureTriggers is NOT dead** (corrects §1's earlier note) — two live consumers: Texture_Trigger_Log writer + applyStorySeeds story-seed conversion (engine.41).
4. **Faith→citizen bridge exists** via generateCitizensEvents faithPool_ neighborhood fan-out (engine.33 T9) — which is exactly the exposure channel step 9b's faith joins ride.
5. **Chaos→hospital handoff verified mechanically sound** — health lifecycle gates purely on Status strings that chaos writes exactly; **caught + fixed same-session:** chaos HealthCause was a machine tag that would leak verbatim into death prose and permanently exclude the citizen from the Media-Room cause queue → now writes human prose ('a workplace accident' / 'a sudden medical emergency').
6. healthCauseIntake has no traded/pending guard on queue inclusion — minor, parked.

---

# Appendix — per-generator audit records (S325 sweep, 4 agents)

Records below are the raw condensed audit output; line numbers cited against HEAD at S325.

## A. phase04 event generators


FILE: phase04-events/chaosCarsEngine.js
ENTRY: runChaosCarsEngine_(ctx) (L407)
EMITS: citizen scope: LifeHistory col-O append [dialTag] (L218-244), DialState chaos accrual (L255-263), LifeHistory_Log queueAppendIntent_ (L270-273); business scope: chaosBusinessFold -> Business_Ledger intents (L279-314); neighborhood scope: chaosNeighborhoodFold via PropertiesService -> v3NeighborhoodWriter (L321-396); chaos_cars row (L479); S.chaosCarsEvents/tier1ChaosEvents (L480-481).
TARGETS: uniform-random over ALL ctx.ledger.rows — no tier/mode/status filter (L115, L123-124).
COLUMNS READ: POPID, Tier, Neighborhood (output only), LifeHistory, LastUpdated, First, Last, DialState.
CONDITIONING: NONE citizen-side — pick is uniform; Tier read only for post-pick cascade flag (L449); outcome pool filtered by vehicle tag, not citizen.
LIFE-STATE GAPS: no age guard (child can draw adult chaos event); no wealth guard (poor citizen can draw luxury-car flex); no occupation/household; **no Status filter — deceased/traded/pending pickable**; no per-citizen dedup within cycle.
VOLUME: 3-15 events/cycle across all scopes (L23-24, L56-58).
HERITAGE: no.

FILE: phase04-events/generateGenericCitizenMicroEvent.js
ENTRY: generateGenericCitizenMicroEvents_(ctx) (L23)
EMITS: LifeHistory col-O (L551-552), LastUpdated (L554), batched LifeHistory_Log (L582-585), S.eventsGenerated (L572), S.microEvents (L587), recordPulse_ (L570).
TARGETS: SL rows, ClockMode===ENGINE (L440), excludes UNI/MED/CIV flags (L441).
COLUMNS READ: POPID, First, Last, Tier, ClockMode, UNI/MED/CIV, LifeHistory, LastUpdated, Neighborhood, DialState (L34-45).
CONDITIONING: Tier gates fire chance (t<=1: .50, t2: .25, else .10 L448-450); LifeHistory thinness boosts up to 5x (L453-457); Neighborhood steers content pool (L495-538); DialState outabout mult (L488-489). Content otherwise identical for all.
LIFE-STATE GAPS: no BirthYear/age read — same pool for 5yo and 70yo; no wealth/income; no occupation/household/marital; **no Status filter (only ClockMode)** — deceased could draw if still ENGINE.
VOLUME: EVENT_LIMIT=25/cycle (L81); chance cap 0.12; global text dedup (L396-420).
HERITAGE: no.

FILE: phase04-events/generateGameModeMicroEvents.js
ENTRY: generateGameModeMicroEvents_(ctx) (L34)
EMITS: LifeHistory col-O (L530-531), batched LifeHistory_Log (L570-573), S.gameModeMicroEvents + details (L576-577).
TARGETS: ClockMode===GAME only (L488); excludes Status inactive/deceased/retired/traded/pending (L489-490).
COLUMNS READ: POPID, First, Last, Tier, ClockMode, UNI/MED/CIV, RoleType, Status, LifeHistory, LastUpdated, OriginGame, TraitProfile, DialState (L48-62).
CONDITIONING: getCitizenType_ (L352-381) — RoleType/flags steer pool selection (real content gating); TraitProfile archetype flavor sub-pool for MLB (L417-422); Tier boosts chance; DialState outabout mult.
LIFE-STATE GAPS: no age read; no wealth; no household. RoleType is sole differentiator, not cross-checked vs BirthYear.
VOLUME: EVENT_LIMIT=15 (L441); base 0.04 cap 0.15; per-citizen text dedup.
HERITAGE: no.

FILE: phase04-events/generationalEventsEngine.js
ENTRY: runGenerationalEngine_(ctx) (L176)
EMITS: LifeHistory milestones (applyMilestone_ L1357-1388), LifeHistory_Log (L1368-74), structural: Status/StatusStartCycle/HealthCause transitions, NumChildren++ (L370/390/945), new child rows createChildRow_ (L868-996), HouseholdId single-parent (L1031), Household_Ledger/Family_Relationships direct (L953-992, L1011-27), S.generationalEvents/hospitalEvents/pendingCascades/eventArcs, bond severing on death (L1257).
TARGETS: all SL rows; excludes deceased/inactive/traded/pending (L274-275, retired stay); health transitions all modes; new milestones ENGINE||CIVIC only (L333).
COLUMNS READ: POPID, First, Last, BirthYear, Tier, ClockMode, Status, LifeHistory, LastUpdated, TierRole, CIV, Neighborhood, StatusStartCycle, HealthCause, MaritalStatus, NumChildren, DialState, HouseholdId, Gender (L186-209).
CONDITIONING: BEST-IN-CLASS — age gates every milestone (AGE_RANGES L78-85); HouseholdId gates births (L811-812); MaritalStatus==married gates births (L816); Gender gates single-motherhood (L382/919); Tier steers promotion odds (L1042-44) + health tierMod (L529-30) + death cascade arcs (L1282); DialState familyFreq/careerFreq mults (L774-76, L829-31, L1049-50); heritage birth mult (L836-39); LifeHistory tag dedup.
LIFE-STATE GAPS: no WealthLevel/Income/Occupation read — promotion/retirement/health/death odds wealth-blind; DisplacementRisk never read; retirement only age>=68+CIV check; **createChildRow_ hardcodes Tier=4/Income=0/Pre-K regardless of parent wealth/tier — no inheritance at birth**.
VOLUME: seasonal caps (L696-715): grad 2(4 spring), births 1(2 Sep), promo 2, retire 1(2 Dec/Jan), deaths 1; health transitions uncapped; single-motherhood uncapped.
HERITAGE: YES — heritageTierByPop_(ctx.ss) L237-38 (lagged 1 cycle), birth-odds mult in checkBirth_ (L836-39).

FILE: phase04-events/worldEventsEngine.js
ENTRY: worldEventsEngine_(ctx) (L47)
EMITS: S.worldEvents[] texture objects (L399-412); no sheet writes; no citizen touch. WorldEvents_Ledger read for dedup only (L289-308).
TARGETS: city-level, no citizen loop.
CONDITIONING/GAPS: N/A — no citizen surface.
VOLUME: 1-3 base, cap 6 pre-suppression (L255-277); 5-cycle dedup.
HERITAGE: no.

FILE: phase04-events/buildCityEvents.js
ENTRY: buildCityEvents_(ctx) (L39)
EMITS: S.cityEvents, S.cityEventDetails {name, neighborhood, tags, weight}, S.cityEventsCalendarContext (L664-687). No sheet writes. Consumed downstream (prevEvening fan-out etc).
TARGETS: city-level; no ctx.ledger reference.
CONDITIONING/GAPS: N/A — calendar/weather/sentiment/economy weighted pools only. NO heritage/citizen hook — this is the heritage-city tie-in target.
VOLUME: 3-4 base, floor 4 major holidays/FF, floor 5 championship/Pride/ArtSoul (L612-618).
HERITAGE: no.

FILE: phase04-events/eventArcEngine.js
ENTRY: eventArcEngine_(ctx) (L105) — now Phase-8 preload only.
EMITS: mutates arc.tension/phase/cycleResolved on S.eventArcs[] (L344-375); no sheet writes; arcs created elsewhere (generational cascades).
TARGETS: city-level; involvedCitizens always empty (never populated/consulted).
CONDITIONING/GAPS: N/A citizen-side.
VOLUME: max 10 active arcs; staleness pruning (L369-75).
HERITAGE: no (Creation Day heritage arcs = naming only, L283).

FILE: phase04-events/faithEventsEngine.js
ENTRY: runFaithEventsEngine_(ctx) (L79)
EMITS: batchRecordFaithEvents_ (L160-62), recordPulse_ (L168-76), recordRipple_ targetScope 'faith' — org names NOT citizen POPIDs (L184-201), S.faithEvents (L204-12), S.worldEvents append (L214-30). No ctx.ledger touch.
TARGETS: faith orgs, not citizens.
CONDITIONING/GAPS: org-level only (tradition/congregation/season/sentiment). Known gap: faith events never attach to citizen POPIDs.
VOLUME: MAX_FAITH_EVENTS=5/cycle (L150); per-type probs L39-45; interfaith 0-2.
HERITAGE: no.

## B. phase05 mode/texture + promotion engines


FILE: phase05-citizens/generateCivicModeEvents.js
ENTRY: generateCivicModeEvents_ (engine2 L280/L1856)
EMITS: LifeHistory col-O (L467-68), LastUpdated, batched LifeHistory_Log "CIVIC-Event" (L507-08), S.civicModeEvents/Details (L512-13).
TARGETS: ClockMode===CIVIC (L392); excludes inactive/deceased (L393).
COLUMNS READ: POPID First Last Tier ClockMode RoleType Status LifeHistory Neighborhood + Civic_Office_Ledger (PopId/Title/Faction L523-563).
CONDITIONING: Tier +chance (t1 +.05/t2 +.03); Status health penalty x0.3/x0.6 (L397-402); CivicRole selects pool (L437-456); faction OPP/CRC steers lines (L188-193).
LIFE-STATE GAPS: zero age/wealth/household checks — role-based gating only.
VOLUME: base 0.15, cap 0.40 (L430-31); per-cycle text dedup only, no citizen cap.
HERITAGE: no.

FILE: phase05-citizens/generateMediaModeEvents.js
ENTRY: generateMediaModeEvents_ (engine2 L281/L1857)
EMITS: same pattern, "MEDIA-Event" log (L467-69), S.mediaModeEvents/Details (L473-74).
TARGETS: ClockMode===MEDIA (L344); excludes inactive/deceased.
COLUMNS READ: POPID First Last Tier ClockMode RoleType Status LifeHistory Neighborhood. Role from RoleType substring only (getMediaRole_ L92-108).
CONDITIONING: Tier +.10/+.05; health penalty; RoleType selects pool (L390-418); culturalActivity/sportsSeason flavor.
LIFE-STATE GAPS: zero age/wealth/household checks.
VOLUME: base 0.20, cap 0.45 (L383-84).
HERITAGE: no.

FILE: phase05-citizens/applyGameNightMoments.js
ENTRY: applyGameNightMoments_ (engine2 L263/L1839); gated on S.sportsFeedEntries (L73-74).
EMITS: [Sports] LifeHistory line per named player (L116-18); **DIRECT LifeHistory_Log setValues write L138-39 — flagged as possible undocumented direct-writer (tech debt check)**; recordRipple_ targetScope citizen (L143-158).
TARGETS: named players from feed namesUsed, matched vs active-Status rows only (L85-91). No tier/mode filter.
CONDITIONING: feed streak/playerMood pick text bucket — event-context, not citizen columns.
LIFE-STATE GAPS: no age/employment guard — trusts feed names are roster players.
VOLUME: deterministic per named player, no cap.
HERITAGE: no.

FILE: phase05-citizens/applyNamedCitizenSpotlight.js
ENTRY: applyNamedCitizenSpotlights_ — NOT in safePhaseCall lists (gated on S.engineEvents + ctx.namedCitizenMap L48-49). Verify wiring.
EMITS: summary only — S.namedSpotlights, S.spotlightStats (L502-517). No sheet writes.
TARGETS: ctx.namedCitizenMap members appearing in S.engineEvents.
CONDITIONING: pure event-driven scoring (domain/severity/neighborhood/arc/calendar weights); threshold base 6 floor 3 (L459-475).
LIFE-STATE GAPS: inherits upstream blindness; adds no gate.
HERITAGE: no.

FILE: phase05-citizens/checkForPromotions.js
ENTRY: checkForPromotions_ (engine2 L296/L1872)
EMITS: mints full Tier-4 SL row (L519) w/ ~20 cols incl Income/EducationLevel/NetWorth derivations (L423-437); direct LifeHistory_Log appendRow (L526-534); GC Status='Emerged' setValue (L540-547); S.promotions.
TARGETS: Generic_Citizens Status==='Active' + EmergenceCount>=3 (L366-369). Promotes at Tier 4.
COLUMNS READ (GC): First Last Age BirthYear Neighborhood Occupation EmergenceCount Status Sex.
CONDITIONING: EmergenceCount>=3 hard gate; promotionChance(0.20) world-modified [0.05,0.45] (L347-48); neighborhood/occupation steer FF bonus only.
LIFE-STATE GAPS: **no minor guard — child-age GC row promotes with adult economic derivation (contrast processAdvancementIntake's advIsMinor L629-637)**; MaritalStatus hard-set 'single' (intentional); no wealth plausibility check on lookupIncome_ vs age.
VOLUME: no per-cycle count cap (unlike DRIP_CAP_PER_CYCLE=2 in sibling).
HERITAGE: no.

FILE: phase05-citizens/processAdvancementIntake.js
ENTRY: processAdvancementIntake_ (engine2 L306/L1882) + manual path. Orchestrates processMediaUsage_ -> checkEmergencePromotions_ -> checkFamilyMatchPromotions_ -> processAdvancementRows_ -> seedEmergenceBonds_ -> processIntakeRows_.
EMITS: UsageCount/Tier bumps (thresholds 9/6/3 L417-426); Advancement_Intake1 appends; new SL mints w/ deriveCitizenProfile_; family wiring (SpouseId/ParentIds/ChildrenIds/HouseholdId both sides + FAMILY_REALIZED storyHook L1160-70); FRIENDSHIP bonds (L1180-1232).
CONDITIONING: EmergenceCount>=3; DRIP_CAP_PER_CYCLE=2 shared; **family-match = the ONE real life-state gate in this set: age-band (spouse ±10, parent 18-45) + same-neighborhood REQUIRED + sex-compat REQUIRED (L1025-1028)**; heritage rank weights slot draw (L1013-17); minor guard advIsMinor on income re-derivation (L629-637).
LIFE-STATE GAPS: processMediaUsage_ tier bumps age-blind; emergence promotion age-blind (child GC can promote); new-mint BirthYear fallback hardcoded 2003 (L658); no economic-plausibility check on family matches.
VOLUME: threshold 3; cap 2/cycle; family slot 20% fire rate per remaining slot.
HERITAGE: YES — heritageTierByPop_ (L911), heritageRank_ weights open-slot draw (L1013-17).

FILE: phase05-citizens/generateGenericCitizens.js
ENTRY: generateGenericCitizens_ (engine2 L258/L1834)
EMITS: mints Generic_Citizens rows (First Last BirthYear Neighborhood Occupation EmergenceCount=0 Status Sex LifeHistory).
CONDITIONING: pool-floor gate F60/M40 (L321-340) — zero mints when pool at floor; scarce-sex-first queue.
LIFE-STATE GAPS (design-relevant): BirthYear uniform 1966-2023 (ages 18-75) — **GC pool mints NO children**; no life-stage column written; no economics until promotion.
VOLUME: base 1-2 +modifiers cap 5, hard ceiling 8/cycle via fillCount (L335); name caps 3/4.
HERITAGE: no.

FILE: phase05-citizens/citizenContextBuilder.js
STATUS: **UNWIRED — zero production callers repo-wide** (buildCitizenContext/formatCitizenForMediaRoom/getCitizensForQuotes/getReturningCitizens all have no external consumers). Manual/LLM-prompt utility + Apps Script editor diagnostics.
API: buildCitizenContext(identifier) -> profile {id, name, age (2041-BirthYear, guarded), neighborhood, occupation(=RoleType), tier, history (LifeHistory_Log), relationships (Relationship_Bonds), mediaAppearances, arcExposure, culturalFigure, voice, sentiment, currentConcerns, cyclesInOakland}.
NOTES: GC fallback path dead (S205 Path B, archaeology L234-236); getCitizensForQuotes uses raw Math.random (L1064) — violation if ever cycle-wired.
IMPLICATION: candidate home for shared life-state gate BUT currently inert — generators do own duplicated header-index reads; wiring cost is real. Alternative: lib-level helper the generators call directly.

## C. phase05 lifecycle engines


bondEngine.js — runBondEngine_ (Phase5-Bonds, after Promotions)
EMITS: relationshipBonds -> Relationship_Bond_Ledger; LifeHistory [Bond]/[Wedding] lines; Household_Ledger + Family_Relationships on marriage; storyHooks.
TARGETS: pool = ctx._bondActivePool from S.cycleActiveCitizens (fed by runRelationshipEngine). SL fallback excludes deceased/retired/inactive/traded/pending (L507-08). Romance: both single, AGE_RANGES.WEDDING 20-65, opposite gender (L1648).
GAPS: general bond formation NOT age-gated (relies on upstream, which has NO age gate); pool members stay eligible after Status change; tier only modulates romance speed.
VOLUME: maxNewBonds 2-4; romance step 20-22%/cycle dice (66e); GC courtship 20% of cycles; marriage uncapped (physics).
HERITAGE: no.

runYouthEngine.js — runYouthEngine_
TARGETS: named citizens age 5-22 (good gate), Status != deceased only. No mode/tier filter (differs from convention).
CONDITIONING: school-level probs (.15-.25) x calendar x hood QoL x Drive dial; QoL/hotspot event-type overrides; community program naming 25%.
GAPS: hospitalized/traded/pending youth still draw; no household check.
VOLUME: 25/cycle, 5/neighborhood. HERITAGE: no.

runConductEngine.js — runConductEngine_
TARGETS: ENGINE T3/4, not UNI/MED/CIV, **age>=18 (S320 kid-age ruling L171 — THE gate precedent)**, requires DialState (inert without).
CONDITIONING: heavy dial-bias; crimeReachable only integrity band -2 (98%+ locked out).
GAPS: no retiree/senior distinction; no hospitalized/traded status check.
VOLUME: LIMIT=3. HERITAGE: no.

runCareerEngine.js — runCareerEngine_
TARGETS: ENGINE T3/4 not UNI/MED/CIV; skips traded/pending/deceased (L705-06); hospitalized/critical = income-hit only; recovering = no transitions.
CONDITIONING: drift base .02 cap .14 x Drive dial; transition sub-model w/ macro pressure, tenure, CareerMobility (1.25x/1.4x); 6-cycle transition gap; income only if EconomicProfileKey.
GAPS: **NO AGE GATE AT ALL (no BirthYear ref in file)** — child/90yo eligible for promotions; **CareerStage='retired' NEVER READ — retirees can get career transitions**; wealth-blind.
VOLUME: LIMIT=10. HERITAGE: no (educationCareerEngine settleAdulthood_ feeds EconomicProfileKey).

runEducationEngine.js — runEducationEngine_
TARGETS: ENGINE T3/4 not UNI/MED/CIV, age>=15 (L347-51). **No Status check at all (no iStatus)** — deceased/hospitalized/traded draw soft-education events.
GAPS: no upper age bound; direct logSheet.appendRow anomaly (L442-52, not intent-routed).
VOLUME: LIMIT=10. HERITAGE: no.

educationCareerEngine.js — processEducationCareer_ (7 steps)
TARGETS: derive/progression/mobility steps = ENTIRE ledger (all tiers/modes — broadest scope, differs from convention); settleAdulthood_ = active, age EXACTLY 18 (===, skip risk if cycle missed), no prior EconomicProfileKey.
CONDITIONING: EducationLevel fill-only; CareerStage age gates student<22 / retired>=65 (L303-06); advancement rolls tenure+education-scaled; settleAdulthood_ score = HH income band + SchoolQuality + parent edu + heritage bump (+1 Est/+2 Prom/Dyn) -> rich/solid/rough start.
GAPS: whole-ledger scope on T1/2 + UNI/MED/CIV (intentional? flag); exact-18 check fragile.
HERITAGE: YES — settleAdulthood_ heritage bump (L676-82); updateMinorSchoolQuality_ +1 at Established+ (L485-86).

generationalWealthEngine.js — processGenerationalWealth_ (10 steps)
TARGETS: incomes: age<18 forced 0; money loop: active + 18+; wealth calc: ALL non-deceased (minor w/ inherited NetWorth can get WealthLevel — edge); mobility: active 18+ prior WL>=2; home: rented HH NetWorth>=35% price; heritage doors A (3+ members $1M) / B ($350M).
CONDITIONING: full wealth physics — tier income mods, WealthLevel 7 thresholds, credit factor by hood, inheritance 80/90% pass, home 6%/cycle roll, heritage business rolls 15/25/40% by tier, promotion score 0/50/150/350.
GAPS: CareerStage retired never read — no retirement income model; household wealth sums regardless of life-state.
HERITAGE: OWNS Heritage_Ledger (found/promote/business/Dynasty Cultural row).

householdFormationEngine.js — processHouseholdFormation_
TARGETS: FORMS_STATUS {active,retired,recovering}; forms only: married-no-HH, adults w/ on-ledger kids, orphaned minors. formNewHouseholds_ (singles) DISABLED by design (no one-person households). births/marriages/divorces = TODO stubs (marriage lives in bondEngine; **divorce has NO implementation anywhere**).
CONDITIONING: two-type rule (family/couple/single); off-camera spouse income $48k; rent-burden crisis needs savings-buffer check first; dissolution 10% roll on crisis only.
HERITAGE: no.

runHouseholdEngine.js — runHouseholdEngine_ (flavor only)
TARGETS: ENGINE T3/4 not UNI/MED/CIV. **No age gate, no Status exclusion at all** (Status only selects hospital pool).
CONDITIONING: **GOOD PATTERN — circumstance-gated pools: partneredPool only if married/partnered (L520-22), parentPool only if NumChildren>0 (L524-26); hospitalized/critical replaced by hospital-strain pool only (L531-33)**. Family dial mult.
GAPS: traded/pending/deceased can draw household flavor.
VOLUME: LIMIT=6. HERITAGE: no.

runRelationshipEngine.js — runRelationshipEngine_
TARGETS: T3/4 ENGINE not UNI/MED/CIV. **NO age gate (no BirthYear in file), NO Status filter at all.**
EMITS: social-drift LifeHistory + **populates S.cycleActiveCitizens (L583) = bondEngine's feed** — so unfiltered citizens (minors, hospitalized, traded) flow into bond formation pool.
CONDITIONING: drift base .02 cap .15; arc/alliance boost cap 3x; sociability dial; bond-aware sub-pools 30-35%.
VOLUME: LIMIT=8. HERITAGE: no.

runNeighborhoodEngine.js — runNeighborhoodEngine_
TARGETS: T3/4 ENGINE not UNI/MED/CIV. No age gate, no Status filter.
CONDITIONING: age used ONLY for demographic-weighted neighborhood assignment (student 5-22/senior 65+/young-prof/family), not eligibility; outabout dial; drift base .02 cap .12.
VOLUME: LIMIT=6. HERITAGE: no.

migrationTrackingEngine.js — processMigrationTracking_
TARGETS: risk/intent: EVERY non-deceased citizen (all tiers/modes — universal exposure, flag); relocations: units w/ canonical hood + income>0; settled-in: active, exactly MigratedCycle+10.
CONDITIONING: risk = hood pressure/2 + rent-burden (renters, savings buffer absorbs) + no-college +2 + senior(65+) +1, cap 10; intent thresholds 8/5; two lanes PRESSURE 35% down / MISFIT 15% up; fit gain >=1.5; <=40% burden.
GAPS: senior +1 is the ONLY age-awareness; exact +10 settled check fragile.
VOLUME: MAX 2 units/cycle (intentional scarcity). HERITAGE: no.

## D. evening layer + Event_Content_Ledger loader


FILE: phase07-evening-media/textureTriggers.js
ENTRY: textureTriggerEngine_ (engine2 L347/L1921, Phase6-Textures)
EMITS: S.textureTriggers (cap 45, dedup) + S.textureCalendarContext. **No consumer found among audited files — appears to be Story-Editor signal exhaust, verify before touching.**
TARGETS/GAPS: city-level, no citizen data.

FILE: phase07-evening-media/cityEveningSystems.js
ENTRY: buildCityEveningSystems_ (L391/L1965, runs LAST of evening block)
EMITS: S.nightShiftLoad, S.eveningTraffic, S.nightlifeVolume (**overwrites buildNightlife_'s value — it wins**), S.eveningSafety, S.crowdMap, S.crowdHotspots. -> finalizeCycleState snapshotEveningForCarryForward_ (L204/207/208) -> S.previousEvening -> generateCitizensEvents previousEveningPool_ (L971-1011) + GC micro L347.
GAPS: previousEveningPool_ consumes eveningSafety/crowdHotspots with NO ageband/wealth gate downstream.

FILE: phase07-evening-media/buildNightLife.js
ENTRY: buildNightlife_ (L386/L1960)
EMITS: S.nightlife {spots, volume 1-10, vibe...}, S.nightlifeVolume. Consumed by cityEveningSystems, eveningFood, sportsStreaming; carried to previousEvening.nightlifeVibe/Volume.
GAPS: **no age gate anywhere in chain — any-age citizen draws "still feeling the energy from last night's city buzz" / bar-adjacent texture.**

FILE: phase07-evening-media/buildEveningFood.js
ENTRY: buildEveningFood_ (L388/L1962)
EMITS: S.eveningFood {restaurants, fast, trend}. Carried to previousEvening.foodTrend — **NO consumer found: dead carry-forward field.** UPSCALE/BUDGET pools picked by econMood not citizen wealth (L351-52).

FILE: phase07-evening-media/buildEveningMedia.js
ENTRY: buildEveningMedia_ (L390/L1964)
EMITS: S.eveningMedia — media pipeline (mediaFeedbackEngine) only; NOT in previousEvening carry-forward. No citizen surface.

FILE: phase07-evening-media/buildEveningFamous.js
ENTRY: buildEveningFamous_ (L389/L1963)
EMITS: S.famousPeople, S.famousSightings; recordRipple_ (business) + registerCulturalEntity_ per sighting. previousEvening.famousNames — **no consumer found (dead field, same class as foodTrend).**
TARGETS: real citizens via REAL_PLAYERS pool: ClockMode=GAME + Status=active + OriginGame~MLB + Tier<=2 (L207-210) — occupational gate makes it life-state-safe by construction.

FILE: phase07-evening-media/sportsStreaming.js
ENTRY: buildEveningSportsAndStreaming_ (L387/L1961)
EMITS: S.eveningSports (feed-only, no invented pools), S.streamingTrend. eveningSports carried to previousEvening (L211); consumer in generateCitizensEvents L1054 (streamingTrend/eveningSports lines confirmed in my own read).
GAPS: none citizen-side (no citizen data).

FILE: phase05-citizens/applyChaosDecay.js
ENTRY: applyChaosDecay_ (L328/L1904)
EMITS: Business_Ledger Annual_Revenue decay intents only. No citizen surface. Lookback 60 cycles. Not idempotent per own CAVEAT.

FILE: phase05-citizens/runAsUniversePipeline.js
ENTRY: runAsUniversePipeline_ (L275/L1851)
EMITS: LifeHistory + LifeHistory_Log for UNI citizens: retirement transition line (one-time), post-career flavor 2-10% chance for retired ENGINE UNI (L464-500). Neighborhood conditions content (real per-citizen conditioning).
GAPS: structurally safe (UNI+retired gate). No wealth gate; content is soft lifestyle flavor.

FILE: phase02-world-state/loadEventContentLedger.js  [THE AUTHORING SURFACE]
ENTRY: loadEventContentLedger_ (Phase2; safePhaseCall_ both entry points)
EMITS: S.contentLedger {lines[poolKey], fragments[slot], skipped, lineCount, fragmentCount}. Read-only at cycle time. Fallback: empty/missing tab -> hardcoded pools, byte-identical replay.
WRITERS: HAND + post-cycle `scripts/draftContentRows.js` (engine.49; `auth:auto` tag; caps/dedup; validates by running the real loader).
SCHEMA (9 cols A–I): Kind (line|fragment), PoolKey, Slot, Text, Weight (def 1), Conditions (DSL), Tags (line: first tag MUST be in source whitelist, fail-closed), Grain, Active ('no' = kill switch, silent skip).
CONDITION DSL (`CONTENT_LEDGER_DSL_FIELDS` + `parseContentConditions_`): grammar = ';'-joined AND terms; ops <=,>=,<,>,=,!= (num); =,!= (enum/str); bare name for flags. Unknown field/op/value -> whole row skipped (fail-closed, typo narrows never widens, S289). Eval scopes built per citizen in generateCitizensEvents_ (not re-parsed).
  Fields (live):
  - num: wealth, children, displacement, tier, fame
  - flag: married, retired
  - enum: ageband (youth|youngAdult|adult|senior — back-compat 4-band), band (child|teen|youth|youngAdult|adult|senior — engine.67 6-band), lifestate (student|working|retired|none — maps lifeState.working), heritage (none|founding|established|prominent|dynasty)
  - str: hood, season, occupation, culdomain
  Author note: `displacement` evals citizen-row DisplacementRisk (S289), not Neighborhood_Map pressure. Prefer `band=` over `ageband=` for child/teen targeting.
SOURCE WHITELIST (27 `source:*` tags): qol media weather fame prevEvening nbhdState faith neighborhood firstFriday creationDay holiday sports occupation continuity homeLife reflection identity listening groove civicNews bias retirement curiosity communityLife economy chaos sentiment season age familyLife.
SKIP RULES: blank row silent; Active=no silent; bad Kind / empty Text / unparseable Conditions / line w/o PoolKey / first-tag-not-whitelisted / fragment w/o Slot = counted skips, aggregate-logged.
LIFE-STATE: engine.67/68 closed the old gaps — band/lifestate/occupation/tier/heritage/fame/culdomain are in the DSL; Phase 5 also hard-gates impossible class×life-state via isEventEligible_ after pool assembly.
POOLKEY SELECTION (2026-07-24, local-tested; sandbox proof pending): eligible ledger rows retain their total effective mass against hardcoded entries, but that mass is divided evenly across eligible PoolKeys immediately before each draw; row weights still rank entries within a PoolKey. No added RNG or event-volume change. PoolKeys remain additive-only and do not suppress hardcoded blocks.
REMAINING DEPTH: no trajectory/delta conditions; no exclusive/migrate policy for retiring hardcoded blocks; see docs/reviews/2026-07-22-event-content-ledger-grok-depth.md.
