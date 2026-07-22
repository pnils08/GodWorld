---
title: Engine Coupling Map — how a citizen event becomes a dial, an essence, and a ripple
created: 2026-06-30
updated: 2026-06-30
type: reference
tags: [engine, citizens, events, dials, coupling, verified]
sources:
  - "Direct source read S277 (engine-sheet): utilities/citizenDialMap.js, phase05-citizens/runCareerEngine.js, runHouseholdEngine.js, runConductEngine.js, utilities/citizenMemory.js — all read end-to-end. Phase wiring from phase01-config/godWorldEngine2.js safePhaseCall_ list. Exclusion-gate spread from grep across phase04/phase05."
  - "[[../plans/2026-05-31-life-event-generation]] (engine.32) — the O-producer + traits→events design"
  - "[[../plans/2026-05-31-compression-tag-triage]] (engine.31) — the dial substrate"
  - "[[../plans/2026-06-19-living-city-full-population-coverage]] (engine.38) — coverage + eligibility"
pointers:
  - "[[archive/ENGINE_MAP]] — execution-order function list (structural sibling)"
  - "[[ENGINE_STUB_MAP]] — per-function ctx reads/writes (structural sibling)"
  - "[[archive/ENGINE_TRUTH_MAP]] — per-file behavioral scaffold"
  - "[[../index]] — registered there"
---

# Engine Coupling Map

**What this is.** The behavioral logic of how a citizen event turns into a change in who that citizen *is* — and, in one case, into a ripple that reaches other citizens. The structural maps (ENGINE_MAP / ENGINE_STUB_MAP) show *what calls what*; this shows *what an event mechanically does*. It is the answer to "does a column actually change what happens to a citizen, or just the printed text."

**Scope honesty (S277).** Read **end-to-end**: `citizenDialMap.js`, `citizenMemory.js`, `compressLifeHistory.js`, `runCareerEngine.js`, `runHouseholdEngine.js`, `runConductEngine.js`, `runRelationshipEngine.js`, `runNeighborhoodEngine.js`, `runEducationEngine.js`, `economicRippleEngine.js`, plus the core loop of `generateCitizensEvents.js`. Verified by **header + targeted grep** (gate, mutation sites, emitted tags — not every line): `generationalEventsEngine.js`, `runYouthEngine.js`, `generateCivicModeEvents/MediaModeEvents/GameModeMicroEvents`, `generateGenericCitizenMicroEvent.js`, `chaosCarsEngine.js`, `bondEngine.js` (write site), and the Phase-4 city sources. **Not deep-read:** `bondEngine` internal pairing logic; the Phase-4 source internals; the giant flavor-text pools (confirmed inert strings in the engines read). Where a claim rests on grep not full-read, it says so inline.

---

## The spine: every event moves a dial

`utilities/citizenDialMap.js` carries the load-bearing rule (file header, S253, Mike):

> **Every event ever logged to a citizen MUST move a dial. Nothing the engine emits is dead output.**

`nudgesForEvent_(tag, severityMult, text)` resolves any event to `{ dial: delta }` in three stages, so *no real event is inert*:

1. **Exact / normalized tag → `DIAL_MAP`** (with edition-citation `E\d+` → `sociability:2`, and calendar-suffix stripping so `Career-Holiday` routes as `Career`).
2. **Content routing on tag+text → `CONTENT_RULES`** — for untagged / `EngineEvent` / sentence-as-tag rows, regexes on the prose (e.g. `/diagnos|hospital/ → composure:-6`).
3. **`DEFAULT_AMBIENT` → `composure:1`** — any other real event = an ordinary day lived.

The only legitimately inert tags are **structural markers** (`Compressed`, `CareerState`) — summaries *of* events, not events; mapping them would double-count.

### The dial set (`citizenMemory.js`)

Eight bipolar dials, 0–100, centered 50: **drive, sociability, warmth, openness, composure, integrity, family, outabout**. A citizen *is* where their dials sit.

- An event lands its delta on **`mood`** (temporary swing).
- `mood` **decays** 0.8/cycle back toward `base`.
- A **sustained same-direction run** (streak ≥ 3) **hardens** 0.4 of the swing permanently into `base` — the only way a person actually changes.
- Consumers read the **band** (`BAND_CUTS [20,40,60,80]` → 5 bands; `BAND_MULT [0.5,0.75,1.0,1.25,1.5]`), not the raw value — so 73 and 78 behave identically, and a run of events drifts a citizen across a band over time.
- **The same discipline holds for LLM-facing surfaces (research.22, S291):** no skill or agent reads `DialState` directly — the only path is `lib/citizenDials.js:disposition()`, a pure filter to prose (verified: zero `DialState` references anywhere in `.claude/skills/` or `.claude/agents/`). Raw dial floats never enter a prompt, same as they never drive engine logic directly. Detail: [[../research/2026-07-04-dial-essence-filter-layer]].

### Compressor mechanics — the fold (VERIFIED `compressLifeHistory.js`, Phase 9)

The dial effect of an event is **not applied when it is logged.** It applies **once, on fold-on-trim**: `compressLifeHistory_` keeps the last `KEEP_RAW_ENTRIES = 20` raw lines and, when a citizen has more, the events *aging out* of that window are folded into `base`+`streak` via `foldAgedOutEntries_` → `applyEvent_(nudgesForEvent_(tag,1,text))`. Each event folds **exactly once** (the window physically removes it; no watermark, no double-count). Structural markers (`Compressed`/`CareerState`) fold to `{}`.
- **Cadence:** per citizen at most once every `MIN_CYCLES_BETWEEN_COMPRESS = 5` cycles, and only with ≥3 entries.
- **Stateful, never wipes:** v2.0 folds into permanent `base`; it does **not** recompute from scratch (the old erase-and-rebuild wiped identity each cycle). Requires the `DialState` column — **inert no-op without it** (fail-safe: never wipes a back-dated identity).
- **`mood` is not persisted** — only `{base, streak}` (+ `chaosExposure`) serialize to `DialState`; mood is a re-derivable window swing, zeroed after fold.
- **The seam `getCitizenDialBands_`** exposes to generators: `crimeReachable = bandIndex(integrity) <= 0` (**only the lowest integrity band, raw <20** — this is the conduct throttle), `careerFreq = mult.drive`, `familyFreq = mult.family`, plus signed bands −2..+2 and 0.5–1.5 multipliers per dial. Returns `null` when DialState absent → generators fall back to base rates.
- **Reflection drain (research.14, gated):** `readPendingReflections_` pulls `Reflection_Intake` and accretes a bounded fraction (`REFLECTION_MULT 0.45 × REFLECTION_ACCRETION_FRAC 0.5`) of subjective wake-reflections directly into `base` — the only path to the negative composure pole from daily life. Composed into the per-row RMW (not a Phase-9 sibling). Local/clasp-gated per S270.

### The loop it closes: O → R → AT

- **O** = `LifeHistory` (raw event lines) — what the generators write.
- **R** = the dials (`DialState`), compressed from O by `compressLifeHistory.js` at **Phase 9** via the dial map above.
- **AT** = `CitizenBio` (earned essence) — human-authored + card-enriched; **not** machine-written prose (engine.30 killed that).
- **Back-arc (engine.32 T5):** R feeds *back* into the generators — the dial bands bias which/how-often events fire (see Layer 1).

So: **events → dials → essence, and dials → events.** The dial map is the hinge of the whole loop.

---

## Two layers of coupling (the key distinction)

A citizen's columns couple to events on **two separate layers**, and they are wired very differently:

### Layer 1 — Selection: *which* event fires and *how often*. Richly coupled, everywhere.

Every generator read modulates its per-citizen probability by world + citizen state:
- world: season, weather, weatherMood, city sentiment, economic mood, chaos/worldEvents, holidays, First Friday, Creation Day, cultural activity, community engagement, sports season.
- citizen: the **dial bands** via `getCitizenDialBands_` (0.5–1.5 multiplier per dial).
- neighborhood: e.g. conduct's hood-grain crime counterweight (below).

This layer is real and pervasive. "If crime spikes in a neighborhood it affects citizens' events there" — **true**.

**The back-arc, verified (engine.32 T5): each dial governs the frequency of its own life domain.** This is the individuation engine — a citizen's dominant dial makes them live more of that domain, whose events fold back (on trim) into that same dial, reinforcing the disposition:

| Dial | Scales the frequency of | Engine (multiplier site) |
|---|---|---|
| drive | career events | `runCareerEngine` (`careerFreq`) |
| sociability | relationship events | `runRelationshipEngine` (`mult.sociability`) |
| family | household/family events | `runHouseholdEngine` (`familyFreq`) |
| openness | learning events | `runEducationEngine` (`mult.openness`) |
| outabout | neighborhood events | `runNeighborhoodEngine` (`mult.outabout`) |
| integrity | conduct: crime *reachability* | `runConductEngine` (`crimeReachable`) |
| composure | conduct test rate; negative pole | `runConductEngine` |

All are pre-cap multipliers; `null` bands (no DialState) → base rates unchanged.

### Layer 2 — Outcome: *what the event does to the citizen*. Always a dial nudge; real state-mutation only in some engines.

- **Always:** the event's tag → dial delta (the spine). Even a generic `Daily`/`Household` line moves composure/family. So every logged event shapes the citizen's essence over time.
- **Real state mutation (beyond dials):** verified in **career only** so far — transitions rewrite `Income`, swap `EmployerBizId`, and emit `businessDeltas` that the **Economic Ripple Engine** consumes → economy → sentiment → other citizens. This is the cross-sheet ripple.
- **The cosmetic edge:** where a column gates *which text* is drawn but all those texts share **one tag**, the column changes the prose, not the dial outcome (e.g. household's married/parent pools all emit `Household`→`family:5`; conduct's per-severity strings). The column individuates the *story*, not the *mechanics*, in those spots. This is a depth residual, not "unwired."

---

## Tag → dial reference (from `DIAL_MAP`)

| Category | Example tags → effect |
|---|---|
| Work / Drive | `Career` drive:4 · `Career-Transition` drive:3,openness:3 · `Promotion` drive:8,composure:2 · `Education` drive:5,openness:3 · `Graduation` drive:8 |
| Social | `Relationship` sociability:5,warmth:2 · `Neighborhood` sociability:3 · `Community` sociability:4,warmth:2 · `Reputation` integrity:3,sociability:2 · `Mentorship` warmth:6,drive:2 |
| Family | `Household` family:5 · `Wedding` family:10,warmth:4,composure:2 · `Birth` family:10,warmth:4 · `Divorce` family:-8,composure:-5 · `Retirement` family:4,drive:-4 |
| Health / Composure | `Health` -2 · `Critical` -8 · `Hospitalized` -6 · `Setback` -5 · `Recovering` +2 · `Recovery` +6 · `Death` {} |
| Conduct / Integrity | `Transgression-Petty` integrity:-4 · `-Serious` integrity:-8,composure:-2 · `-Grave` integrity:-12,composure:-3 · `Resisted` integrity:5 |
| Affect (WAKE-only, gated/inert) | `Frustrated`/`Anxious` -3 · `Angry` -4,warmth:-2 · `Excited` +3,drive:2 — subjective reflection tags, not engine-emitted |
| Ordinary-bad (engine.38 B3, emitted-pending) | `Friction` -2 · `Strain` -1 · `Stumble` -2,drive:-1 · `Spat` -1,warmth:-1 · `Disappointment` -2 · `Ailment` -1 |
| Ambient (never zero) | `Daily` composure:2,family:1 · `Background` +2 · `Micro-Event` +1 · `PrevEvening` outabout:2 · `Sports` outabout:3 · `Holiday` outabout:2,family:1 |

---

## Per-engine verified behavior

### `runCareerEngine.js` — VERIFIED, the real-cascade exemplar
- **Gate:** ENGINE-mode, Tier-3/4, non-UNI/MED/CIV (L642–644). LIMIT 10/cycle.
- **State:** career state (industry/employer/level/tenure/skill) persisted in LifeHistory as `[CareerState] k=v|...`, parsed back each cycle — stateful across cycles.
- **Layer 1:** probability from weather/season/sentiment/econ/chaos/holiday/First-Friday(neighborhood-specific)/cultural/community + **Drive dial** `careerFreq` (L722–723).
- **Layer 2 (real):** `maybeTransition_` → promotion (`Income ×1.06–1.12`, L776), layoff (`Income ×0.80–0.88`, clear `EmployerBizId`, L784/790), sector-shift/lateral (new `EmployerBizId`). All feed `careerSignals.businessDeltas` → **Economic Ripple Engine** (`MAJOR_LAYOFFS`, L969). Non-transition cycles draw a pooled flavor line tagged `Career`.

### `runHouseholdEngine.js` — VERIFIED
- **Gate:** ENGINE Tier-3/4 non-UNI/MED/CIV (L437–439). LIMIT 6/cycle.
- **Layer 1:** probability from the world set + **Family dial** `familyFreq` (L487).
- **Layer 2:** emits `Household`(family:5) / `Health`(composure:-2) / `Recovering`(composure:+2). **Circumstance gating (engine.32 T4):** `MaritalStatus`=married/partnered adds a partnered pool (L508); `NumChildren`>0 adds a parent pool (L512) — but both still emit the `Household` tag, so the column changes the *line*, not the dial. No state mutation.

### `runConductEngine.js` — VERIFIED
- **Gate:** ENGINE Tier-3/4 non-UNI/MED/CIV, age ≥16 (L167–171). LIMIT 3/cycle.
- **Layer 1:** moral-test chance scaled by composure dial + econ mood + **neighborhood crime counterweight** `crimeSpikeFor_` (0.6×hood crimeIndex from prev-cycle Neighborhood_Map + 0.4×citywide Crime_Metrics; a spike *lowers* test rate and commit odds).
- **Layer 2:** integrity band sets commit-vs-resist + severity; emits `Transgression-*`/`Resisted` → integrity/composure deltas (real dial movement). **Throttle:** `crimeReachable` opens commit only for integrity band −2 (raw <20) per the `getCitizenDialBands_` accessor contract — so ~98% of eligible citizens *always resist*; transgressions arrive via drift to far-low integrity, not dice. Text is pooled (per-severity), not column-keyed.

### `runRelationshipEngine.js` — VERIFIED
- **Gate:** Tier-3/4 ENGINE non-UNI/MED/CIV (L365–367; uses `=== "yes"` exact match — minor inconsistency vs `startsWith("y")` elsewhere). LIMIT 8/cycle.
- **Layer 1:** probability from season/weather/sentiment/cultural/community/chaos/holidays/First-Friday/Creation-Day/neighborhood-holiday-match + **bond & arc boosts** (`getCombinedEventBoost_` — arc phase ×up to 2.0, alliance boost; rivalry +0.015; arc-phase boost) + weather/econ/media modifiers + **Sociability dial** (`mult.sociability`, L468).
- **Layer 2:** emits Relationship/Rivalry/Alliance/Mentorship/Arc/Holiday/FirstFriday/CreationDay/Cultural/Community/Media/Weather → dial deltas. **Downstream:** pushes `ctx.summary.cycleActiveCitizens` → the **Bond Engine** forms/updates structural bonds; bonds feed back into this engine's probability + pool → relationship↔bonds loop (the social analog of career→economy). No income-style mutation.

