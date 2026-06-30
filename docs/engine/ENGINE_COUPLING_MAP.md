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

### `generationalEventsEngine.js` (Phase 4) — VERIFIED, the heaviest state-mutation engine
- **Distinct gate:** `mode !== "ENGINE" && mode !== "CIVIC"` → continue (L264) — **broader than every other engine**: civic-mode citizens get milestones, and **Tier-1/2 are included** (tier ≤2 only reduces odds via `tierMod 0.8`, doesn't exclude). Still excludes GAME/MEDIA modes → ~133 citizens get no lifecycle milestones (the engine.29 authority-matrix mismatch, flagged not fixed).
- **Real state mutations (the lifecycle):** wedding → `MaritalStatus="married"` (L337) + a generational bond; birth → `NumChildren++` on the parent only (L355, child stays Tier-5 off-sample per S248); death → `Status="deceased"` (L392); health state-machine writes `Status`/`StatusStartCycle`/`HealthCause` (L282–291, L406) across active↔hospitalized↔critical↔recovering↔deceased per `HEALTH_TRANSITIONS`.
- **Coupling:** `BirthYear`→age gates milestone eligibility (`AGE_RANGES`: graduation 22–28, wedding 24–50, birth 26–42, retirement 68–72, death 65–100); tier modulates odds; holiday boosts (wedding on Valentine/NYE). Emits the heavy `Wedding`/`Birth`/`Death`/`Divorce`/`Health`/`Graduation`/`Promotion`/`Retirement` tags → big family/composure dial deltas. Downstream: household reads the written `MaritalStatus`/`NumChildren`; `Status=deceased` removes the citizen.

### `economicRippleEngine.js` (Phase 6) — VERIFIED (see §Cross-engine cascades)
Reads `careerSignals` + migration + world/citizen events → economic ripples → recomputes `economicMood` + per-neighborhood economies → **writes `employmentRate`/`economy` to `World_Population`**. `economicMood` feeds back into all citizen engines' probability next cycle. The loop that makes career transitions ripple city-wide.

### `generateCitizensEvents.js` (Phase 5) — VERIFIED, the central texture generator + city→citizen fan-out
- **Gate (engine.38 A1, option-1):** `isNamed = tier 1||2` (any clock mode) **∪** Tier-3/4 ENGINE. Named citizens get ambient texture here on top of their sim life; GAME/MEDIA/CIVIC Tier-3/4 are excluded (served by their mode engines). **No LIMIT cap** (removed engine.38 A1) — full population, ≤1 emit/citizen/cycle.
- **Layer 1 (the richest):** `PARTICIPATION_BASE` + weather/sentiment/chaos/season/econ/holidays/First-Friday/Creation-Day/sports/cultural/community + **QoL-driven** (low-QoL hood → more events; crime hotspot; stretched enforcement) + age/occupation + **fame** (`usageCount ≥ 8`, T3) + prev-evening crowds + bonds/arcs + weather/media modifiers + **dial-weighted participation** (`activityScore = (drive+outabout+sociability)/3`, L1318) + **anti-inert floor** (forced in if dark > `ANTI_INERT_N` cycles) + guaranteed-in upstream actives.
- **The city→citizen coupling (your "crime spikes → events there"):** the per-citizen pool pulls `neighborhoodStatePool_` (reads **prev-cycle Neighborhood_Map** crime/sentiment), `previousEveningPool_` (last night's city events; **T8 fan-out**, out-and-about-dial-gated travel radius), and `faithPool_` (this cycle's faith events in the hood). City + neighborhood state reach the individual here.
- **Layer 2:** archetype-*weighted* selection (reads TraitProfile archetype, v2.7) over template pools → dial-map tags. Content is still template draws (archetype biases *which* template, not bespoke text). No structural mutation.

### Mode-routed generators — who serves the citizens the stakes engines skip (gates VERIFIED)
The ~25% excluded from the ENGINE-mode stakes engines are **routed to mode-specific generators, not unwired:**
- **`generateGenericCitizenMicroEvent`** (Phase 4): `mode==="ENGINE"`, non-UNI/MED/CIV, **all tiers** — Tier-1 ENGINE at 50% chance (L437–445). Ambient micro-events for the whole ENGINE population incl. notables. → `Micro-Event` (composure +1).
- **`generateCivicModeEvents`** (Phase 5): `mode==="CIVIC"` only (L392). → Civic/CivicRole tags (sociability/drive).
- **`generateMediaModeEvents`** (Phase 5): `mode==="MEDIA"` only (L344). → Media/Quoted tags (sociability).
- **`generateGameModeMicroEvents`** (Phase 4): branches by `isUNI`(MLB)/`isMED`/`isCIV` (L358–371) — the sports-universe + flagged citizens (sports = Paulson canon).
- **`runYouthEngine`** (Phase 5): **age-gated** (`YOUTH_EVENT_LIMITS` min/max, status≠deceased), school-stage by age (elementary 5–10 / middle 11–13 / high 14–17 / college 18–22), tier-agnostic. → `youth-*` tags (drive/openness/composure).

**So every citizen class has a generator:** ENGINE Tier-3/4 → the 6 stakes engines; named (T1/2, any mode) → `generateCitizensEvents` carve-out + generational; CIVIC/MEDIA/GAME → their mode engines; ENGINE all tiers → generic-micro; youth → youth engine; everyone ENGINE/CIVIC → generational lifecycle. The residual is **depth parity** (mode/micro events are thinner than the stakes engines), not absence.

### `chaosCarsEngine.js` (Phase 4) — VERIFIED: external adversity → trauma + business damage
Per-citizen chaos hits call `accrueChaos_(severity, vehicle, cycle)` → bumps `chaosExposure` on **DialState**, and `applyChaosReaction_` applies a one-time labeled break (wary→traumatized, composure/openness down). The external-misfortune counterpart to conduct's internal agency — both write the dial memory. Also folds business damage (`chaosBusinessFold` → `queueCellIntent_` per biz). The trauma accumulator decays in the compressor (`decayChaosExposure_`).

### Phase-4 city-event SOURCES (producers, no per-citizen gate)
`worldEventsEngine`, `faithEventsEngine`, `buildCityEvents` generate **city-level** events (no citizen iteration/gate). They are consumed by `generateCitizensEvents`' T8 fan-out (prev-evening / faith / neighborhood-state pools) so the city's events reach individuals — the city→citizen edge.

### `bondEngine.js` (Phase 5) — the bond consumer
Reads `cycleActiveCitizens` (pushed by relationship + citizen engines) → forms/updates pairwise `Relationship_Bonds` (`setValues`, L1473), which feed back into relationship-event probability + pool selection. The downstream half of the relationship↔bonds loop. (Pairwise — no single-citizen gate; ⟪internal pairing logic not deep-read⟫.)

---

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
