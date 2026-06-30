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

**Scope honesty (S277).** Read end-to-end and verified for this doc: `citizenDialMap.js`, `runCareerEngine.js`, `runHouseholdEngine.js`, `runConductEngine.js`, `citizenMemory.js`, plus the Phase-5 wiring list and the exclusion-gate grep. **NOT yet line-verified:** the relationship, neighborhood, generational, education, youth, civic-mode, media-mode, and micro-event generators. By the dial-map rule (below) their events *do* move dials, but their per-engine probability and state logic is not personally confirmed here. Entries for them are marked `⟪UNVERIFIED⟫`.

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
- citizen: the **dial bands** via `getCitizenDialBands_` — Drive scales career frequency, Family scales household frequency, integrity/composure bias conduct.
- neighborhood: e.g. conduct's hood-grain crime counterweight (below).

This layer is real and pervasive. "If crime spikes in a neighborhood it affects citizens' events there" — **true**.

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

### Other Phase-5/4 generators — ⟪UNVERIFIED here⟫
`runRelationshipEngine`, `runNeighborhoodEngine`, `generationalEventsEngine`, `runEducationEngine`, `runYouthEngine`, `generateCivicModeEvents`, `generateMediaModeEvents`, `generateGameModeMicroEvents`, `generateGenericCitizenMicroEvent`, `generateCitizensEvents`. All route their events through the dial map (so Layer-2 dial coupling holds), and all read `ClockMode`/dials per the gate grep, but their Layer-1 logic and any state mutation are not personally confirmed in this pass. Fill on read.

---

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
2. **Eligibility:** ~25% (named/sports/civic/media + Tier-1/2/5) are out of the ENGINE-mode stakes engines; depth for them depends on the mode engines + engine.38 coverage.
3. **Conduct throttle:** `crimeReachable` = integrity band −2 only, so commits almost never fire — transgression depth is gated behind dial drift.
4. **Phase B valence (engine.38) held:** ordinary-bad tags exist in `DIAL_MAP` but the pools that emit them are not yet active, so the objective negative pole is thin.

These sit **on top of a substrate that genuinely couples** — events move dials, dials shape essence and bias events, and career transitions ripple into the economy. The engine is wired; the residual is depth and reach.