### `runNeighborhoodEngine.js` — VERIFIED
- **Gate:** Tier-3/4 ENGINE non-UNI/MED/CIV (L359–361). LIMIT 6/cycle.
- **Real state mutation:** assigns the **`Neighborhood`** column when missing via `pickDemographicNeighborhood_` — demographic-weighted by age (student/senior/young-professional/family) against `Neighborhood_Demographics` (cross-sheet read). So citizen placement is a real column write coupled to age + neighborhood demographics.
- **Layer 1:** weather/weatherMood/season/sentiment/cultural/community/econ/chaos/holidays/First-Friday(neighborhood-specific)/Creation-Day/holiday-neighborhood-match + **Out-and-About dial** (`mult.outabout`, L438).
- **Layer 2:** emits Neighborhood/FirstFriday/CreationDay/Holiday → dials. Pooled text.

### `runEducationEngine.js` — VERIFIED
- **Gate:** ENGINE Tier-3/4 non-UNI/MED/CIV, has BirthYear, **age ≥15** (L339–351). LIMIT 10/cycle.
- **Layer 1:** weather/season/sentiment/econ/chaos + **age 18–35 boost** + holidays/First-Friday/Creation-Day/cultural/community + **Openness dial** (`mult.openness`, L402).
- **Layer 2:** emits Education / Education-FirstFriday / -CreationDay / -Holiday / -Cultural → dials. No state mutation.
- **⚠ Anomaly (verified):** logs via direct `logSheet.appendRow(...)` (L443), **not** `queueAppendIntent_` — the lone in-cycle direct LifeHistory_Log write among the life engines (flagged in engine.32 T1, never migrated). Engine-write-discipline exception worth closing.

