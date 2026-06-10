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
| `generateCitizensEvents.js` | 5 | ENGINE | Tier 3-4 | ~100+ weighted pools (daily/QoL/patrol/weather-v3.5/PrevEvening/alliance/rivalry/mentorship/arc/occupation×12/age/neighborhood×12/holiday×20/sports) | 0.02 ×thin-history ×world mods | 25 ev/cyc | YES (TraitProfile archetype weights ×1.1-1.4; DialState plumbed L225 but **dormant**) | **EASY** — archetype-weight loop L1287-1312 is the slot |
| `generateNamedCitizensEvents.js` | 5 | ENGINE | named, active | ~50 type-first pools (UNI/MED/CIV restricted) | 0.02 | chance≤0.12, 10 ev/cyc | No | HARD (type-primary) — skip |
| `generateMediaModeEvents.js` | 5 | MEDIA | media roles | ~40 role pools | 0.20 +tier, ×health penalty | ≤0.45 | No | HARD (role-primary) — skip |
| `generateCivicModeEvents.js` | 5 | CIVIC | civic roles | ~40 role pools | 0.15 +tier, ×health penalty | ≤0.40 | No | HARD (role-primary) — skip |
| `runCareerEngine.js` | 5 | ENGINE | T3-4, non-UNI/MED/CIV, 10/cyc | transitions [promotion/layoff/sector/lateral] + ~20 micro + training; CareerState persistence | promo 0.01+tenure+pressure+skill (≤0.08); layoff 0.004 (≤0.07) | 10/cyc | tenure/skill state | **EASY** — `careerFreq` on promoChance ~L308 pre-clamp |
| `runRelationshipEngine.js` | 5 | ENGINE | T3-4, 8/cyc | ~60 (base/seasonal/holiday×30/bond-aware rivalry-alliance-mentorship/arc) | 0.02 + mods | 8/cyc | bonds/arcs | **EASY** — `mult.sociability` on driftChance pre-boost |
| `runHouseholdEngine.js` | 5 | ENGINE | T3-4, 6/cyc | ~70 home/family texture (holiday-heavy) | 0.02 + mods | 6/cyc | No | **EASY** — `familyFreq` at L399 |
| `runEducationEngine.js` | 5 | ENGINE | T3-4, age≥15, 10/cyc | ~50 learning texture | 0.02 + mods (18-35 +0.01) | 10/cyc | age | **EASY** — `mult.openness` at L357. ⚠ anomaly: direct `logSheet.appendRow` L437 (not queueAppendIntent_) |
| `runNeighborhoodEngine.js` | 5 | ENGINE | T3-4, 6/cyc | ~70 neighborhood mood ×12 + holiday-neighborhood | 0.02 + mods | 6/cyc | neighborhood | **EASY** — `mult.outabout` at L380 |
| `runYouthEngine.js` | 5 | (none) | named youth 5-22 | youth-* pools (academic/sports/civic/resilience/safety/coming-of-age) | 0.15-0.25 by school level ±calendar ±QoL | 25/cyc, 5/nbhd | age/school/QoL | MEDIUM — `mult.drive` pre-QoL ~L131 |
| `checkForPromotions.js` | 5 | (none) | Generic_Citizens EmergenceCount≥3 | promotion to Tier-3 (not a pool) | 0.20 ×calendar | — | No | N/A (citizen-agnostic by design) |

## 2. Non-citizen-memory engines (context producers — T8 reads these)

| Engine | Output | Notes |
|---|---|---|
| `buildCityEvents.js` | `S.cityEvents[]` + **`S.cityEventDetails[]` {name, neighborhood, tags, weight}** + calendar context | 1-3 cultural/leisure events/cyc from ~80 pools (season/weather/mood/econ/nightlife/holiday×24/FirstFriday/CreationDay/sports). **Nothing citizen-side consumes the specific events — the T8 gap.** |
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
| career/relationship/household/education/neighborhood engines | warm | hot | warm (ambient) | — | — |
| youth | warm | — | warm | warm | — |
| **TOTAL** | strong | strong | **thin (milestone-only)** | **thin (generational-only)** | **ZERO — T7 builds it** |

Fame (`UsageCount`): read by intake/context code only — **no generator gates on fame** (T3 confirmed gap, deferred to its own pass).

## 4. Per-column outcome-space (Mike S249 — every SL column is a potential event axis)

Columns generators READ as gates today: ClockMode, Tier, Status, BirthYear(age), Neighborhood, Occupation/TierRole, LifeHistory(thin-history boost + dedup), TraitProfile, DialState(dormant), UNI/MED/CIV flags, EmergenceCount(GC).
Columns generators WRITE: LifeHistory, LastUpdated, MaritalStatus + NumChildren (generational v2.7 structural), Income + EmployerBizId (career transitions), Status + StatusStartCycle + HealthCause (health lifecycle), Neighborhood (assigned if missing).
Columns carrying state but driving NO event selection (open outcome axes): **Income** (no wealth-gated events), **MaritalStatus/NumChildren** (no family-circumstance events outside milestones — a married parent draws the same pool as a single 25-y-o), **EducationLevel/CareerStage** (career engine keeps its own CareerState instead), **UsageCount/fame** (T3), **CitizenBio**. These are the chaos-cars per-column generalization frontier.

## 5. RNG + write-path compliance (audited in sweep)

All 13 citizen-memory writers use `ctx.rng`/seeded mulberry32 — zero `Math.random()`. Writes ride `ctx.ledger` mutation + Phase 10 commit or `queueAppendIntent_`/`queueBatchAppendIntent_`, with one anomaly: `runEducationEngine.js` L437 direct `appendRow` to LifeHistory_Log (pre-existing; flag for B7-class cleanup, not engine.32 scope).
