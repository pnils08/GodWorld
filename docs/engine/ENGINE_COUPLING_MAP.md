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
  - "[[ENGINE_MAP]] — execution-order function list (structural sibling)"
  - "[[ENGINE_STUB_MAP]] — per-function ctx reads/writes (structural sibling)"
  - "[[ENGINE_TRUTH_MAP]] — per-file behavioral scaffold"
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
- **⚠ Full-read catch:** `processMigrationEvents_` + `checkForDisplacedCitizens_` are **placeholders** — risk/intent are assessed but **no citizen is actually relocated**, and the `Migration_Events` sheet log is a TODO. Hooks FORCED_MIGRATION (≥9) / MASS_EXODUS (5+/hood) fire, but the structural move doesn't happen here (population-level migration is `applyDemographicDrift`/`applyMigrationDrift`, aggregate not per-citizen).

### `gentrificationEngine.js` (`processGentrification_`, Phase 5) — FULL-READ
- **Writes `Neighborhood_Map` (NOT Simulation_Ledger):** `GentrificationPhase` (none/early/accelerating/advanced/stable-affluent), `GentrificationStartCycle`, `DemographicShiftIndex` — via `queueCellIntent_`, **cell-scoped on purpose (T1.5)** so it doesn't clobber the Phase-10 `saveV3NeighborhoodMap_` metric-col fold (which flushes after intents). Reads Neighborhood_Map (`MedianIncomeChange5yr`/`MedianRentChange5yr`/`WhitePopulationChange5yr`/`HighEducationPct`/`DisplacementPressure`).
- **Coupling:** gentrification phase + displacement pressure → migration engine reads it for citizen `DisplacementRisk` → `MigrationIntent`; citizensEvents `neighborhoodStatePool_` reads `GentrificationPhase` for "rents going up / neighbor moving out" texture. Hooks: GENTRIFICATION_ACCELERATING/EARLY, NEIGHBORHOOD_TRANSFORMATION, DISPLACEMENT_CRISIS. May be data-dormant if the extended 5yr-change columns are unpopulated.
- **⚠ Grep-error correction (this is why grep is banned):** an earlier grep listed this engine as an SL-column writer (`DemoShift/GenPhase/GenStart`); the full read shows those are *Neighborhood_Map* columns — the grep matched `row[i…]=` blind to which sheet the rows came from. Verified: it never writes Simulation_Ledger.

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
  - **Ripple consumer possibly unwired (cross-file TODO):** `applyActiveInitiativeRipples_` (L1646, the decay/expiry consumer) + `getRippleEffectsForNeighborhood_` (L1747) have **zero in-file callers**; header says "Call from Phase 02 or 06" — unverified. If nothing calls it, initiative ripples apply only their first-cycle immediate sentiment delta and never decay, expire, or reach neighborhoods. **Needs cross-file confirm** (initiative sentiment → citizen-event probability is a citizen-impact path, so this matters to Track B).
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

## Residuals (narrow — tuning/depth, not a rebuild)

1. **Content depth:** where a column gates text under a shared tag, it individuates the story but not the dial outcome (household married/parent, conduct severity strings). Making a column move the *mechanics* means routing it to a *different tag* or a state change, not just a different sentence.
2. **Eligibility = depth parity, NOT absence (corrected this pass):** the ~25% excluded from the ENGINE-mode stakes engines are routed to mode engines (civic/media/game-micro), generic-micro, generational, and the `generateCitizensEvents` named carve-out — every class has a generator. The real gap is that those routes are **thinner** (more pooled, fewer consequential mutations) than the 6 stakes engines, and GAME/MEDIA modes miss generational milestones (the engine.29 matrix mismatch). Depth parity across modes, not wiring.
3. **Conduct throttle:** `crimeReachable` = integrity band −2 only, so commits almost never fire — transgression depth is gated behind dial drift.
4. **Phase B valence (engine.38) held:** ordinary-bad tags exist in `DIAL_MAP` but the pools that emit them are not yet active, so the objective negative pole is thin.

These sit **on top of a substrate that genuinely couples** — events move dials, dials shape essence and bias events, and career transitions ripple into the economy. The engine is wired; the residual is depth and reach.
