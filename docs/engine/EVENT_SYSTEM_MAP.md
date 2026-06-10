# Event System Map — every generator, what fires, what gates it (engine.32 T1)

**Created:** 2026-06-09 (S255, engine-sheet) · **Source:** 3-agent full-read sweep of `phase04-events/*` + `phase05-citizens/*` generators (~15K lines), S255.
**Parent:** [[../plans/2026-05-31-life-event-generation]] (engine.32) · **Companions:** [[TAG_REGISTRY]] (tag→category vocab), `utilities/citizenDialMap.js` (event→dial nudges), [[ENGINE_STUB_MAP]].
**Registered:** [[../index]].

This is the T1 deliverable: the inventory the traits→events back-arc (T5), the Conduct generator (T7), and the city-event fan-out (T8) build against. Per-generator detail lives in the tables; the seam column is where `getCitizenDialBands_(ctx, popId, dialStrOpt)` injects (null → base rates, the contract from engine.31 Phase 5; `dialStrOpt` added S255 so row-iterating generators resolve bands before `citizenLookup` exists).

**T5 WIRED (S255, same session):** all EASY/MEDIUM seams below + the 3 targeted generational fns now call the seam — genericMicro ×`mult.outabout`, gameModeMicro ×`mult.outabout`, citizensEvents ×`mult.outabout` on chance + per-category pool weights (relationship→sociability, occupation→drive, neighborhood/calendar→outabout, continuity→low-composure dwell), career ×`careerFreq` (drift + promoChance), relationship ×`mult.sociability`, household ×`familyFreq`, education ×`mult.openness`, neighborhood ×`mult.outabout`, youth ×`mult.drive`, generational wedding/birth ×`familyFreq` + promotion ×`careerFreq` (cache primed in caller loop). All multipliers apply pre-cap; null bands → base rates (inert until DialState deploys). Tests: G11-G14 cover the override path.

---

## 1. Citizen-memory writers (emit into LifeHistory col O + LifeHistory_Log)