### `generationalEventsEngine.js` (Phase 4) — FULL-READ VERIFIED, the heaviest state-mutation engine
- **Distinct gate:** `mode !== "ENGINE" && mode !== "CIVIC"` → continue (L264) — **broader than every other engine**: civic-mode citizens get milestones, and **Tier-1/2 are included** (tier ≤2 only reduces odds via `tierMod 0.8`, doesn't exclude). Still excludes GAME/MEDIA modes → ~133 citizens get no lifecycle milestones (the engine.29 authority-matrix mismatch, flagged not fixed).
- **Real state mutations (the lifecycle):** wedding → `MaritalStatus="married"` (L337) + a generational bond; birth → `NumChildren++` on the parent only (L355, child stays Tier-5 off-sample per S248); death → `Status="deceased"` (L392); health state-machine writes `Status`/`StatusStartCycle`/`HealthCause` (L282–291, L406) across active↔hospitalized↔critical↔recovering↔deceased per `HEALTH_TRANSITIONS`.
- **Coupling:** `BirthYear`→age gates milestone eligibility (`AGE_RANGES`: graduation 22–28, wedding 24–50, birth 26–42, retirement 68–72, death 65–100); tier modulates odds; holiday boosts (wedding on Valentine/NYE). Emits the heavy `Wedding`/`Birth`/`Death`/`Divorce`/`Health`/`Graduation`/`Promotion`/`Retirement` tags → big family/composure dial deltas. Downstream: household reads the written `MaritalStatus`/`NumChildren`; `Status=deceased` removes the citizen.
- **Per-cycle caps (the throttle):** `getSeasonalLimits_` caps milestones citywide per cycle (graduations 2 / weddings 1 / births 1 / promotions 2 / retirements 1 / deaths 1; season/holiday raise specific ones). So lifecycle events are deliberately *rare* — a handful per cycle across ~900, not per-citizen rolls landing freely.
- **Health state-machine** (`processHealthLifecycle_` + `HEALTH_TRANSITIONS`): hospitalized↔critical↔recovering↔active↔deceased, age/tier/season-modulated, with forced resolution after duration thresholds. Death odds age-scaled 0.0001→0.05 (age 90), `[Health]` history ×1.5, winter ×1.3, rare-shock override.
- **Cascades (full-read — invisible to grep):** **death** → severs the citizen's `Relationship_Bonds` + grief cascade (`pendingCascades`) on allied/mentor survivors + spawns `power-vacuum` arc (tier≤2) + 20% `inheritance` arc; **retirement** → 30% `power-vacuum` arc; **promotion** → bumps rivalry/alliance bond `intensity`; **birth** → priority-shift `pendingCascade`; **wedding** → `createGenerationalBond_` (romantic) when a romantic bond exists. So generational feeds `Relationship_Bonds` + `eventArcs` (story arcs), not just the SL columns.
- **Residual wall-clock:** `applyMilestone_` col-O line uses `"C{cycle}"` (in-world) but `LastUpdated = ctx.now` (wall-clock) — metadata-only, flagged-benign.

### `economicRippleEngine.js` (Phase 6) — VERIFIED (see §Cross-engine cascades)
Reads `careerSignals` + migration + world/citizen events → economic ripples → recomputes `economicMood` + per-neighborhood economies → **writes `employmentRate`/`economy` to `World_Population`**. `economicMood` feeds back into all citizen engines' probability next cycle. The loop that makes career transitions ripple city-wide.

### `generateCitizensEvents.js` (Phase 5) — FULL-READ VERIFIED, the central texture generator + city→citizen fan-out
- **Gate (engine.38 A1-cont, S277):** the atmospheric layer now runs for **all active T1–T4 citizens regardless of ClockMode** — the old mode exclusion (`!isNamed && mode!=="ENGINE"`) is removed, so the ~141 dark non-ENGINE T3/4 draw texture here too. **Deceased excluded** (`Status==="deceased"`, AC3). **Retired** stay eligible for the atmospheric core but are excluded from the occupation work-texture pool (retirement changes what they get — Mike S277); **pending** still eligible (open). All non-Active citizens are ENGINE. Role-safety: the **occupation work-texture pool is guarded ENGINE-only** (non-ENGINE roles owned by mode engines); this file still writes **only** col-O + log (no structural columns). **Volume: random 1..N per participating citizen** (`ATMOSPHERIC_MAX_EVENTS`, conservative **4** pending the Task-6 perf gate; Mike's target 6–8) — was fixed ≤1. `recordPulse_` fires **once per citizen** (first draw) so volume doesn't scale neighborhood metrics. *(Prior: engine.38 A1 option-1 gated to `isNamed ∪ ENGINE T3/4`, ≤1 emit/citizen.)*
- **Depth step (S280, Mike-direct):** content upgraded from generic mush to column-conditioned lived texture — the ledger row already in memory is the lever set. (1) **Chaos = reaction, not bulletin**: `chaosReaction_` routes worldEvents domain/subtype keywords to lived texture; citywide "heard" grain + same-hood "lived" grain; raw "CATEGORY — Subtype (Hood)" strings never enter a life. (2) **Household-shared memory**: same-hood event + shared `HouseholdId` → members draw the SAME line (deterministic hash of HouseholdId+event index, not rng) — one storm, one family memory. (3) **Column-conditioned pools**: `MaritalStatus`/`NumChildren` gate family texture (married/widowed/divorced/kids registers), `WealthLevel` (≤3 tight / ≥8 comfortable) + `DisplacementRisk` (≥7, migrationTracking's own high gate) aim money/rent texture. (4) **baseDaily → 48 human-domain moments** (Family/Home/Reflection/Curiosity/Community/Identity), routed to EXISTING ambient dial keys (familyLife→Daily, homeLife→Background, reflection+identity→Personal, curiosity→Lifestyle, communityLife→Neighborhood) — a homebody and a wanderer stop drawing identical dial pushes. (5) **Bond/arc texture names the counterpart** (nameByPop pre-pass; arcs surface their creation `summary`). Dial routing verified byte-safe: fold resolves the bracketed primary tag in DIAL_MAP before content regexes ever see text. New columns read: HouseholdId, MaritalStatus, NumChildren, WealthLevel, DisplacementRisk (all optional, idx −1 tolerated). Plan §Depth step: [[../plans/2026-06-30-central-generator-atmospheric-expansion]].
- **Layer 1 (the richest):** `PARTICIPATION_BASE` + weather/sentiment/chaos/season/econ/holidays/First-Friday/Creation-Day/sports/cultural/community + **QoL-driven** (low-QoL hood → more events; crime hotspot; stretched enforcement) + age/occupation + **fame** (`usageCount ≥ 8`, T3) + prev-evening crowds + bonds/arcs + weather/media modifiers + **dial-weighted participation** (`activityScore = (drive+outabout+sociability)/3`, L1318) + **anti-inert floor** (forced in if dark > `ANTI_INERT_N` cycles) + guaranteed-in upstream actives.
- **The city→citizen coupling (your "crime spikes → events there"):** the per-citizen pool pulls `neighborhoodStatePool_` (reads **prev-cycle Neighborhood_Map** crime/sentiment), `previousEveningPool_` (last night's city events; **T8 fan-out**, out-and-about-dial-gated travel radius), and `faithPool_` (this cycle's faith events in the hood). City + neighborhood state reach the individual here.
- **Layer 2 (the full weighting stack, full-read):** per-citizen pool assembled from ~20 sources (base/seasonal/weather-v3.5-microclimate/chaos/sentiment/econ/holiday/firstFriday/creationDay/sports/occupation/fame/age/alliance/rivalry/mentorship/arc/continuity/prevEvening/nbhdState/faith), then each entry's weight is multiplied by: **(a)** archetype weights (`getArchetypeWeights_` — Connector +alliance/neighborhood, Striver +work/rivalry, etc.), **(b)** dial-band mult per tag category (relationship→sociability, occupation→drive, neighborhood/prevEvening→outabout, continuity→low-composure-dwells, fame→sociability), **(c)** a continuity penalty (×0.85 if a tag is both in TopTags and recent-primary). Then an anti-repeat filter against `mem.recentTexts` (last 5), then `pickWeighted_`. Template entries route through a **tone-aware slotter** (`buildTemplateEvent_`: plain/noir/bright/tense/tender by traits+QoL, venue/institution/contact slots, 20% motif injection, 3-cycle cooldown). So selection is deeply individuated; the *text* is still template/pool, not bespoke prose.
- **Lightweight memory/continuity:** `S.citizenEventMemory.byPopId` tracks recentTexts/recentPrimary/unresolved threads (rivalry/alliance/arc) with probabilistic decay — feeds the continuity pool + anti-repeat + penalty.
- **Couplings out:** `recordPulse_` (engine.33) — public-footprint events move the neighborhood pulse → folded at Phase-8 `v3NeighborhoodWriter` into `Neighborhood_Map` (citizen→neighborhood edge); pushes `activeSetObj`→`cycleActiveCitizens` (→ Bond Engine). **Writes:** col-O (`inWorldStamp_`) + `LastUpdated = ctx.now` (wall-clock, same residual as generational) + a **direct batched `lifeLog.setValues`** to LifeHistory_Log (not write-intents — like education; a second in-cycle direct-write site). No structural-column mutation.

### Mode-routed generators — who serves the citizens the stakes engines skip (gates VERIFIED)
The ~25% excluded from the ENGINE-mode stakes engines are **routed to mode-specific generators, not unwired:**
- **`generateGenericCitizenMicroEvent`** (Phase 4, FULL-READ): `mode==="ENGINE"`, non-UNI/MED/CIV, **all tiers**. Tiered base (Tier-1 0.50 / Tier-2 0.25 / Tier-3-4 0.10) — but **clamped by a 0.12 cap**, so the 50% is pre-cap and effective max is ~12%. Thin-LifeHistory **catch-up** (≤2 lines ×5, ≤5 ×3, ≤10 ×1.5), Out-and-About dial scaling, world-state modifiers. `EVENT_LIMIT = 25` (a "CATCH-UP, revert after ~5 cycles" temp still live). Emits Background/Neighborhood/Holiday/FirstFriday/CreationDay/Sports/Cultural/Community/PrevEvening + `Micro-Event` (log) → dials; `recordPulse_` → Neighborhood_Map; prev-evening T8 ambient fan-out; microclimate texture. Write-intents; `LastUpdated=ctx.now` residual. **Doc-drift caught (full read):** the file's own trailing reference comment ("base 0.03 / limit 12") is STALE vs this live code.
- **`generateCivicModeEvents`** (Phase 5, FULL-READ): `mode==="CIVIC"` only (L392), not deceased/inactive. Base **15%** (+5% T1/+3% T2, +civicLoad/votes/grants/sentiment/weather/holiday, ×healthPenalty, cap 40%). Role-classified via a **`Civic_Office_Ledger` lookup** (`buildOfficeLookup_` → mayor/council/DA/police-chief/initiative-director/staff + faction) → role-specific pools that reference the *actual* `votesThisCycle`/`grantsThisCycle`/`initiativeEvents`/`eventArcs`/`crimeMetrics` (e.g. council members react to specific passed/failed votes; chief to hotspots/patrol-strategy/OARI). → `Civic`/`Public`/`Personal` tags. Write-intents; no T5 dial read; reads Civic_Office_Ledger cross-sheet. Genuinely context-aware, not generic.
- **`generateMediaModeEvents`** (Phase 5, FULL-READ): `mode==="MEDIA"` only (L344), not deceased/inactive. **Base chance 20%** (+10% Tier-1 / +5% Tier-2, +civicLoad/votes/cultural/sentiment/weather/holiday, ×healthPenalty, cap 45%) — journalists generate *more* often than the stakes engines. **Role-classified** (`getMediaRole_`: editor-in-chief/columnist/reporter/podcast/photographer/analyst/staff) → role-specific pools that read live `votesThisCycle`/`eventArcs`/`crimeMetrics`/sentiment for context-aware newsroom events. → `Media`/`Personal` tags (sociability). Write-intents (`queueBatchAppendIntent_`); no T5 dial-band read (mode citizens skip it); `LastUpdated=ctx.now` residual. No structural mutation.
- **`generateGameModeMicroEvents`** (Phase 4, FULL-READ): `mode==="GAME"` (not inactive/deceased/retired). Base **4%** (+2% T1/+1% T2, +sportsSeason for MLB up to +2%, +weather/chaos/sentiment/holiday, ×Out-and-About dial, cap 15%). `getCitizenType_` → mlb-pitcher/position (UNI or `OriginGame` MLB), media-editor/reporter/columnist/photographer, civic-mayor/council/staff, public-figure → role pools; **MLB get TraitProfile-archetype pools** (Catalyst/Anchor/Watcher/Grounded/Striver/Connector/Drifter). → Public/Team/Work/Civic/Season/Personal/Holiday/Life tags. **Life events only** — performance/training/rehab come from manual MLB-The-Show INTAKE, not here (sports = Paulson canon). Write-intents; never mutates RoleType/Tier/Neighborhood; `LastUpdated=ctx.now`.
- **`runYouthEngine`** (Phase 5, FULL-READ): iterates youth **age 5–22** (`getNamedYouth_` from SL via ctx.ledger, age from BirthYear if no Age col; Generic_Citizens youth pool dropped S205, SL single source), status≠deceased, tier-agnostic. School-level base prob (elem 0.15 / mid 0.20 / high 0.25 / college 0.15) × calendar period (`ACADEMIC_CALENDAR`: graduation/end-of-year ×1.5, fall ×1.3, summer ×0.7) × QoL (low ×1.15 resilience, hotspot ×1.1) × **Drive dial**. Caps 25/cycle, 5/neighborhood. Event types academic/sports/coming_of_age/civic/arts + QoL-driven resilience/community_support/safety_awareness. Plus **school-wide events** (graduation/fall-sports/homecoming, `SCHOOL-` ids). Writes `Youth_Events` (`batchRecordYouthEvents_`) + `youth-*` tags to LifeHistory_Log (**named youth only**, `queueAppendIntent_`); story signals → Phase 6 (education/sports/culture). **Full-read catch:** `now = ctx.now || new Date()` → `getMonth()` for academic month + `new Date().getFullYear()` for "Class of {year}" — a residual **real-world-clock** site (violates no-real-world-clock).

**So every citizen class has a generator:** ENGINE Tier-3/4 → the 6 stakes engines; named (T1/2, any mode) → `generateCitizensEvents` carve-out + generational; CIVIC/MEDIA/GAME → their mode engines; ENGINE all tiers → generic-micro; youth → youth engine; everyone ENGINE/CIVIC → generational lifecycle. The residual is **depth parity** (mode/micro events are thinner than the stakes engines), not absence.

### `chaosCarsEngine.js` (Phase 4) — FULL-READ VERIFIED: external adversity, three scopes
Fires `CHAOS_MIN..MAX = 3–15` typed-municipal-vehicle events/cycle; each = vehicle (weighted) × scope × dice-rolled outcome × signed magnitude. The `Chaos_Cars` row is source-of-truth (written first via `writeChaosCarsRow_`); scope writebacks derived. Three scopes:
- **citizen** (`pickCitizenTarget_` — uniform-random, **NO tier protection**, §S205: Tier-1 can be hit): `writeCitizenEvent_` mutates col-O with the outcome's `lifeHistoryTag` (must be a real DIAL_MAP tag — throws if missing, else it'd fold to +composure, the inverse of adversity), appends LifeHistory_Log (`{tag}|chaos_cars|{vehicle}[|chaos:wary/trauma]`), **and** `accrueChaos_`→`chaosExposure` on DialState + `applyChaosReaction_` one-time break (wary→traumatized, composure/openness down). Tier-1 + high-severity → `tier1ChaosEvents` Phase-5 cascade flag.
- **business** (`pickBusinessTarget_`): folds per (bizId,column) → `flushBusinessFold_` → `queueCellIntent_` to **`Business_Ledger`** (`Annual_Revenue`/`Employee_Count`; headcount clamped non-neg int).
- **neighborhood** (`pickNeighborhoodTarget_`): accumulates residual → Phase-10 `v3NeighborhoodWriter` folds into **`Neighborhood_Map`**; persisted cross-cycle in PropertiesService (`CHAOS_NBHD_FOLD_JSON`) with one-step asymmetric decay (`resolveChaosNeighborhoodFold_`).
The external-misfortune counterpart to conduct's internal agency — both write the dial memory; trauma decays in the compressor (`decayChaosExposure_`). Reads Business_Ledger + Neighborhood_Map directly (cached, reads OK).

### Phase-4 city-event SOURCES (producers, no per-citizen gate)
- **`worldEventsEngine.js` — FULL-READ:** the city-event **bus producer**. Generates 1–6 domain-tagged events/cycle (`baseCount` recovery/holiday/chaos-aware, cap 6 × `eventSuppression`) from weighted category pools (BUSINESS/SAFETY/HEALTH/WEATHER/CELEBRITY/CIVIC/INFRASTRUCTURE/TRAFFIC/SPORTS + holiday-specific). `domainAllowed_` gate drops suppressed (cooldown) domains; cross-cycle dedup reads `WorldEvents_Ledger` (last 5 cycles); severity low/med/high from chaos/shock/sentiment/weather/drift. Sports playoff/championship flavor **gated to Maker override** (`sportsSource==='config-override'`). Output → `S.worldEvents` — the global bus every Phase 4–5 engine reads as `chaos` (probability input), economicRipple text-matches into ripples, and citizensEvents fans out. Persisted to `WorldEvents_Ledger` at Phase 10.
- **`faithEventsEngine.js` — FULL-READ:** iterates **16 faith orgs** (no citizen gate); per org rolls holy_day/regular_service/community_program/outreach/crisis_response (probs season/sentiment/congregation-size-modulated) + city-wide interfaith; **capped 5/cycle** (priority: crisis>holy_day>interfaith>program). Crisis detected from `S.worldEvents` keywords + sentiment<−0.5. **`recordPulse_`** moves each org's hood (`Faith` sent+1 / `Faith-Crisis` sent−3) → Phase-8 `v3NeighborhoodWriter` → `Neighborhood_Map`. Writes `Faith_Ledger` (`batchRecordFaithEvents_`), feeds `S.faithEvents.events` (same-cycle citizen fan-out via `faithPool_`) + appends `S.worldEvents`. Story signals → Phase 6 (Elliot Graye desk).
- **`buildCityEvents.js` — FULL-READ:** city-event producer feeding the T8 fan-out. Weight-accumulation pool (`poolByName`, weights *combine* across sources) from holiday/firstFriday/creationDay/sports/cultural/community/season/weather/weatherMood/chaos/sentiment/economy/nightlife/publicSpace pools → **weighted-sample-without-replacement**. Count **3 + (40% +1) = 3–4/cycle** (engine.38 A4 raised from 1–2 to feed T8; calendar `Math.max` ceiling → 4 major-holiday/FF, 5 championship/Pride/Art+Soul). Output `S.cityEvents`/`cityEventDetails`/`cityEventsCalendarContext` (no per-citizen gate); carried to prev-evening → next-cycle `generateCitizensEvents.previousEveningPool_` fan-out (outabout-gated). **Footer drift caught:** the file's own reference comment still says "base 1–2."

### `bondEngine.js` (Phase 5) — FULL-READ, the bond consumer + relationship↔bonds loop
- **Inputs:** `ensureBondEngineData_` populates `cycleActiveCitizens` (from `citizenEvents`/`storySeeds`/`eventArcs`/`worldEvents`, name-resolved) + `citizenLookup` (Citizen_Directory, else SL fallback via ctx.ledger). Needs ≥2 active citizens. Bonds live in `ctx.summary.relationshipBonds` (master state, loaded by `bondPersistence` Phase5-LoadBonds).
- **`updateExistingBonds_`:** intensity moves by mutual-activity (rivalry +1.5/alliance +0.5/...), cycleWeight/shock/sentiment, **calendar** (festival/sports-season/family-holiday/community-holiday/FirstFriday/CreationDay), arc-proximity (+0.5, +0.5 at peak), decay (no-neighborhood/both-inactive/aged/off-season), clamp 0–10. Status active↔dormant (≤1/≥3); **tension escalates→rivalry (≥6) or settles→professional (≤2)**. `lastUpdate` stamped only on meaningful change (v2.7 ledger-bloat fix).
- **`detectNewBonds_`:** pairwise over active citizens, `maxNewBonds` 2–4 (calendar-scaled); festival/sports/FirstFriday/CreationDay/holiday bonds, then career-overlap→tension, same-neighborhood→neighbor, single-domain→professional, shared-arc→rivalry/alliance, tier-gap→mentorship.
- **Outputs/couplings:** `checkConfrontationTriggers_` (rivalry/sports_rival intensity ≥8, ≥6 sports-championship → confrontation event + intensity −2); `applyAllianceBenefits_` → `ctx.summary.allianceBenefits` (per-citizen boost, cap 2.0) **read back by relationship + citizensEvents** (`getCombinedEventBoost_`, hasRivalry/Alliance/Mentorship pools); `saveV3BondsToLedger_` → **`Relationship_Bond_Ledger`** (19 cols incl calendar; only bonds changed this cycle; `ensureSheet_` fail-loud, no fallback; `setValues` L1473). Minor `ctx.now||new Date()` Timestamp residual. This closes the relationship↔bonds loop: events → active-citizens → bonds → benefits/confrontations → back into event probability + story arcs.

---

## Phase 2: Infrastructure (Weather / Transit)

### `applyWeatherModel.js` (Phase 2)
- **Coupling & Salience:** Computes `S.weather` and `S.neighborhoodWeather` microclimates. Evaluates its own outputs for salient events (storm, flood-conditions, heat-wave, fog-day) and emits discrete events to `S.weatherEvents[]`.
- **Citizen Impacts:** Salient weather events feed lifecycles (e.g., heat waves trigger health entries for vulnerable citizens; storms trigger ECL vocab rows and business impacts). Coupled citizen hits ripple `weather-event` (SAFETY domain).

### `updateTransitMetrics.js` (Phase 2)
- **Coupling & Salience:** Detects bad-day states (`service-disruption` and `gridlock-day`) from computed on-time performance and traffic indexes. Writes to `S.transitState` and emits ripples.
- **Citizen Impacts:** Working citizens (`ls.working === 'working'`) in affected neighborhoods draw commute-disruption events (ECL vocab rows) during service disruptions. Ripples as `transit-event` (CIVIC domain).

---

## Economic / civic SL-writer engines (full-read pass, S277)

These mutate structural SL columns (beyond LifeHistory) and feed cross-sheet state — verified by full read.

### `generationalWealthEngine.js` (`processGenerationalWealth_`, Phase 5) — FULL-READ
- **Writes SL:** `Income` (unseeded citizens only — seeded ones managed by `applyEconomicProfiles` + career transitions), `WealthLevel` (0–10 from effective income = income + 5% NetWorth, +inheritance/−debt), `SavingsRate` (if unseeded), `InheritanceReceived`/`NetWorth` (to heirs).
- **Inheritance cascade:** reads `ctx.summary.generationalEvents` deaths → `findHeirs_` (ParentIds JSON) → distributes 80% of deceased NetWorth → heir NetWorth/InheritanceReceived + `Family_Relationships` (own-sheet, direct) + `GENERATIONAL_WEALTH_TRANSFER` story hook. So **generational death → wealth inheritance → heir wealth level** is a real coupled chain.
- **Aggregates:** SL Income/WealthLevel → `Household_Ledger` (HouseholdWealth/Income/SavingsBalance).
- **⚠ Full-read catch:** `trackWealthMobility_` + `trackHomeOwnership_` are **placeholder stubs** (`return {events:0}` / `{purchased:0}`) — the header advertises wealth-mobility events + home-ownership tracking as features, but neither is implemented. `WEALTH_GAP_WIDENING`/`DOWNWARD_MOBILITY`/`HOME_OWNERSHIP_ACHIEVED` hooks never fire.

### `educationCareerEngine.js` (`processEducationCareer_`, Phase 5) — FULL-READ
- **Writes SL:** `EducationLevel` (MED→graduate / UNI→bachelor / CIV→some-college / else age-based), `CareerStage` (student/entry/mid/senior/retired by age + advancement), `YearsInCareer`, `LastPromotionCycle`, `CareerMobility` (advancing/stagnant). Education affects *advancement speed* (bachelor 0.10 / graduate 0.15 mid→senior), **not income** (v14.2 removed the education→income override to kill the three-way conflict; `incomeAdjusted` always 0).
- **Reads:** UNI/MED/CIV flags + LifeHistory + `Neighborhood_Demographics` (school quality). Story hooks: CAREER_STAGNATION (5%).
- **Canon note (in-code, S247):** `checkSchoolQuality_`'s `SCHOOL_QUALITY_CRISIS`(<3) / `DROPOUT_WAVE`(<65%) hooks are **dormant by data design** — prosperity-calibrated values (≥7/≥85) keep them from firing; the code explicitly warns *not* to lower school values to make crises fire (re-introduces the S245 invented-struggle fidelity failure). Correct dormancy, not a bug.

### `migrationTrackingEngine.js` (`processMigrationTracking_`, Phase 5) — FULL-READ
- **Writes SL:** `DisplacementRisk` (0–10 from `Neighborhood_Map.DisplacementPressure` + `Household_Ledger` rent burden + no-college +2 + senior +1), `MigrationIntent` (staying/considering/planning by risk ≥5/≥8). Reads EducationLevel (written by educationCareer earlier in Phase 5 — ordering matters).
- **Full-read verification:** `processMigrationEvents_` now executes intra-city relocations (engine.55) and settled-in checks (engine.61). `checkForDisplacedCitizens_` successfully logs displaced citizens. Hooks FORCED_MIGRATION (≥9) / MASS_EXODUS (5+/hood) fire and trigger actual structural moves.

### `neighborhoodTrajectoryEngine.js` (`processNeighborhoodTrajectory_`, Phase 5) — S315 REWRITE (was gentrificationEngine.js — git mv, same lineage)
- **What replaced what:** the gentrification block was a real-world Oakland displacement-study index (5yr income/rent change, WhitePopulationPct, HighEducationPct) whose input columns were NEVER written by any phase — wired but permanently starved, and premise contradicted prosperity-era canon. S315 (Mike-direct) repurposed it into a prosperity trajectory system fed by columns the engine already produces every cycle.
- **Writes `Neighborhood_Map` (NOT Simulation_Ledger):** `NeighborhoodTrajectory` (decay/steady/growth), `TrajectoryMomentum` (0–10, 5 neutral), `TrajectoryStartCycle`, `HousingPressure` (0–10 prosperity strain), plus `MedianRent`/`MedianIncome` drift (living columns, trajectory-coupled) — via `queueCellIntent_`, **cell-scoped on purpose (T1.5)** so it doesn't clobber the Phase-10 `saveV3NeighborhoodMap_` metric-col fold (which flushes after intents). Reads Neighborhood_Map texture (`Sentiment`/`RetailVitality`/`CrimeIndex`/`EventAttractiveness`/`MigrationFlow`) — city-relative scoring vs this-run means, deterministic, no rng.
- **Coupling:** `HousingPressure` → migrationTrackingEngine reads it for citizen `DisplacementRisk` → `MigrationIntent` (texture-only; nodes permanent per S313); citizensEvents `neighborhoodStatePool_` reads trajectory + housing pressure for experience-weighted texture (S296 flat-weight rule lifted S315 — the dial is now attached to live mechanics). ctx export: `S.neighborhoodTrajectory`. Hooks: NEIGHBORHOOD_RISING/COOLING/BOOM, HOUSING_PRESSURE_HIGH → Ripple_Ledger via `recordHookRipple_('trajectory', …)`.
- **⚠ Grep-error correction (kept from lineage — this is why grep is banned):** an earlier grep listed this engine as an SL-column writer; the full read shows all owned columns are *Neighborhood_Map* — it never writes Simulation_Ledger.

## Civic / vote engines (full-read pass, S277)

### `civicInitiativeEngine.js` (`runCivicInitiativeEngine_`, Phase 5) — FULL-READ (Sonnet-mapped + Mags-audited)
- **Gate:** no mode/tier filter, no per-cycle LIMIT — iterates all Initiative_Tracker rows (L91). Skips resolved/failed/inactive/override-passed/override-failed (L195) + passed&signed (L201). Aborts the whole run if any of 13 required headers are missing (L164–174). Delayed rows retry each cycle (reset VoteCycle=cycle, status→pending-vote, L207–216, v1.5). Vote/decision fires when `voteCycle===cycle` & status active/pending-vote (L269); separate override loop fires on status=vetoed & OverrideVoteCycle===cycle (L423–431).
- **State:** persists via bulk `setValues` to Initiative_Tracker (L486–488): Status/Outcome/Consequences/Notes/LastUpdated + 5 veto cols. Ripples accumulate in `S.initiativeRipples` (ctx-transient, no sheet backing).
- **Layer 1 (selection):** three auto-advances — v1.9 visioning-complete + vote-ready + `nextCycle>=cycle` → schedule vote, status=active (L237–266; **code uses `>=`, header comment claims `>`**); proposed→active when voteCycle−cycle≤3 (L404); active→pending-vote when voteCycle===cycle+1 (L411). Vote probability inputs: `Projection` keyword (0.30–0.70, L1096), `S.cityDynamics.sentiment` (×0.1 primary / ×0.05 secondary-lean / ×0.15 unnamed-IND), `SwingVoter2Lean` (0.25–0.75, L1138), demographic alignment of `AffectedNeighborhoods` vs `Neighborhood_Demographics` (±0.15, L1175–1298), supermajority −0.05 (votesNeeded≥6), council-availability exclusions (hospitalized/critical/injured/deceased/resigned/retired, L608). Grant path: base 0.50 ±projection/sentiment, clamp 0.25–0.75 (L1311). Veto prob: base 0.10 +0.40 faction-mismatch +0.20 approval<40 +0.15 controversy +0.10 budget>$50M −0.20 same-faction, clamp 0.05–0.75 (L2330).
- **Layer 2 (outcome):** **no citizen dials — pure macro-civic** (no `getCitizenDialBands_`/`citizenDialMap`). Mutations: Initiative_Tracker row in-place (status/outcome/consequences/notes/veto cols, L321–396); `applyInitiativeConsequences_` shifts `S.cityDynamics.sentiment` ±0.05 (L1399); `applyNeighborhoodRipple_` pushes domain-mapped ripple records (sentiment/community/retail/traffic/unemployment/nightlife, 6–20 cycle durations) + immediate sentiment ×0.5 (L1464–1629); story hooks MAYORAL_VETO/VETO_OVERRIDE/VETO_UPHELD → `S.storyHooks`; override vote (IND@0.55, supermajority 6+, L2437).
- **Cross-sheet:** reads Initiative_Tracker, Civic_Office_Ledger (`getCouncilState_` L519; redundant 2nd read in `checkMayoralVeto_` L2308), Neighborhood_Demographics, Simulation_Ledger (ctx.ledger fallback only, L685). **Writes Initiative_Tracker only.**
- **⚠ Full-read catches:**
  - **Dead veto-deterrent (real bug, audit-caught):** `checkMayoralVeto_` computes `voteMargin = voteResult.yesVotes − voteResult.noVotes` (L2316), but `resolveCouncilVote_` never puts `yesVotes`/`noVotes` numbers on its result (only the `voteCount` string) → `voteMargin` is always **NaN** → the `if (voteMargin>=7)` blowout-vote deterrent (−0.15) **never fires**.
  - **Dead placeholder branch:** `publicSupport` is hardcoded 50 (L2319, "until Week 2 town halls"), so the `publicSupport>70 → −0.30` deterrent (L2353) is permanently unreachable.
  - **Schema mismatch:** `createInitiativeTrackerSheet_` writes only 19 headers (A–S, L1797–1817); the 5 v1.7 veto cols (T–X) are **never created** — a freshly-built sheet returns −1 on MayoralAction/etc. lookups (footer comment L2619 claims "24 columns A–X"). Existing sheets work only because the cols were added manually.
  - **Ripple consumer unwired check (RESOLVED):** `applyActiveInitiativeRipples_` is verified to be called cross-file by `godWorldEngine2.js` in Phase 6. Initiative ripples decay and expire correctly. `getRippleEffectsForNeighborhood_` is currently unused but available.
  - Stale comments: Logger says `v1.6` (L499; code is v1.9); `seedInitiativeTracker_` comment says "v1.1 schema" (L2190) but seeds v1.7 data.
  - Carve-outs (correct, not bugs): `manualRunVote` uses `Math.random` + `new Date()` (L2069/1991, operator path, no ctx.rng); `addSwingVoter2Columns`/`seedInitiativeTracker_` use `getActiveSpreadsheet` (setup). No cycle-path `new Date()`; `ctx.now` used throughout.

### `runCivicElectionsv1.js` (`runCivicElections_`, Phase 5) — FULL-READ VERIFIED (Sonnet-mapped, S277)
- **Gate:** fires only on `cycleOfYear===45` AND `godWorldYear % 2 === 0` (L53-70) — once per even God-world year; else `S.electionResults=null` + return. Seat group alternates by `godWorldYear % 4` (L104).
- **Layer 1:** challenger pool from SL (Tier 2-4, active, non-CIV unless journalist, L172-210). Outcome (L291-378): `incumbentScore` base 50 ±incumbency/econMood/sentiment/scandal/variance, clamp 25-75, `rng()` roll decides. Margin buckets → narrative.
- **Layer 2 (dials/structural):** no `citizenDialMap`, no dial touch. **Structural-civic:** mutates `Civic_Office_Ledger` office fields; **for an upset winner flips the SL row `CIV='y'` + `TierRole=<office>` (L467-484)** — the one citizen-row structural touch.
- **Cross-sheet:** reads Civic_Office_Ledger (direct getDataRange) + ctx.ledger. Writes `Election_Log` via `queueAppendIntent_` (L412), Civic_Office_Ledger via `queueRangeIntent_` full rewrite (L454); SL CIV/TierRole via shared `ctx.ledger.rows` + dirty flag (Phase 42 §5.6, not per-cell intent).
- **Citizen-impact path:** **winning an election promotes a citizen into the civic-mode event pool** — CIV='y'+TierRole feeds `generateCivicModeEvents` downstream (per engine.md ordering; consumer side not re-read). The vote→canon-role→generator-switch coupling.
- **Catches:** **`new Date()` at L412** written as the Election_Log Timestamp value = real-world-clock residual ([[feedback_no-real-world-clock-in-sim]] — cycle/year used elsewhere in the same payload; flag for fix). District match is `seat.title.indexOf(cand.neighborhood)` substring (L256) — no real district↔hood join. Election_Log lazy-create direct = schema-setup carve-out (correct). No dead fns.

### `runCivicRoleEngine.js` (`runCivicRoleEngine_`, Phase 5) — FULL-READ VERIFIED (Sonnet-mapped, S277)
- **Gate:** iterates SL rows where `CIV==='y'` (L42-45); **hard cap `LIMIT=6` events/cycle** (L254) — small-sample observer, not full-pop.
- **Layer 1:** branches by Status — retired/resigned/scandal → fixed note 100% (L278-289); active → soft civic note, base 0.015 + chaos/sentiment/econ/season/holiday/FF/CreationDay mods, cap 0.08 (L292-322). Text from generic + role-keyword (council/mayor/etc.) + neighborhood + holiday pools.
- **Layer 2 (dials/structural):** **none** — no citizenDialMap, no status/role mutation. Explicit observer ("Preserves Maker authority. Never modifies status." L13). Pure narrative logger.
- **Cross-sheet:** reads ctx.ledger + ctx.summary. Writes col-O LifeHistory (in-memory, dirty flag) + `LifeHistory_Log` via `queueAppendIntent_` (L423). No direct sheet writes.
- **Citizen-impact path:** does NOT assign roles — narrates citizens already carrying CIV='y', reads (never writes) TierRole for flavor. Rides on role-assignment done upstream (elections/initiative).
- **Catches:** no stubs/orphans, no wall-clock (`inWorldStamp_` L414), no NaN hazards (bounded). Footer holiday-ref table matches code (no drift). Soft gap: missing TierRole col silently skips role notes (graceful degrade).

### `updateCivicApprovalRatings.js` (`updateCivicApprovalRatings_`, Phase 5, after civicInitiativeEngine) — FULL-READ VERIFIED (Sonnet-mapped, S277)
- **Gate:** rows where Status active/recovering AND OfficeId `^COUNCIL`/`^MAYOR` (L150) — elected council+mayor only. Every cycle. Bails if no ctx.ss / no Civic_Office_Ledger / no Approval col.
- **Layer 1:** Approval = three additive deltas (L137-285): (1) initiative performance in district × faction alignment (±1..4); (2) media-coverage compound from `S.editionDomainBalance.CIVIC.rating` (±1/2); (3) decay toward 50. Clamp 10-95.
- **Layer 2 (dials/structural):** **none** — no citizenDialMap, no citizen-row touch. Pure macro-civic math on Civic_Office_Ledger (officials). Recall/vulnerable/popular triggers computed → ctx.summary only, no write.
- **Cross-sheet:** reads Civic_Office_Ledger + Initiative_Tracker (read-only). Writes **only** Civic_Office_Ledger Approval via `queueCellIntent_` (L294, dryRun-guarded).
- **Citizen-impact path:** indirect, neighborhood-grain — ripples `delta*0.003` into `S.approvalNeighborhoodEffects[hood].sentiment`/`.communityEngagement` (L300-322) per district hood → feeds neighborhood sentiment → **citizen-event probability** next cycle. No direct citizen touch.
- **Catches:** **engine.md doc-drift** — exceptions list says this file writes "Civic_Office_Ledger + Initiative_Tracker" but Initiative_Tracker is **read-only** here (no write exists). Stale `v1.0` Logger strings vs v1.1 header. `currentApproval` NaN→hardcoded 65 (L144). `DISTRICT_HOODS` hardcoded 9-district map duplicated in-file (no canonical source). No wall-clock/Math.random/orphans.

## Cross-engine cascades (VERIFIED)

The coupling is not only event→dial; whole engines feed each other across sheets, closing loops.

### The economic loop (career → economy → population → every citizen)
1. `runCareerEngine` transition → rewrites `Income`/`EmployerBizId` + emits `careerSignals.businessDeltas` (per-BIZ gained/lost).
2. `runEconomicRippleEngine` (Phase 6) reads `careerSignals`: `layoffs ≥ 3` → `MAJOR_LAYOFFS` (−15); `promotions ≥ 4` → `WORKFORCE_GROWTH` (+6); `businessDeltas[BIZ].lost ≥ 2` → `BUSINESS_CONTRACTION` at that business's neighborhood (resolved through `Business_Ledger` → `mapToCanonicalNeighborhood_`). Also folds in migration drift, world/citizen events, crisis, weather.
3. It recomputes `economicMood` (0–100) + per-neighborhood economies, and **writes `employmentRate` + `economy` descriptor back to `World_Population`**.
4. `economicMood` is read by career/household/relationship/neighborhood/education/conduct **next cycle** as a probability input → the loop closes. A wave of layoffs measurably darkens the whole city's event texture for several cycles (ripple `duration` 4–12).

### The social loop (relationship → bonds → relationship)
`runRelationshipEngine` pushes `cycleActiveCitizens` → the Bond Engine forms/updates `Relationship_Bonds` (rivalry/alliance/mentorship) → those bonds feed back into the relationship engine's probability + pool selection. (bondEngine ⟪UNVERIFIED in depth⟫ — confirms the consumer side next.)

### The dial loop (the back-arc, restated)
Events fold into dials on trim (compressor) → dials bias which/how-often events fire (each dial → its domain) → those events fold back into the same dial. Disposition self-reinforces, bounded by mood-decay + harden-streak + the population counterweights.

## Eligibility gates (the ~25% exclusion)

The stakes/event generators open with the same gate (grep-verified across phase04/phase05):
```
if (mode !== "ENGINE") continue;        // drops GAME/CIVIC/MEDIA mode citizens
if (tier !== 3 && tier !== 4) continue; // drops Tier-1/2/5
if (isUNI || isMED || isCIV) continue;  // drops Universe/Media/Civic flagged
```
- `generateCitizensEvents.js` adds an `isNamed` carve-out (engine.38 A1, L1222–1232) so named citizens bypass the gate there.
- Mode-flagged citizens are intended to be served by their **mode-specific** engines (civic-mode / media-mode / game-mode), not the ENGINE-mode stakes engines.
- Net: the exclusion is real and deliberate by class; whether each excluded class gets *equivalent* life from its mode engine is a coverage question (engine.38), not evidence of "unwired."

---

## Phase-5 execution order (from `godWorldEngine2.js` `safePhaseCall_`)

GenericMicroEvents → GameModeMicroEvents → (ensure ledgers/bonds) → LoadBonds → SeedBonds → Relationships → Neighborhoods → Universe → CivicRoles → Elections → Initiatives → ApprovalRatings → CivicModeEvents → MediaModeEvents → **Career → Education → Household → Conduct → Generational** → NamedCitizens. (Compression O→R runs Phase 9.)

---

### `updateCivicLedgerFactions.js` (updateCivicOfficeLedgerFactions_, Phase 5) — FULL-READ
- **Gate:** Checks if `Civic_Office_Ledger` exists (`if (!sheet) return`) and has data rows (`if (data.length < 2) return`). 
- **Layer 1:** Scans the civic ledger to assign political factions (OPP, CRC, IND, STAFF, VACANT) based on explicit `PopId` mapping or office type. Determines voting power (yes/no/vacant) based on office prefix (MAYOR/COUNCIL). 
- **Layer 2:** Mutates `Civic_Office_Ledger` structurally by appending `Faction` and `VotingPower` columns if they are missing. Applies bold formatting if columns are newly added.
- **Cross-sheet:** 
  - **Reads:** `Civic_Office_Ledger`
  - **Writes:** `Civic_Office_Ledger` (adds columns, updates all rows)
- **Full-read catches:** Includes `getCouncilStateFromLedger_` which builds a structured state object (counts by faction, availability, vacancies) for use by `civicInitiativeEngine`. Uses a hardcoded faction map for known POPIDs (e.g., Mayor Avery Santana).

### `generateMonthlyCivicSweep.js` (generateMonthlyCivicSweep, Phase 5) — FULL-READ
- **Gate:** Checks if `Simulation_Ledger` and `World_Population` exist. Guards against missing `CIV (y/n)` column and empty `World_Population` data rows.
- **Layer 1:** Scans `Simulation_Ledger` for citizens marked `CIV (y/n) == y|yes`. Tallies total civics, active scandals, resignations, and retirements. Builds a roster of up to 10 active civic names.
- **Layer 2:** Pulls contextual simulation metrics (civicLoad, cycleWeight, patternFlag, weather, sentiment) from `World_Population` and appends a consolidated 15-column timestamped sweep row.
- **Cross-sheet:**
  - **Reads:** `Simulation_Ledger`, `World_Population`
  - **Writes:** `Civic_Sweep_Report` (appends rows; initializes sheet/headers if missing)
- **Full-read catches:** Robust name fallback (uses First+Last if FullName is missing, falls back to POPID if names are blank). Defaults missing `Status` to "Active". Uses a strict 15-column output schema.

## Intake / lifecycle engines

### `processIntakeV3.js` (processIntakeV3_, Phase 5) — FULL-READ
- **Gate:** Requires `Intake` and `Simulation_Ledger` sheets to exist. Only processes rows with at least a First or Last name.
- **Layer 1:** Stages new citizens in memory from the `Intake` sheet. Checks against existing normalized ledger names and intra-batch duplicates. Generates new `POPID`s.
- **Layer 2:** Implements the V3 write-intents model (`queueRangeIntent_`, `queueCellIntent_`). No random dials. Creates full empty-cell intents to clear processed rows without row-shift issues.
- **Cross-sheet:** Reads `Intake` and `Simulation_Ledger`. Writes (via intents) to `Simulation_Ledger` (priority 100) and `Intake` (priority 150).
- **Full-read catches:** Uses `ctx.now` directly for `CreatedAt` and `LastUpdated`. Reference footer explicitly notes the old `processIntake_` is preserved in `godWorldEngine2.js` for backwards compatibility. 

### `processAdvancementIntake.js` (processAdvancementIntake_, Phase 5) — FULL-READ
- **Gate:** `ctx.ledger` must be initialized (except on manual operator run). Media usage rows must have valid names and not be marked processed. GC citizens require `EmergenceCount >= 3`.
- **Layer 1:** Evaluates media usage (`UsageCount` bumps and Tier promotions at 9, 6, 3). Runs attention decay (losing tiers if usage drops). Processes lottery-based GC emergence promotions and family-match drip doors.
- **Layer 2:** Extensive demographic derivations via `deriveCitizenProfile_` (education, gender, debt, net worth, career stage). Family matches run structural pairing logic (surname adoption, age band checks, household joining).
- **Cross-sheet:** Reads `World_Config`, `Citizen_Media_Usage`, `Generic_Citizens`, `Simulation_Ledger` (via `ctx.ledger`), `Advancement_Intake1`. Writes to `Citizen_Media_Usage`, `Generic_Citizens`, `LifeHistory_Log`, and pushes inline mutations to `ctx.ledger.rows`.
- **Full-read catches:** "Mike-pinned" S320/S324 constraints (e.g., family drips share the `DRIP_CAP_PER_CYCLE` limit with emergence). Uses `DEMOGRAPHIC_VOICE_ROLES` as a 15-category fallback for empty intake roles. Manual run path handles direct writes instead of Phase 10 intents.

### `checkForPromotions.js` (checkForPromotions_, Phase 5) — FULL-READ
- **Gate:** Requires `Generic_Citizens`, `LifeHistory_Log`, and `ctx.ledger`. Implements a strict missing-column guard for required ledger columns (POPID, First, Last, Tier, Status). GC row must be `Active` with `EmergenceCount >= 3`.
- **Layer 1:** Evaluates a world-aware promotion chance (base 20%, capped at 45%). Determines promotions to Tier 4 (entry tier as per S320).
- **Layer 2:** Chance modifiers are heavily influenced by the world state: Seasonal, Weather, Chaos, Sentiment, Economic, and GodWorld Calendar (First Friday, Creation Day, Sports seasons). Uses deterministic neighborhood mappings (12 canon neighborhoods).
- **Cross-sheet:** Reads `Generic_Citizens`. Writes to `ctx.ledger.rows` (inline array push), `LifeHistory_Log`, and `Generic_Citizens` (marks as `Emerged` and tracks context).
- **Full-read catches:** Replaced random neighborhood fallback with a deterministic "Downtown" fallback. Calculates max POPID once in-memory to prevent collision bugs during multi-promotions.

### `runAsUniversePipeline.js` (runAsUniversePipeline_, Phase 5) — FULL-READ
- **Gate:** `ctx.ledger` must be initialized. Only evaluates rows where `UNI (y/n)` is truthy and `Status` is active/retired.
- **Layer 1:** Enforces STRICT UNI rules: no random events for Active UNI on the GAME clock. Retires GAME clock citizens to ENGINE. Post-career ENGINE citizens receive soft lifestyle notes based on a low probability draw (max 10%).
- **Layer 2:** Uses Mulberry32 PRNG (`mulberry32_uni_`) seeded via `ctx.config.rngSeed` for deterministic rolls. Determines canon-safe sports phases from GodWorld seasons, with support for Maker overrides (`sportsSource='config-override'`).
- **Cross-sheet:** Reads `Simulation_Ledger` (via `ctx.ledger`). Writes to `Simulation_Ledger` (modifies `iLife`, `iClock`, `iLastUpd` in-place) and appends to `LifeHistory_Log`.
- **Full-read catches:** Event tags expanded (e.g., `PostCareer-Sports`, `PostCareer-Wellness`). Uses `ctx.now` for `LastUpdated`. Explicitly states that the Engine must NEVER simulate league operations.

### `applyNamedCitizenSpotlight.js` (applyNamedCitizenSpotlights_, Phase 5) — FULL-READ
- **Gate:** Requires `ctx.summary.engineEvents` and `ctx.namedCitizenMap`. Only evaluates citizens tracked in the named citizen map.
- **Layer 1:** Iterates through engine events to assign "spotlight" scores to named citizens, determining if they met the dynamic significance threshold to be featured in the cycle digest.
- **Layer 2:** Modifiers include Domain Weight (Civic/Health = 6), Severity (Critical = 8), Arc Involvement (Peak = 5), and Calendar Boosts. Threshold adjusts downwards (easier to spotlight) during major holidays or high chaos.
- **Cross-sheet:** Purely memory-based. Reads from `ctx.summary.engineEvents` and `ctx.namedCitizenMap`. Writes results exclusively to `ctx.summary.namedSpotlights`.
- **Full-read catches:** Cycle-level signals (like chaos, sentiment, economic boom) are restricted to apply ONCE per citizen per cycle to prevent score inflation. Selects the most frequent neighborhood for a citizen, rather than the first-seen.

### `applyChaosDecay.js` (applyChaosDecay_, Phase 5) — FULL-READ
- **Gate:** Requires `Chaos_Cars` and `Business_Ledger`. Only processes events with `TargetScope` = 'business', `PrimaryMetric` = 'Annual_Revenue', and cycles elapsed between 1 and 60.
- **Layer 1:** Accumulates an incremental revert step for business `Annual_Revenue` residuals, pushing the value back toward baseline after a chaos event.
- **Layer 2:** Reuses `chaosResidualAfter_` from `utilities/chaosCarsDecay.js`. Excludes `Employee_Count` which is treated as a permanent churn metric (decay rate 0).
- **Cross-sheet:** Reads `Chaos_Cars` and `Business_Ledger`. Writes to `Business_Ledger` via `queueCellIntent_`.
- **Full-read catches:** Explicit caveat in comments notes a Phase 6 hardening flag: incremental persistent sheet updates are NOT idempotent and will double-apply on cycle re-runs. 

### `seedRelationBondsv1.js` (seedRelationshipBonds_, Phase 5) — FULL-READ
- **Gate:** `ctx.ledger` must be initialized. Will only seed if the total number of bonds on the `Relationship_Bonds` sheet is under 500 and there are >= 10 active citizens.
- **Layer 1:** Seeds family bonds (via matching Household IDs), neighborhood bonds (20% chance inside same hood), occupation bonds (15% chance), and cross-neighborhood random chaos bonds (5% of population).
- **Layer 2:** Randomizes bond types (friendship, professional, alliance, rivalry) and intensities (2-10). Uses `makeBondKey_` to prevent reverse-direction duplicate entries.
- **Cross-sheet:** Reads `Simulation_Ledger` (via `ctx.ledger`) and `Relationship_Bonds`. Writes to `ctx.summary.relationshipBonds` and `ctx.summary.bondSummary` (persistence is delegated to `bondPersistence.js`).
- **Full-read catches:** Function names were renamed in v1.4 (e.g., `createSeedBond_`) to avoid Apps Script flat-namespace collisions with `bondEngine.js`. Inserts the `Relationship_Bonds` sheet if missing.

### `bondPersistence.js` (loadRelationshipBonds_ / saveRelationshipBonds_, Phase 5) — FULL-READ
- **Gate:** Contains strict ledger schema collision guards (`isLedgerSchema_`) to abort operations if `Relationship_Bonds` looks like a ledger log. Wipe guard prevents saving if `ctx.summary` is empty but the sheet contains data.
- **Layer 1:** Loads bonds from `Relationship_Bonds` into `ctx.summary.relationshipBonds` early in the cycle, skipping `resolved` or `severed` bonds. Later, replaces the entire sheet contents to commit the cycle's final master state.
- **Layer 2:** Includes calendar-aware boolean parsing (`asBool_`) and various migration utilities (`migrateBondSchema_`, `upgradeBondSheetSchema_`). Purges inactive bonds older than a max age (50 cycles).
- **Cross-sheet:** Reads and fully replaces the `Relationship_Bonds` sheet using `queueReplaceIntent_`. Reads `ctx.ledger.headers` for name translation.
- **Full-read catches:** Employs `normalizeBondCitizenId_` to translate First+Last name lookups dynamically into uppercase canonical `POPID`s by checking `ctx.ledger`, solving the S312 bond-key repair requirement.

## Persistence / ledger spine

### `initSimulationLedger.js` (initSimulationLedger_, Phase 1) — FULL-READ
- **Gate:** Throws an error (fails loud) if `Simulation_Ledger` is missing or empty.
- **Layer 1:** Bootstraps the in-memory shared state for the simulation ledger. Exposes `ctx.ledger = { sheet, headers, rows, dirty }`.
- **Layer 2:** No direct sheet mutation. Solves read-staleness collisions by forcing phase04+ writers to route through `ctx.ledger.rows` instead of doing independent sheet I/O.
- **Cross-sheet:**
  - **Reads:** `Simulation_Ledger`
  - **Writes:** None directly (sets up context)
- **Full-read catches:** Comments emphasize that initialization must precede Phase 4 (godWorldEngine2.js Phase4-GenericMicroEvents block).

### `persistenceExecutor.js` (executePersistIntents_, Phase 10) — FULL-READ
- **Gate:** Aborts if `!ctx.persist`. Skips execution if `ctx.mode.dryRun` or `ctx.mode.replay` are true (logs intents only).
- **Layer 1:** Executes queued intents in priority order: `ensure` (25) -> `replace` (50) -> updates like `cell`/`range`/`append` (100) -> `logs` (200). 
- **Layer 2:** Employs `persistWithRetry_` (delays: 0, 2s, 5s, 12s) to handle transient Google Spreadsheets service timeouts/errors. Batches `append` and `range` operations per sheet to reduce API calls.
- **Cross-sheet:**
  - **Reads:** Validates sheet existence across the workbook.
  - **Writes:** Executes structural (`ensure`, `replace`) and data (`range`, `cell`, `append`) changes across any sheet requested by intents.
- **Full-read catches:** Collapses duplicate `ensure` intents to guarantee idempotency. Builds and tracks execution stats (executed, skipped, errors). Explicitly removed legacy bridges (`bridgeAppendRow_`, etc.) due to V3 migration completion.

### `commitSimulationLedger.js` (commitSimulationLedger_, Phase 10) — FULL-READ
- **Gate:** Skips if `!ctx.ledger` or `!ctx.ledger.dirty`.
- **Layer 1:** Queues a single consolidated `range` intent to flush the shared `ctx.ledger.rows` memory back to the spreadsheet.
- **Layer 2:** Enforces "last-writer-wins" semantics for the entire Phase 5 block into one write action starting at row 2.
- **Cross-sheet:**
  - **Reads:** None
  - **Writes:** Queues intent for `Simulation_Ledger`
- **Full-read catches:** Relies on `setValues` auto-extend behavior to handle appended rows (e.g., from intake), avoiding the need for separate append intents. Must run before `executePersistIntents_`.

### `writeIntents.js` (Multiple Helpers, Utilities) — FULL-READ
- **Gate:** Most functions auto-initialize via `initializePersistContext_` if `ctx.persist` is missing. Validate function catches malformed intents.
- **Layer 1:** Provides the V3 intent creation API (`queueCellIntent_`, `queueRangeIntent_`, `queueAppendIntent_`, `queueReplaceIntent_`, `queueEnsureTabIntent_`, `queueLogIntent_`).
- **Layer 2:** Sorts intents into arrays (`replaceOps`, `updates`, `logs`) on `ctx.persist` with explicit execution priorities (25, 50, 100, 200). 
- **Cross-sheet:** 
  - **Reads/Writes:** None directly (creates purely in-memory objects).
- **Full-read catches:** Includes robust debugging/audit helpers (`getIntentSummary_`, `getIntentsForSheet_`). Intent schema enforces domain tracking for post-cycle auditing. 

### `v3NeighborhoodWriter.js` (saveV3NeighborhoodMap_, Phase 8) — FULL-READ
- **Gate:** Skips execution on `ctx.mode.dryRun`. Throws (refusing positional write) if the live sheet's first 15 headers do not strictly match the expected `TEXTURE_COL_COUNT` schema.
- **Layer 1:** Calculates neighborhood profiles (Nightlife, Crime, Retail, Sentiment, Attractiveness) by fusing base engine dynamics, weather/traffic noise, world event parsing (keyword hooks), and calendar/holiday overrides. Applies engine.33 `pulseFoldDelta_` and engine.11 `chaosNeighborhoodFold`. 
- **Layer 2:** Uses a strict append-only schema (`ensureNeighborhoodMapSchemaAppendOnly_`) that adds missing columns at the far right and never wipes. Replaces texture rows 2:N in a single batch. Writes `District` mappings using live-header column lookups to avoid clobbering adjacent Phase 6 columns.
- **Cross-sheet:**
  - **Reads:** `Neighborhood_Map` (headers for validation). 
  - **Writes:** `Neighborhood_Map` (texture block 15 cols, plus dynamic District column).
- **Full-read catches:** Fully ES5 compatible (no arrow functions or array methods). Implements `CITY_SENTIMENT_NUDGE` fix to stop lockstep citywide sentiment swings. Caps pulse folding using `PULSE_REF_EVENTS` normalization to handle high-volume event regimes. Relies completely on deterministic `ctx.rng`.

## Phase 1 & 2: Configuration & World State

### `advanceSimulationCalendar.js` (advanceSimulationCalendar_, Phase 1) — FULL-READ
- **Gate:** Runs unconditionally during Phase 1 to advance simulation date.
- **Layer 1:** Evaluates current `ctx.summary.absoluteCycle`, increments `simMonth`, `simYear`, `cycleOfYear`, and adjusts calendar phase.
- **Layer 2:** Mutates `S.simMonth`, `S.cycleId`, `S.cycleOfYear`, providing the baseline temporal progression used by all downstream phase02/03 logic.
- **Cross-sheet:** Reads from `S.previousCycleState` to determine rollover points. Writes core temporal variables into the active `ctx.summary` which later cascades to `GodWorld_Config`.
- **Full-read catches:** Note that S327 removed manual calendar overrides; the calendar is now purely derived from cycle count.

### `loadPreviousEvening.js` (loadPreviousEvening_, Phase 1) — FULL-READ
- **Gate:** Runs unconditionally.
- **Layer 1:** Rehydrates `S.previousCycleState` from the previous evening's `finalizeCycleState_` snapshot.
- **Layer 2:** Exposes `S.previousCycleState` (including previous dynamics, weather Tracking, etc.) for momentum-smoothing in Phase 2.
- **Cross-sheet:** Reads the output snapshot of the previous run (effectively the database payload of `Cycle_History`).
- **Full-read catches:** The fail-closed parsing prevents corrupted previous states from crashing the current run, instead returning an empty fallback state.

### `applyInitiativeImplementationEffects.js` (applyInitiativeImplementationEffects_, Phase 2) — FULL-READ
- **Gate:** Requires `ctx.summary.activeInitiatives` array.
- **Layer 1:** Iterates over active initiatives, evaluating their `implementationPhase` and `domain`. Calculates a blended `sentimentBoost`.
- **Layer 2:** Populates `S.initiativeImplementationEffects` with aggregated deltas. Calls `recordRipple_` for safety/tracking ledgers.
- **Cross-sheet:** Reads from `Initiative_Tracker` rows. Downstream consumer is `applyCityDynamics_` which applies `sentimentBoost` to `finalCity.sentiment`.
- **Full-read catches:** Triggers engine.45 T3e ripple attribution.

### `loadNeighborhoodState.js` (loadNeighborhoodState_, Phase 2) — FULL-READ
- **Gate:** Runs unconditionally to populate neighborhood-level baselines.
- **Layer 1:** Aggregates raw neighborhood statuses (economy, crime stats, demographics).
- **Layer 2:** Writes `S.neighborhoodEconomies`, `S.crimeByNeighborhood`, and `S.neighborhoodDemographics`.
- **Cross-sheet:** Loads static definitions from `GodWorld_Neighborhoods` and active stats from `City_Demographics` / `Crime_Metrics`.
- **Full-read catches:** Serves as the primary dependency for micro-climate and cluster-based calculations later in Phase 2.

### `updateTransitMetrics.js` (updateTransitMetrics_, Phase 2) — FULL-READ
- **Gate:** Runs unconditionally.
- **Layer 1:** Evaluates `S.weather` (via `getTransitWeatherModifier_`) and base transit capacities to calculate `transitCongestion` and delays.
- **Layer 2:** Mutates `S.cityDynamicsCapacity` transit fields and issues transit alerts.
- **Cross-sheet:** Feeds into `applyCityDynamics_` to apply capacity friction to cluster traffic.
- **Full-read catches:** Heavily dependent on precipitation and visibility metrics.

### `applyWeatherModel.js` (applyWeatherModel_, Phase 2) — FULL-READ
- **Gate:** Runs unconditionally. Requires `S.simMonth` and `ctx.rng`.
- **Layer 1:** Markov chain transition for weather fronts (`CLEAR`, `STORM`, `MARINE`, etc.), factoring in seasonal/holiday tweaks. Calculates `precipitationIntensity`, `windSpeed`, and `visibility`.
- **Layer 2:** Writes `S.weather`, `S.weatherSummary`, `S.neighborhoodWeather`, `S.weatherEvents` (with salience thresholds for STORM/FLOOD/HEAT_WAVE).
- **Cross-sheet:** Emits `recordRipple_` events for major weather shifts. Consumed widely by dynamics, citizen mood, and crime modifiers.
- **Full-read catches:** The W-1 engine.70 spec ensures multi-day fronts persist via `S.weatherFrontTracking` carried over from `previousCycleState`.

### `getsimseason.js` (getSimSeason_, Phase 2) — FULL-READ
- **Gate:** Requires `S.simMonth`.
- **Layer 1:** Maps `simMonth` to one of the four seasons (`Spring`, `Summer`, `Fall`, `Winter`).
- **Layer 2:** Sets `S.season`.
- **Cross-sheet:** The foundational lookup for seasonal weighting and weather front probabilities.
- **Full-read catches:** Pure utility script; no complex side-effects.

### `applySportsSeason.js` (applySportsSeason_, Phase 2) — FULL-READ
- **Gate:** Evaluates current `S.simMonth` against sports calendar (Baseball, Basketball).
- **Layer 1:** Determines active teams, applies win/loss streaks (`S.sportsFeed`).
- **Layer 2:** Calculates `S.sportsSentimentBoost`. Emits sports ripples to `recordRipple_`.
- **Cross-sheet:** Reads static team schedules. Drives cluster sentiment (via `applyCityDynamics_`).
- **Full-read catches:** Engine.45 T3a fixes a bug where `sportsSentimentBoost` previously landed on a dead sentiment property instead of `finalCity.sentiment`.

### `applySeasonWeights.js` (applySeasonWeights_, Phase 2) — FULL-READ
- **Gate:** Requires `S.season`.
- **Layer 1:** Determines baseline multipliers for tourism, retail, and public spaces based on the season.
- **Layer 2:** Provides season modifiers to the dynamics builder.
- **Cross-sheet:** Integrated directly into `applyCityDynamics_` via `applySeasonModifiers_`.
- **Full-read catches:** Winter reduces public spaces while Spring/Summer elevate them.

### `getSimHoliday.js` (getSimHoliday_, Phase 2) — FULL-READ
- **Gate:** Evaluates `S.cycleOfYear` and `S.simMonth`.
- **Layer 1:** Checks for major holidays (Halloween, Thanksgiving, Juneteenth) and Oakland-specific cultural days (First Friday, Creation Day).
- **Layer 2:** Writes `S.holiday`, `S.holidayPriority`, `S.isFirstFriday`, `S.isCreationDay`.
- **Cross-sheet:** Holiday tags flow into `applyWeatherModel_` (holiday tweaks) and `applyCityDynamics_`.
- **Full-read catches:** First Friday causes a significant social/cultural activity boost specifically in the DOWNTOWN_CORE cluster.

### `loadEventContentLedger.js` (loadEventContentLedger_, Phase 2) — FULL-READ
- **Gate:** Runs unconditionally to parse the external event ledger.
- **Layer 1:** Maps raw row data into structured `S.eventContent` objects. Strict fail-closed row parsing drops malformed data.
- **Layer 2:** Populates event pools for civic, cultural, and corporate events.
- **Cross-sheet:** Reads `Event_Ledger` tab.
- **Full-read catches:** Built to prevent authoring errors in the ledger from crashing downstream simulation systems.

### `applyCityDynamics.js` (applyCityDynamics_, Phase 2) — FULL-READ
- **Gate:** Consumes outputs from weather, sports, editions, and holidays.
- **Layer 1:** Distributes dynamics (`traffic`, `retail`, `nightlife`, `tourism`, `publicSpaces`, `sentiment`, `culturalActivity`, `communityEngagement`) across 5 clusters (`DOWNTOWN_CORE`, `WATERFRONT_WEST`, etc.).
- **Layer 2:** Computes `S.cityDynamics`, `S.clusterDynamics`, `S.neighborhoodDynamics`. Applies momentum smoothing, sentiment bleed, capacity friction, and crime ripples.
- **Cross-sheet:** Heavily couples with `S.weatherSummary`, `S.editionSentimentBoost`, `S.crimeByNeighborhood`. Writes to safety/tracking via `recordRipple_`.
- **Full-read catches:** S247 fix applied here to prevent undefined `neighborhoodDynamics` throws during momentum blending. Exposes `getClusterDynamics_` for Phase 3+.

### `calendarChaosWeights.js` (calendarChaosWeights_, Phase 2) — FULL-READ
- **Gate:** Evaluates `S.absoluteCycle`.
- **Layer 1:** Introduces deterministic noise/chaos factors to prevent the simulation from settling into perfectly smooth trends.
- **Layer 2:** Provides baseline noise multipliers for population drift and crisis generation.
- **Cross-sheet:** Outputs are fed into Phase 3 crisis spikes.
- **Full-read catches:** Uses seeded RNG to ensure reproducibility of chaos spikes for debugging.

### `applyEditionCoverageEffects.js` (applyEditionCoverageEffects_, Phase 2) — FULL-READ
- **Gate:** Requires `S.previousCycleState.mediaEffects`.
- **Layer 1:** Translates previous media tone (hope/anxiety/crisisSaturation) into immediate cycle modifiers.
- **Layer 2:** Sets `S.editionSentimentBoost` and `S.editionNeighborhoodEffects`.
- **Cross-sheet:** Drives the v3.2 coverage->sentiment chain resolved in `applyCityDynamics_`.
- **Full-read catches:** Wires the previously dead output (S202 / S216) into actual persisted city mood.

### `calendarStorySeeds.js` (calendarStorySeeds_, Phase 2) — FULL-READ
- **Gate:** Parses active narrative arcs.
- **Layer 1:** Determines which story seeds are active and their domain mapping (Culture, Community, Business).
- **Layer 2:** Populates `S.storySeedSignals` with weighted seed signatures.
- **Cross-sheet:** Provides local boosts to specific neighborhoods/clusters in `applyCityDynamics_`.
- **Full-read catches:** Allows manual story authoring to naturally bend localized simulation metrics without overriding the global state.

## Phase 3: Population
### `updateNeighborhoodDemographics.js` (updateNeighborhoodDemographics_, Phase 3) — FULL-READ
- **Gate:** Requires `S.neighborhoodDemographics` base.
- **Layer 1:** Processes localized demographic shifts (e.g. sickness spikes, employment changes based on cluster economy).
- **Layer 2:** Mutates `S.neighborhoodDemographics` with new ratios.
- **Cross-sheet:** Consumes `S.neighborhoodDynamics` (especially economy and sentiment) to drive demographic churn.
- **Full-read catches:** Uses `queueCellIntent_` to stage writes for the `City_Demographics` sheet via Persistence Seams.

### `updateCityTier.js` (updateCityTier_, Phase 3) — FULL-READ
- **Gate:** Evaluates total population and rolling economic/sentiment averages.
- **Layer 1:** Checks if the city has crossed tier thresholds (e.g. Town -> City -> Metropolis).
- **Layer 2:** Sets `S.cityTier` and modifies base capacity limits (transit, road, venue).
- **Cross-sheet:** Writes back to `GodWorld_Config` if a tier change occurs.
- **Full-read catches:** Tier changes trigger a cascade of capacity re-evaluations in the next cycle.

### `finalizeWorldPopulation.js` (finalizeWorldPopulation_, Phase 3) — FULL-READ
- **Gate:** Final step of Phase 3 demographic calculations.
- **Layer 1:** Aggregates all neighborhood populations, applies mortality/birth/migration rates.
- **Layer 2:** Sets `S.totalPopulation` and final demographic breakdowns.
- **Cross-sheet:** Writes the master population records for the cycle.
- **Full-read catches:** Ensures that the sum of neighborhood populations perfectly matches the global total to prevent accounting drift.

### `generateCrisisSpikes.js` (generateCrisisSpikes_, Phase 3) — FULL-READ
- **Gate:** Uses `calendarChaosWeights` and current sentiment/crime limits.
- **Layer 1:** Evaluates if the current combination of low sentiment, high crime, and high chaos triggers a localized or citywide crisis.
- **Layer 2:** Injects crisis events into `S.activeAlerts` and `S.crisisEvents`.
- **Cross-sheet:** Ripples into Media/News generation for the next cycle.
- **Full-read catches:** Includes back-offs to prevent back-to-back citywide crises in adjacent cycles.

### `deriveDemographicDrift.js` (deriveDemographicDrift_, Phase 3) — FULL-READ
- **Gate:** Runs at the end of Phase 3.
- **Layer 1:** Accumulates micro-shifts from holidays, sports, nightlife, and weather over time rather than using hard overrides.
- **Layer 2:** Calculates the `driftFactor` for various demographic segments (e.g., student retention, senior migration).
- **Cross-sheet:** Persists drift values that slowly reshape baseline parameters over weeks of simulation time.
- **Full-read catches:** Centralizes all slow-moving variables to prevent rapid oscillation in daily simulation outputs.

### `generateCrisisBuckets.js` (generateCrisisBuckets_, Phase 3) — FULL-READ
- **Gate:** `ctx.summary.activeCrises`
- **Layer 1:** Groups population demographics into crisis impact buckets.
- **Layer 2:** N/A.
- **Cross-sheet:** Depends on crisis tracking. Feeds into drift mechanics.
- **Full-read catches:** None.

### `updateCrimeMetrics.js` (updateCrimeMetrics_, Phase 3) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`
- **Layer 1:** Evaluates crime events to compute safety and risk scores.
- **Layer 2:** N/A.
- **Cross-sheet:** Dependent on Phase 2 world events. Affects civic load.
- **Full-read catches:** None.

### `generateMonthlyDriftReport.js` (generateMonthlyDriftReport_, Phase 3) — FULL-READ
- **Gate:** `ctx.summary.demographics`, `ctx.summary.metrics`
- **Layer 1:** Compiles a monthly summary of demographic shifts.
- **Layer 2:** N/A.
- **Cross-sheet:** Needs historical context. Used by Phase 4/6 reports.
- **Full-read catches:** None.

### `applyDemographicDrift.js` (applyDemographicDrift_, Phase 3) — FULL-READ
- **Gate:** `ctx.summary.driftReport`, `ctx.summary.events`
- **Layer 1:** Applies calculated demographic shifts to the base population.
- **Layer 2:** Core update mechanism for population state.
- **Cross-sheet:** Modifies global demographics variables.
- **Full-read catches:** None.

## Phase 6: Analysis
### `applyShockMonitor.js` (applyShockMonitor_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`, `ctx.summary.cityDynamics`
- **Layer 1:** Monitors extreme spikes in city chaos or negative sentiment.
- **Layer 2:** N/A.
- **Cross-sheet:** Pre-cursor to evening safety systems.
- **Full-read catches:** None.

### `economicRippleEngine.js` (economicRippleEngine_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.careerSignals`, `ctx.summary.businessDeltas`
- **Layer 1:** Propagates localized economic effects throughout the city.
- **Layer 2:** Tightly coupled with career engine.
- **Cross-sheet:** Generates `economicRipples`.
- **Full-read catches:** None.

### `applyPatternDetection.js` (applyPatternDetection_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`
- **Layer 1:** Identifies recurring motifs and themes.
- **Layer 2:** N/A.
- **Cross-sheet:** Feeds into prioritization and cultural mechanics.
- **Full-read catches:** None.

### `updateStorylineStatusv1.2.js` (updateStorylineStatus_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.eventArcs`
- **Layer 1:** Refreshes storyline states (active, fading, resolved).
- **Layer 2:** Mutates `eventArcs` status inline.
- **Cross-sheet:** Works alongside `processArcLifeCyclev1.js`.
- **Full-read catches:** None.

### `applyMigrationDrift.js` (applyMigrationDrift_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.economicRipples`
- **Layer 1:** Calculates population influx/exodus based on economics.
- **Layer 2:** N/A.
- **Cross-sheet:** Requires economic ripple output.
- **Full-read catches:** None.

### `prePublicationValidation.js` (prePublicationValidation_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.mediaOutput`
- **Layer 1:** Quality gate for tone, continuity, and sensitivity.
- **Layer 2:** N/A.
- **Cross-sheet:** Final check before Phase 7 media generation.
- **Full-read catches:** None.

### `storylineHealthEngine.js` (storylineHealthEngine_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.eventArcs`
- **Layer 1:** Detects fizzled storylines and forces wrap-up hooks.
- **Layer 2:** Complements `processArcLifeCyclev1.js`.
- **Cross-sheet:** Updates arc health status.
- **Full-read catches:** None.

### `processArcLifeCyclev1.js` (processArcLifeCycle_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`, `ctx.summary.metrics`
- **Layer 1:** Resolves storylines dynamically based on world conditions.
- **Layer 2:** Core engine for narrative closure.
- **Cross-sheet:** Evaluates global contexts to resolve arcs.
- **Full-read catches:** None.

### `applyCivicLoadIndicator.js` (applyCivicLoadIndicator_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`
- **Layer 1:** Tracks system strain and filters old backlog bugs.
- **Layer 2:** Connects to city evening safety state.
- **Cross-sheet:** Evaluates total load across civic operations.
- **Full-read catches:** None.

### `prioritizeEvents.js` (prioritizeEvents_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`
- **Layer 1:** Sorts events by world state, domain, and demographic shifts.
- **Layer 2:** Depends on multiple Phase 6 metrics.
- **Cross-sheet:** Outputs `prioritizedEvents` for media.
- **Full-read catches:** None.

### `filterNoiseEvents.js` (filterNoiseEvents_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`
- **Layer 1:** Compresses minor events to reduce signal noise.
- **Layer 2:** Acts before media consumption phases.
- **Cross-sheet:** Filters raw event stream.
- **Full-read catches:** None.

### `computeRecurringCitizens.js` (computeRecurringCitizens_, Phase 6) — FULL-READ
- **Gate:** `ctx.summary.characterMentions`
- **Layer 1:** Tracks player/citizen appearances.
- **Layer 2:** Feeds directly into `culturalLedger.js`.
- **Cross-sheet:** Aggregates character metadata.
- **Full-read catches:** None.

## Phase 7: Evening Media
### `culturalLedger.js` (culturalLedger_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary.recurringCitizens`
- **Layer 1:** Registers fame points and tracks cultural entities via POPID.
- **Layer 2:** Core tracking mechanism for fame decay.
- **Cross-sheet:** Writes to Persistent ledger (Sheets).
- **Full-read catches:** None.

### `buildEveningFamous.js` (buildEveningFamous_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary.culturalLedger`
- **Layer 1:** Selects daily featured celebrities for media broadcast.
- **Layer 2:** Depends heavily on cultural ledger stats.
- **Cross-sheet:** Reads cultural fame tables.
- **Full-read catches:** None.

### `domainTracker.js` (domainTracker_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary.worldEvents`, `ctx.summary.eventArcs`, Calendar context
- **Layer 1:** Aggregates categorical domain activity (e.g., ARTS, SPORTS).
- **Layer 2:** Drives evening layout and thematic styling.
- **Cross-sheet:** None.
- **Full-read catches:** None.

### `cityEveningSystems.js` (cityEveningSystems_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary.weather`, `ctx.summary.cityDynamics`, Calendar context
- **Layer 1:** Computes evening crowd density, safety, and traffic.
- **Layer 2:** Generates final world atmosphere metrics for media rendering.
- **Cross-sheet:** None.
- **Full-read catches:** None.

### `textureTriggers.js` (textureTriggers_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary` variables + `ctx.rng`
- **Layer 1:** Generates deterministic ambient texture triggers based on weather, city mood, holidays, and arc tension.
- **Layer 2:** Pure functional logic; appends texture trigger arrays.
- **Cross-sheet:** None directly (modifies `ctx.summary`).
- **Full-read catches:** None.

### `sportsStreaming.js` (sportsStreaming_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary` variables
- **Layer 1:** Calculates streaming trends based on mood/weather/calendar events.
- **Layer 2:** N/A.
- **Cross-sheet:** Operates solely on `ctx.summary`.
- **Full-read catches:** None.

### `applyStorySeeds.js` (applyStorySeeds_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary` (arcs, world events, holidays, patterns, civic load, migration drift, weather, sentiment, economy, city dynamics, domains, etc.)
- **Layer 1:** Analyzes multiple simulation state elements to assemble "story seeds" for media coverage (hooks, breaking news, patterns). Includes deduplication and priority sorting.
- **Layer 2:** N/A.
- **Cross-sheet:** Connects multiple sub-systems inside `ctx.summary`. Does not interact directly with GAS spreadsheet API.
- **Full-read catches:** None.

### `buildContractSeeds.js` (buildContractSeeds_, Phase 7) — FULL-READ
- **Gate:** `ctx`, `ctx.summary.rippleEvents`, `ctx.ss`
- **Layer 1:** Queries multiple ledgers to construct concrete story seeds ("contracts") linking simulation ripples to specific entities and citizens.
- **Layer 2:** N/A.
- **Cross-sheet:** **High integration with GAS**. Uses `ctx.ss.getSheetByName` to perform read-only lookups on `LifeHistory_Log`, `Business_Ledger`, `Faith_Organizations`, `Community_Programs`.
- **Full-read catches:** None.

### `parseMediaIntake.js` (parseMediaIntake_, Phase 7) — FULL-READ
- **Gate:** `ctx`, raw media text output.
- **Layer 1:** Parses text looking for the `CULTURAL INDEX` block. Can trigger `registerCulturalEntity_()`.
- **Layer 2:** Acts as a parser/middleware.
- **Cross-sheet:** Potentially calls `registerCulturalEntity_` (which interacts with GAS).
- **Full-read catches:** None.

### `buildMediaPacket.js` (buildMediaPacket_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary`
- **Layer 1:** Builds a Markdown packet detailing the cycle for the newsroom (LLM agents).
- **Layer 2:** Assembles the packet purely from `ctx.summary` properties, acting as a data-to-presentation layer.
- **Cross-sheet:** No direct GAS spreadsheet interaction.
- **Full-read catches:** None.

### `updateMediaSpread.js` (updateMediaSpread_, Phase 7) — FULL-READ
- **Gate:** `sheet`, `row`, `journalistName`.
- **Layer 1:** Modifies the specified row in the sheet to increment `MediaSpread` and record `FirstRefSource`.
- **Layer 2:** Header-based column lookup.
- **Cross-sheet:** **High integration with GAS**. Direct mutation of Google Sheets cells via `sheet.getRange(row, col).setValue(...)`.
- **Full-read catches:** None.

### `updateTrendTrajectory.js` (updateTrendTrajectory_, Phase 7) — FULL-READ
- **Gate:** `sheet`, `row`, `fameScore`.
- **Layer 1:** Modifies the specified row to record a new `TrendTrajectory` ("viral", "surging", "stable", etc.) based on `fameScore` deltas, `MediaCount`, and `MediaSpread`.
- **Layer 2:** Header-based column lookup.
- **Cross-sheet:** **High integration with GAS**. Direct mutation of Google Sheets cells via `sheet.getRange()`.
- **Full-read catches:** None.

### `mediaRoomBriefingGenerator.js` (mediaRoomBriefingGenerator_, Phase 7) — FULL-READ
- **Gate:** `ctx`, `ctx.ss`, `ctx.summary`
- **Layer 1:** Reads `Storyline_Tracker`, `Civic_Office_Ledger`, `Election_Log`. Appends row to `Media_Briefing` sheet.
- **Layer 2:** N/A.
- **Cross-sheet:** **High integration with GAS**. Uses `ss.getSheetByName` to pull civic context and storylines. Creates `Media_Briefing` sheet if missing. Writes final briefing string via `sheet.appendRow()`.
- **Full-read catches:** None.

### `mediaRoomIntake.js` (mediaRoomIntake_, Phase 7) — FULL-READ
- **Gate:** `ctx`, `ctx.ss`, `ctx.summary`, Raw text.
- **Layer 1:** Updates `Media_Ledger`, `Advancement_Intake1`, `Intake`, and `LifeHistory_Log`. Uses normalization for citizen identity matching.
- **Layer 2:** Manages schema upgrades across these sheets.
- **Cross-sheet:** **High integration with GAS**. Massively reads and writes to various ledger sheets based on parsing raw text logs from media operations.
- **Full-read catches:** None.

### `storylineWeavingEngine.js` (storylineWeavingEngine_, Phase 7) — FULL-READ
- **Gate:** `ctx.summary`
- **Layer 1:** Weaves disparate story seeds and assigns roles (protagonist/antagonist).
- **Layer 2:** N/A.
- **Cross-sheet:** Manipulates data within `ctx.summary` to link narrative arcs.
- **Full-read catches:** None.

### `buildEveningFood.js` / `buildEveningMedia.js` / `buildNightLife.js` (Phase 7) — FULL-READ
- **Gate:** `ctx.summary`
- **Layer 1:** Generates daily world-aware content based on contexts.
- **Layer 2:** N/A.
- **Cross-sheet:** Reads and updates `ctx.summary`.
- **Full-read catches:** None.

### `mediaFeedbackEngine.js` / `storyHook.js` / `parseMediaRoomMarkdown.js` (Phase 7) — FULL-READ
- **Gate:** Media artifacts, `ctx.summary`
- **Layer 1:** Translates LLM output or generated hooks back into simulation state hints.
- **Layer 2:** N/A.
- **Cross-sheet:** Bridges raw text artifacts with `ctx.summary` structures.
- **Full-read catches:** None.

## Phase 08: V3 Chicago Satellite
### `chicagoSatellite.js` (chicagoSatellite_, Phase 8) — FULL-READ
- **Gate:** `ctx.summary`
- **Layer 1:** Calculates simulation deltas for the separate Chicago context.
- **Layer 2:** N/A.
- **Cross-sheet:** Maintains separate state linked via common calendar events.
- **Full-read catches:** None.

### `v3NeighborhoodWriter.js` (v3NeighborhoodWriter_, Phase 8) — FULL-READ
- **Gate:** Simulation deltas.
- **Layer 1:** Specific sheet writes for neighborhood map data.
- **Layer 2:** Updates mapping coordinates/metrics.
- **Cross-sheet:** Write operations to GAS sheets mapping the physical locations.
- **Full-read catches:** None.

### `applyDomainCooldowns.js` (applyDomainCooldowns_, Phase 8) — FULL-READ
- **Gate:** `ctx.summary`
- **Layer 1:** Dynamically adjusts cooldowns based on events (e.g. shorter cooldowns during playoffs).
- **Layer 2:** N/A.
- **Cross-sheet:** Affects the flow of events across cycles by applying modifiers to the active context.
- **Full-read catches:** None.

### `v3preLoader.js` (v3preLoader_, Phase 8) — FULL-READ
- **Gate:** Phase 8 initialization. Bootstraps system containers and state objects (context, dynamics, weather). 
- **Layer 1:** Recovers zombie arcs and pre-loads multi-cycle arc data from the ledger into memory.
- **Layer 2:** N/A.
- **Cross-sheet:** Reads `Event_Arc_Ledger` full dataset to instantiate active multi-cycle story arcs. Writes state to `ctx.summary` for downstream modules.
- **Full-read catches:** Full data range read of `Event_Arc_Ledger` upon initialization.

### `v3TextureWriter.js` (v3TextureWriter_, Phase 8) — FULL-READ
- **Gate:** Phase 8 execution via V3 runner. Writes environmental and atmospheric flavor elements (e.g., weather, time of day).
- **Layer 1:** Generates passive texture, not probabilistic citizen events.
- **Layer 2:** N/A.
- **Cross-sheet:** Expected to write to environmental/cycle texture output sheets (e.g., `Cycle_Texture`).
- **Full-read catches:** No full sheet reads detected.

### `v3Integration.js` (v3Integration_, Phase 8) — FULL-READ
- **Gate:** Orchestrator/Dispatcher for all V3 components. Relies on a function registry pattern rather than `eval()`.
- **Layer 1:** Execution router.
- **Layer 2:** N/A.
- **Cross-sheet:** Dispatches execution to modular writers (Domain, Chicago, Hook, Ledger) which manage their own cross-sheet logic. 
- **Full-read catches:** None natively.

### `v3DomainWriter.js` (v3DomainWriter_, Phase 8) — FULL-READ
- **Gate:** Evaluates and records the prevailing narrative domains (e.g., Civic, Culture, Business) active during the cycle based on calendar context.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Writes domain presence data mapping to `Domain_Tracker`.
- **Full-read catches:** None.

### `v3ChicagoWriter.js` (v3ChicagoWriter_, Phase 8) — FULL-READ
- **Gate:** Generates external/satellite environment context representing 'Chicago' (outside GodWorld influence) like global sentiment and weather analogs.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Writes to `Chicago_Feed` sheet.
- **Full-read catches:** None.

### `v3StoryHookWriter.js` (v3StoryHookWriter_, Phase 8) — FULL-READ
- **Gate:** Formats and persists cycle story hooks with rich metadata (Journalist, Angle, Voice) attached.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Writes to `Story_Hooks` (or equivalent media/narrative intake sheets).
- **Full-read catches:** None.

### `applyCycleRecovery.js` (applyCycleRecovery_, Phase 8) — FULL-READ
- **Gate:** Checks overload scores and suppression flags to model engine and citizen fatigue.
- **Layer 1:** Modifies probability scaling factors. High overload scores suppress active generation to simulate "cooldowns" or recovery cycles.
- **Layer 2:** Governs macro-level volume, not individual citizen dials.
- **Cross-sheet:** Modulates context state in `ctx.summary`.
- **Full-read catches:** None.

### `v3LedgerWriter.js` (v3LedgerWriter_, Phase 8) — FULL-READ
- **Gate:** Phase 10 execution. Drains pending write-intents and persists multi-cycle event arcs.
- **Layer 1:** N/A (Persistence layer).
- **Layer 2:** Appends generated narrative arcs to the central tracking registry.
- **Cross-sheet:** Append-only writes to `Event_Arc_Ledger`.
- **Full-read catches:** None.

## Phase 9 & 11: Digest & Intake
### `applyCycleWeight.js` (applyCycleWeight_, Phase 9) — FULL-READ
- **Gate:** Evaluates world events, recovery levels, and calendar to classify the cycle's significance (e.g., `low-signal`, `high-signal`).
- **Layer 1:** Computes weight multipliers that scale how heavily events impact macro-variables.
- **Layer 2:** N/A.
- **Cross-sheet:** Assigns output to `ctx.summary.cycleWeight` and `cycleWeightScore`.
- **Full-read catches:** None.

### `applyCompressionDigestSummary.js` (applyCompressionDigestSummary_, Phase 9) — FULL-READ
- **Gate:** Consolidates complex cycle signals into compressed, single-line string summaries representing the "tl;dr" state of the cycle.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Output is typically pushed to a cycle-tracking summary log or meta-ledger. 
- **Full-read catches:** None.

### `finalizeCycleState.js` (finalizeCycleState_, Phase 9) — FULL-READ
- **Gate:** Phase 9 (after analysis, before persistence). Protected by an idempotence guard (`S.previousCycleState.cycle === cycle`) to prevent double-finalize on reruns.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Uses Apps Script `PropertiesService` to serialize state for next-cycle read (`PREV_EVENING_JSON`, `PREV_CYCLE_STATE_JSON`), persisting things like `weatherFrontTracking`, `crisisArcs`, and `economicRipples`.
- **Full-read catches:** No full sheet reads; operates purely in memory on `ctx.summary`.

### `continuityNotesParser.js` (continuityNotesParser_, Phase 11) — FULL-READ
- **Gate:** Manual trigger (`parseContinuityNotes()`). Only executes if the `Raw_Continuity_Paste` sheet exists.
- **Layer 1:** Classifies raw strings into `NoteType` logic variants: `introduced`, `question`, `resolved`, `callback`, `seasonal`, `builton`.
- **Layer 2:** Identifies citizens affected by continuity notes using primitive capital-word regex logic.
- **Cross-sheet:** Reads `Raw_Continuity_Paste` and appends structured rows to `Continuity_Intake`.
- **Full-read catches:** Extracts the entire dataset of `Raw_Continuity_Paste` (`getDataRange().getValues()`).

### `healthCauseIntake.js` (healthCauseIntake_, Phase 11) — FULL-READ
- **Gate:** Exports cases for citizens with specific statuses (`hospitalized`, `critical`, `serious-condition`, `injured`). Later processes markdown-based assignments from the Media Room.
- **Layer 1:** N/A.
- **Layer 2:** Appends or updates the `HealthCause` column in `Simulation_Ledger`.
- **Cross-sheet:** Scans `Simulation_Ledger` and writes/updates `Health_Cause_Queue`. Also reads `Health_Cause_Intake` sheet if no direct markdown is provided. 
- **Full-read catches:** Requires full reads of `Simulation_Ledger`, `Health_Cause_Queue`, and `Health_Cause_Intake` via `getDataRange()`.

## Core Libraries & Utilities (lib/)
### `canonBlocklist.js` (canonBlocklist_, lib) — FULL-READ
- **Gate:** Tier-3 contamination runtime check (Node). Asserts that generated canonical names do not drift into real-world blocklisted variants (e.g. faith organizations, clergy leaders).
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** FS read dependency mapping `docs/media/REAL_NAMES_BLOCKLIST.md`.
- **Full-read catches:** N/A (File read, no Sheets).

### `diagnosticLedger.js` (diagnosticLedger_, lib) — FULL-READ
- **Gate:** Utility logging layer for non-engine signals (`test-fail`, `audit-finding`, `detector-flag`, `parser-drift`, `validation-fail`, `engine-error`).
- **Layer 1:** N/A.
- **Layer 2:** Structure dictates appending exactly 10 columns per row into the diagnostics tracker. Uses SHA1 hashing to deduplicate error logs (`hash` column).
- **Cross-sheet:** Writes to `Engine_Errors` via `sheets.appendRows()`. Can scan existing rows using `listRecent()`.
- **Full-read catches:** `listRecent(limit)` grabs sheet objects via `sheetsClient`; `markResolved()` pulls the full `Engine_Errors` payload to find the hash and mutate.

### `reflectionClassifier.js` (reflectionClassifier_, lib) — FULL-READ
- **Gate:** Citizen-loop Phase 2 execution. Pure text-to-tag translation mechanism using LLM (OpenRouter `deepseek-chat`). 
- **Layer 1:** Input-side classifier; purely mapping LLM classification.
- **Layer 2:** Translates prose into exact constrained vocab combinations from the `DIAL_MAP` (`EventTag | AffectTag`). Determines dialectic tension and tracks null/fallback states for tripwire validation. Output tags map cleanly to structural Dials downstream.
- **Cross-sheet:** None directly (returns parsed data). 
- **Full-read catches:** None.

### `sessionLog.js` (sessionLog_, lib) — FULL-READ
- **Gate:** Node read-only log parser layer. Parses historical steps from GodWorld's durable event log markdown output files.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Local FS reads targeting `output/production_log_*.md` and `docs/mags-corliss/JOURNAL.md`.
- **Full-read catches:** N/A (File read).

### `contextScan.js` (contextScan_, lib) — FULL-READ
- **Gate:** Context load threat mitigation layer. Scans ingested text for prompt-injection markers and invisible Unicode characters.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Writes scan failures to `output/injection_blocks.log`.
- **Full-read catches:** Evaluates full provided strings or files via `.match()`.

### `editionParser.js` (editionParser_, lib) — FULL-READ
- **Gate:** Parses raw `.txt` Cycle Pulse editions into structured JSON representations containing headlines, subheads, bylines, and section groupings. Adheres to ADR-0006 "Contract B" (fail-loud on headline mismatch).
- **Layer 1:** N/A.
- **Layer 2:** Imposes semantic structure and enforces presence of the `ARTICLE TABLE`. Consolidates separated body fragments dynamically back into parent articles.
- **Cross-sheet:** Reads `.txt` files from local disk.
- **Full-read catches:** N/A (File read).

### `canonNeighborhoods.js` (canonNeighborhoods_, lib) — FULL-READ
- **Gate:** Structural constant definition for neighborhood nomenclature alignment (S247).
- **Layer 1:** N/A.
- **Layer 2:** Supplies the canonical dictionaries for `CANON_12`, `MAP_NEIGHBORHOODS`, and `CHILDREN` ensuring consistency across the simulation boundaries. Actively excludes invalid aliases (e.g. 'East Oakland').
- **Cross-sheet:** N/A.
- **Full-read catches:** N/A.

### `citizenDerivation.js` (citizenDerivation_, lib) — FULL-READ
- **Gate:** Called at intake/creation for new citizens. Go-forward only (does not touch existing 760 SL rows).
- **Layer 1:** Uses deterministic `rand01` via `djb2` hash on `(popId, salt)` to generate probabilities for traits instead of `Math.random`.
- **Layer 2:** Derives `RoleType`, `EducationLevel`, `Gender`, `YearsInCareer`, `DebtLevel`, `NetWorth`, `MaritalStatus`, `NumChildren` based on deterministic CDF draws and age-bracket/income curves. Outputs a raw object, no direct SL write performed here.
- **Cross-sheet:** No sheet writes. Expects `ledgerFreq` built from `Simulation_Ledger` frequency tallies to do neighborhood-aware draws. Reads from `data/economic_parameters.json`.
- **Full-read catches:** Computes `_careerStage`, `_income`, and `_neighborhood` inline without an SL column. Fallbacks to `DEMOGRAPHIC_VOICE_FALLBACK` for `RoleType`.

### `env.js` (env_, lib) — FULL-READ
- **Gate:** Global scope on import.
- **Layer 1:** N/A (Pure environment loading).
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Uses `override: true` to prioritize the relocated `/root/.config/godworld/.env` file over stale shell/PM2 cached environments (Phase 40.3 credential isolation).

### `sheets.js` (sheets_, lib) — FULL-READ
- **Gate:** Central connection layer; abstracts authentication and API calls.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** Core capability for querying and updating any GodWorld sheet. 
- **Full-read catches:** Uses `GODWORLD_SHEET_ID`. `updateCell` and `updateRowFields` resolve exact column letters at runtime by reading the header row, preventing hard-coded column drift errors.

### `resonanceRecall.js` (resonanceRecall_, lib) — FULL-READ
- **Gate:** Loop-side only execution. No engine loop or schema change, no dial or sheet writes.
- **Layer 1:** Selects memories via a composite score: `W.context * contextMatch + W.staleness * staleness + W.affect * affectWeight`. Tie-breakers are deterministically seeded.
- **Layer 2:** None.
- **Cross-sheet:** None directly. Reads `MemoryRegisters` JSON schema via `unlivedCandidates` and `biasReadback`. 
- **Full-read catches:** Writes bookkeeping states to `logs/citizen-recall-state.json` via `markRecalled` (gated to non-dry runs). `affectWeight` gives a flat mid-score to pre-Task-2 docs, milestones, and unlived tensions.

### `photoGenerator.js` (photoGenerator_, lib) — FULL-READ
- **Gate:** Called during edition generation to assign and build images for articles. 
- **Layer 1:** `extractScene` analyzes article text via keyword matching (no LLM) to deduce visual settings, prioritizing sports scenes if beat is 'sports'. 
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Photographer profiles ("DJ Hartley" for gritty street docs, "Arman Gutiérrez" for formal portraits). Uses FLUX.2 pro via Together AI. `assignPhotos` caps photos at 6 per edition and strictly follows editorial hierarchy.

### `pipelineLogger.js` (pipelineLogger_, lib) — FULL-READ
- **Gate:** Invoked across pipeline steps to maintain a chronological event log.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Writes to `output/pipeline-log/pipeline_c{XX}.jsonl`. Embeds `correlationId: E{cycle}-{Date.now()}` on every entry. Includes a CLI to summarize execution runtimes.

### `memoryFence.js` (memoryFence_, lib) — FULL-READ
- **Gate:** Phase 40.6 Layer 2 defense-in-depth context isolation.
- **Layer 1:** N/A.
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Uses a regex sanitizer to explicitly strip `<memory-context>` elements from payloads before injecting them to ensure injected prose cannot fake exiting the fence (direct port of Hermes Agent's memory manager).

### `personaProvider.js` (personaProvider_, lib) — FULL-READ
- **Gate:** S270 engine-sheet boundary. Drains Discord sessions via `drainConversationReflection_`.
- **Layer 1:** Uses `classifier.classifyTripleReflection_` to analyze buffered conversational replies, enforcing a 30-minute idle-flush boundary.
- **Layer 2:** Handles tension mirroring: resolves tensions by writing to `citizenPage` and logs new tensions to local `TENSION_FILE` (evicting oldest open on cap = 3).
- **Cross-sheet:** Appends one positional A-H row to `Reflection_Intake` (daypart='DISCORD', applied='no').
- **Full-read catches:** Fails open. The conversational chat is explicitly NOT written to the reflection `citizenPage` (chat is conversation, not reflection). Discord buffer is resilient across PM2 restarts.

### `provocationBank.js` (provocationBank_, lib) — FULL-READ
- **Gate:** Evaluates `needs(sig)` against the citizen's signals to selectively route prompts (no faked signals).
- **Layer 1:** Pulls deterministically from the bank based on `hash53_(popId|cycle|daypart)`.
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Preserves "Honest gap" by providing infer-light prompts for media/leisure instead of hallucinating per-citizen media consumption not supported by the engine.

### `coverageAnchorRetirements.js` (coverageAnchorRetirements_, lib) — FULL-READ
- **Gate:** S235 engine.25. Detects retired anchors matching framing keywords in generated text.
- **Layer 1:** Substring-based text scan over an editorial lede scope (`EDITORIAL_LEDE_SCOPE_CHARS = 1500`) against a proximity window (`PROXIMITY_WINDOW_CHARS = 400`).
- **Layer 2:** N/A.
- **Cross-sheet:** None. 
- **Full-read catches:** Centralized registry (`RETIRED_ANCHORS`) prevents retired anchors (e.g., Beverly Hayes / POP-00772) from appearing in poverty-doc frames. Includes visual `avoidSubjectClasses` for photo enforcement. Emits the string block via `renderConventionBlock` to embed conventions inline in wd-citizen cards.

### `citizenDials.js` (citizenDials_, lib) — FULL-READ
- **Gate:** Read-only perception parsing logic (Engine.31/S262). Does not mutate state.
- **Layer 1:** Converts `DialState` JSON (`base` + `mood`) into 0-100 values. Outputs semantic arrays using `POLES` language descriptors.
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Skips the 40-60 neutral range (returns 'even-keeled, unremarkable'). Exposes a `deviation(cur)` calculator to identify strongly shaped citizens.

### `getCurrentCycle.js` (getCurrentCycle_, lib) — FULL-READ
- **Gate:** Execution blocking; crashes immediately if no valid cycle context exists (no silent wrong defaults).
- **Layer 1:** Resolves cycle order from 1) argv, 2) `output/desk-packets/base_context.json`.
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Enforces an env-tag guard verifying that `bc.source.sheetId` perfectly matches `GODWORLD_SHEET_ID` to strictly prevent sandbox runs clobbering production files (S306 incident).

### `neighborhoodSlice.js` (neighborhoodSlice_, lib) — FULL-READ
- **Gate:** Unifies baseline briefs and voice-workspaces to prevent drift.
- **Layer 1:** Aggregates tier-sorted residents per neighborhood alongside tracking cell deltas `(value - prev)`.
- **Layer 2:** N/A.
- **Cross-sheet:** Reads `Simulation_Ledger` and `Neighborhood_Map` array inputs.
- **Full-read catches:** Explicitly surfaces housing pressure and median income in the string output so citizen voices cannot invent structural struggles contrary to the simulation (C95 West Oakland failure mode). Note that `trajectory` replaces `gentrification`.

### `initiativePhaseContract.js` (initiativePhaseContract_, lib) — FULL-READ
- **Gate:** Civic.14 Phase 2/3 validator for raw implementation phases.
- **Layer 1:** Processes phases through `canonicalizePhase` attempting an exact match, variant map match, substring match, or partial token map.
- **Layer 2:** Links explicit `PHASE_INTENSITY` values (-1.0 to +1.0) governing civic impact ripples.
- **Cross-sheet:** None.
- **Full-read catches:** Negative phases (`stalled`, `blocked`, `defunded`) can be entered from any state. `LIFECYCLE` arc governs progression validations. Unresolvable phases correctly return a zero/null state that stops invalid values from writing to the sheet.

### `staleness.js` (staleness_, lib) — FULL-READ
- **Gate:** Pre-flight gate evaluating derivative artifacts against authoritative baselines.
- **Layer 1:** Calculates pure `fs.statSync` modification times. 
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Solves S215 pipeline loss where civic state updates executed after artifact rendering. If baseline doesn't exist, staleness returns `false` since it isn't authoritative yet.

### `economicLookup.js` (economicLookup_, lib) — FULL-READ
- **Gate:** Read-only data mapper for node/Apps Script engine layers.
- **Layer 1:** Calculates incomes using weighted-median random distributions (60% close to median, 40% full range spread) combined with tier, career, and retirement multipliers.
- **Layer 2:** `deriveWealthLevel` calculates 0-10 index scales including 5% net-worth yield logic.
- **Cross-sheet:** None.
- **Full-read catches:** Identifies retired roles (`isRetiredRole`) via regex. Fails gracefully to `null` if the target is `SPORTS_OVERRIDE` or unmapped.

### `districtMap.js` (districtMap_, lib) — FULL-READ
- **Gate:** Maps Oakland neighborhoods to council districts.
- **Layer 1:** Returns flat arrays or null matches over `DISTRICT_NEIGHBORHOODS`.
- **Layer 2:** N/A.
- **Cross-sheet:** None.
- **Full-read catches:** Incorporates S256 canon correction moving KONO from D2 to D7 to match `INSTITUTIONS` files and attribute logic correctly to Warren Ashford.

### `citizenPage.js` (citizenPage_, lib) — FULL-READ
- **Gate:** Wake-side only I/O layer. **NEVER** called from the cycle path to prevent breaking RNG reproducibility invariants.
- **Layer 1:** Interacts heavily with `Supermemory` v3 API via GET/POST to manage isolated text reflections.
- **Layer 2:** `ensurePagePointer_` guarantees that `Simulation_Ledger` AW (`SMPageId`) is populated with the pointer tag `cp-POP-XXXXX`.
- **Cross-sheet:** Denormalizes page pointer directly into `Simulation_Ledger` AW.
- **Full-read catches:** Overrides the v4 hybrid search via list/GET `recentPage_` fallback due to a silent failure mode where exact docs were completely missed. Idempotent appends (`customId` keyed by popId+cycle+daypart). Consumers must provide the `memoryFence`.

### `wakePerception.js` (wakePerception_, lib) — FULL-READ
- **Gate:** Generates input representations to be digested by LLMs. Read-only canon access (nothing writes from this module).
- **Layer 1:** Extrapolates perception across varied modules: dial parsing, Supermemory read-backs, A's team notes, bonds, and neighborhood slices.
- **Layer 2:** N/A.
- **Cross-sheet:** Scans `LifeHistory_Log`, `Oakland_Sports_Feed`, `Relationship_Bonds`, and `Simulation_Ledger`.
- **Full-read catches:** `recentEventMagnitude` dampens the severity of events chronologically `(0.8 ^ age)` to ensure real impacts survive ambient fillers. Implements strict guards against missing `RoleType` vs `Occupation` columns to prevent default 'resident' flattening (S300 fix).

### `mags.js` (mags_, lib) — FULL-READ
- **Gate:** Central identity loader for Mags' operations and discord-bot interactions.
- **Layer 1:** Distills orientation knowledge (`world_summary_c{NN}.md`), archive metrics, and recent reflections.
- **Layer 2:** N/A.
- **Cross-sheet:** `loadFamilyData` parses `Simulation_Ledger` for specific `FAMILY_POP_IDS`.
- **Full-read catches:** Filters `loadRecentReflections` for `### Nightly Reflection` directly, dropping terminal operator entries so the simulation identity is untainted (S252 fix). Uses a `searchDisk` method executing raw system `grep` for zero API-cost file checks. Contains env-sheet verification hooks `warnIfForeignBaseContext` to catch sandbox clobberings.


## Residuals (narrow — tuning/depth, not a rebuild)

1. **Content depth:** where a column gates text under a shared tag, it individuates the story but not the dial outcome (household married/parent, conduct severity strings). Making a column move the *mechanics* means routing it to a *different tag* or a state change, not just a different sentence.
2. **Eligibility = depth parity, NOT absence (corrected this pass):** the ~25% excluded from the ENGINE-mode stakes engines are routed to mode engines (civic/media/game-micro), generic-micro, generational, and the `generateCitizensEvents` named carve-out — every class has a generator. The real gap is that those routes are **thinner** (more pooled, fewer consequential mutations) than the 6 stakes engines, and GAME/MEDIA modes miss generational milestones (the engine.29 matrix mismatch). Depth parity across modes, not wiring.
3. **Conduct throttle:** `crimeReachable` = integrity band −2 only, so commits almost never fire — transgression depth is gated behind dial drift.
4. **Phase B valence (engine.38) held:** ordinary-bad tags exist in `DIAL_MAP` but the pools that emit them are not yet active, so the objective negative pole is thin.

These sit **on top of a substrate that genuinely couples** — events move dials, dials shape essence and bias events, and career transitions ripple into the economy. The engine is wired; the residual is depth and reach.