| Generator | Phase | Mode gate | Population | Pools / events | Base rate | Cap/limit | Trait-gated today | Dial seam (T5) |
|---|---|---|---|---|---|---|---|---|
| `generateGenericCitizenMicroEvent.js` | 4 | ENGINE | non-public, tier-scaled | ~200 ambient texture (base/seasonal/weather/neighborhood×12/holiday×20/FirstFriday/CreationDay/sports/cultural/community/PrevEvening) | 0.10 (T1-2 lower) ×thin-history boost 1.5-5× | chance≤0.12, 25 ev/cyc | No | **EASY** — chance scalar ~L435, per-citizen loop |
| `generateGameModeMicroEvents.js` | 4 | GAME | public figures, Status-filtered | ~72 role pools (MLB/media/civic) + 7 archetype trait-pools + holiday | 0.04 +tier | chance≤0.15, 15 ev/cyc | YES (TraitProfile→trait pools) | **EASY** — chance scalar ~L491 |
| `generationalEventsEngine.js` | 4 | ENGINE+CIVIC | age-gated per milestone | 12 milestone types: Graduation/Wedding/Birth/Promotion/Retirement/Death/Divorce/Anniversary/Health lifecycle (multi-state) | per-type inline (e.g. grad 0.005-0.01, wedding seasonal ×2-3) | seasonal caps {grad 2, wed 1, birth 1, promo 2, retire 1, death 1} | No | **HARD→TARGETED** — 7 `check*_` fns compute chance inline; plumb bands per fn (wedding/birth→familyFreq, promo→careerFreq, death/health untouched) |
| `generateCitizensEvents.js` | 5 | ENGINE | Tier 3-4 | ~100+ weighted pools (daily/QoL/patrol/weather-v3.5/PrevEvening/alliance/rivalry/mentorship/arc/occupation×12/age/neighborhood×12/holiday×20/sports) + **T3 (S255):** recognition pool ×4 gated `UsageCount ≥ 8` (tag `Reputation`, +0.005 chance, ×sociability in dial loop) | 0.02 ×thin-history ×world mods | 25 ev/cyc | YES (TraitProfile archetype weights ×1.1-1.4; UsageCount fame gate T3) | **EASY** — archetype-weight loop L1287-1312 is the slot |
| `generateNamedCitizensEvents.js` | 5 | ENGINE | named, active | ~50 type-first pools (UNI/MED/CIV restricted) | 0.02 | chance≤0.12, 10 ev/cyc | No | HARD (type-primary) — skip |
| `generateMediaModeEvents.js` | 5 | MEDIA | media roles | ~40 role pools | 0.20 +tier, ×health penalty | ≤0.45 | No | HARD (role-primary) — skip |
| `generateCivicModeEvents.js` | 5 | CIVIC | civic roles | ~40 role pools | 0.15 +tier, ×health penalty | ≤0.40 | No | HARD (role-primary) — skip |
| `runCareerEngine.js` | 5 | ENGINE | T3-4, non-UNI/MED/CIV, 10/cyc | transitions [promotion/layoff/sector/lateral] + ~20 micro + training; CareerState persistence | promo 0.01+tenure+pressure+skill (≤0.08); layoff 0.004 (≤0.07) | 10/cyc | tenure/skill state | **EASY** — `careerFreq` on promoChance ~L308 pre-clamp |
| `runRelationshipEngine.js` | 5 | ENGINE | T3-4, 8/cyc | ~60 (base/seasonal/holiday×30/bond-aware rivalry-alliance-mentorship/arc) | 0.02 + mods | 8/cyc | bonds/arcs | **EASY** — `mult.sociability` on driftChance pre-boost |
| `runHouseholdEngine.js` | 5 | ENGINE | T3-4, 6/cyc | ~70 home/family texture (holiday-heavy) + **T4 (S255):** circumstance pools (partnered ×4 gated MaritalStatus, parent ×4 gated NumChildren>0, tag Household) + health texture (ailment ×4 → `Health`, wellness ×4 → `Recovering`) | 0.02 + mods | 6/cyc | YES — MaritalStatus/NumChildren gates (T4) | **EASY** — `familyFreq` at L399 (wired T5) |
| `runEducationEngine.js` | 5 | ENGINE | T3-4, age≥15, 10/cyc | ~50 learning texture | 0.02 + mods (18-35 +0.01) | 10/cyc | age | **EASY** — `mult.openness` at L357. ⚠ anomaly: direct `logSheet.appendRow` L437 (not queueAppendIntent_) |
| `runNeighborhoodEngine.js` | 5 | ENGINE | T3-4, 6/cyc | ~70 neighborhood mood ×12 + holiday-neighborhood | 0.02 + mods | 6/cyc | neighborhood | **EASY** — `mult.outabout` at L380 |
| `runConductEngine.js` **(T7, S255)** | 5 | ENGINE | T3-4, non-UNI/MED/CIV, age≥16, 3/cyc | moral tests: 8 petty + 6 serious + 4 grave + 8 resist; tags = DIAL_MAP Conduct vocab (Transgression-Petty/-Serious/-Grave, Resisted) | 0.012 (×1.25 low composure, ×1.2 econ≤35, ×0.7 crime spike) | chance≤0.03, 3/cyc | YES — **dialBands REQUIRED** (inert pre-deploy) | **CORE** — crimeReachable gates commit (band −2 only, accessor contract); commitP .35+(−band×.20); severity by band; spike counterweight ×0.6 commit |
| `runYouthEngine.js` | 5 | (none) | named youth 5-22 | youth-* pools (academic/sports/civic/resilience/safety/coming-of-age) | 0.15-0.25 by school level ±calendar ±QoL | 25/cyc, 5/nbhd | age/school/QoL | MEDIUM — `mult.drive` pre-QoL ~L131 |
| `checkForPromotions.js` | 5 | (none) | Generic_Citizens EmergenceCount≥3 | promotion to Tier-3 (not a pool) | 0.20 ×calendar | — | No | N/A (citizen-agnostic by design) |

## 2. Non-citizen-memory engines (context producers — T8 reads these)

| Engine | Output | Notes |
|---|---|---|
| `buildCityEvents.js` | `S.cityEvents[]` + **`S.cityEventDetails[]` {name, neighborhood, tags, weight}** + calendar context | 1-3 cultural/leisure events/cyc from ~80 pools (season/weather/mood/econ/nightlife/holiday×24/FirstFriday/CreationDay/sports). **T8 WIRED (S255):** runs at Phase 7 (after citizen generators), so fan-out rides the prev-evening carry-forward — `snapshotEveningForCarryForward_` (phase09) now persists `snapshot.cityEvents` (first 3, compact) into `PREV_EVENING_JSON`; next cycle `previousEveningPool_` (citizensEvents) emits attended ("joined the crowd at X", same-neighborhood, `evening:cityEventAttend` → ×sociability in dial loop, stacks with prevEvening's ×outabout) vs heard-about entries, and genericMicro's prevEvePool carries 1-2 heard-about lines. Memory tag = PrevEvening → {outabout:+2} nudge in citizenDialMap — the dial that drew the event reinforces, bounded by engine.31's ladder. |
| `worldEventsEngine.js` | `S.worldEvents[]` {domain, description, severity…} | 1-6 texture events/cyc, 16 categories + holiday pools. Citizens see only generic "chaos" reactions. |
| `eventArcEngine.js` | `S.eventArcs[]` tension/phase | Signals for Media Room; no citizen memory writes. |
| `faithEventsEngine.js` | `S.worldEvents` (FAITH) + faith log | Org-level; no per-citizen attendance. |
| `applyNamedCitizenSpotlight.js` | `S.namedSpotlights` | Aggregator/scorer, not a generator. |
| `bondEngine.js` | Relationship_Bonds + Bond_Ledger | Pairwise; dial seam skipped (pair asymmetry, cost). Social category covered. |

## 3. Category coverage heatmap (the 5 memory categories — T4)

| Generator | Social | Work | Family | Health | Conduct |
|---|---|---|---|---|---|
| genericMicro (ENGINE ambient) | warm | — | — | — | — |
| gameModeMicro | warm | hot | — | — | — |
| generational (milestones) | warm | warm | **warm** (wedding/birth/divorce only) | **hot** (lifecycle) | — |
| citizensEvents (T3-4) | hot | warm | — | — | — (QoL tension ≠ personal conduct) |
| media/civic modes | — | hot | — | — | — |
| career/relationship/household/education/neighborhood engines | warm | hot | **warm+ (T4: circumstance-gated partnered/parent pools)** | **warm (T4: ambient ailment/wellness texture)** | — |
| youth | warm | — | warm | warm | — |
| conduct engine (T7, S255) | — | — | — | — | **hot** (moral tests, dial-gated) |
| **TOTAL** | strong | strong | **covered (milestones + T4 circumstance ambient)** | **covered (lifecycle + T4 ambient texture)** | **covered (T7 `runConductEngine.js` — Resisted/Transgression ladder, inert until DialState deploys)** |

Fame (`UsageCount`): ~~no generator gates on fame~~ **closed T3 (S255)** — `generateCitizensEvents.js` recognition pool gated `UsageCount ≥ 8` (live audit: 96/904 nonzero, 15 at 8+; threshold catches the top ~10 ENGINE T3-4 citizens — Marcus 15, Lena 14, Reggie 12…). Famous GAME/MEDIA/CIVIC citizens (Paulson 42, Travis 20, Selena/Talia 14) have mode-specific generators — fame seam there deferred to engine.29 (which owns fame decay/ascension; this seam is read-only and forward-compatible).

## 6. Clock-coherence audit (T2, S255) — verdict: coherent, one engine.29 seam

Live ClockMode distribution (S255, 904 rows): **ENGINE 722 / GAME 90 / CIVIC 49 / MEDIA 43** — zero blanks, zero rogue values. Per-generator gates verified against source (not the T1 map): every mode has ≥1 generator; ENGINE (80% of population, the life-loop audience) has the FULL vocabulary (genericMicro + citizensEvents + named + 6 life engines + conduct + generational). Mode split is exclusive and exhaustive.

**The one real seam:** `generationalEventsEngine.js:262` gates milestones `ENGINE+CIVIC` only → **133 GAME/MEDIA citizens get no weddings/births/retirements/deaths from the engine.** Partially intentional (GAME athletes' lives are Paulson's authority; engine.29's matrix says MEDIA/CIVIC no die-off) but engine.29's design also says ENGINE/**GAME** die at 85+ — so GAME's exclusion from generational is a mismatch vs the engine.29 authority matrix. **Not fixed here:** engine.29 (not-started) owns the matrix; closing it now would pre-empt that design. Flagged for engine.29 phase A.

## 4. Per-column outcome-space (Mike S249 — every SL column is a potential event axis)

Columns generators READ as gates today: ClockMode, Tier, Status, BirthYear(age), Neighborhood, Occupation/TierRole, LifeHistory(thin-history boost + dedup), TraitProfile, DialState(dormant), UNI/MED/CIV flags, EmergenceCount(GC).
Columns generators WRITE: LifeHistory, LastUpdated, MaritalStatus + NumChildren (generational v2.7 structural), Income + EmployerBizId (career transitions), Status + StatusStartCycle + HealthCause (health lifecycle), Neighborhood (assigned if missing).
Columns carrying state but driving NO event selection (open outcome axes): **Income** (no wealth-gated events), **EducationLevel/CareerStage** (career engine keeps its own CareerState instead), **CitizenBio**. These are the chaos-cars per-column generalization frontier. ~~MaritalStatus/NumChildren~~ **closed T4 (S255)** — runHouseholdEngine now gates partnered/parent pools on them; a married parent finally draws a different home life than a single 25-y-o. ~~UsageCount/fame~~ **closed T3 (S255)** — see §3 fame note; a repeatedly-covered citizen now gets recognized on the street.

## 5. RNG + write-path compliance (audited in sweep)

All 13 citizen-memory writers use `ctx.rng`/seeded mulberry32 — zero `Math.random()`. Writes ride `ctx.ledger` mutation + Phase 10 commit or `queueAppendIntent_`/`queueBatchAppendIntent_`, with one anomaly: `runEducationEngine.js` L437 direct `appendRow` to LifeHistory_Log (pre-existing; flag for B7-class cleanup, not engine.32 scope).
