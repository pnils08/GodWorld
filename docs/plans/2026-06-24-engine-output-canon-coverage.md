# Engine-Output → Canon Coverage (chaos / texture / Riley wiring + seed-router)

**Status:** wip — S271 (engine-sheet)
**Filed:** 2026-06-24
**ROLLOUT:** engine.41 (file on add)
**Owner:** engine-sheet (build) — design seam reviewed inline; taxonomy questions → research-build if they surface
**Parent specs:** [[../engine/PHASE_42_PATTERNS]] (seed pipeline), [[../engine/ROLLOUT_PLAN]]
**Pattern:** feedback_measure-twice-cascading-effects

## Problem (Mike, S271)

"We have an engine and half of it makes it to canon. That's unacceptable."

Confirmed empirically at C100. The two canon-facing consumers each **hand-pick** which tabs to read, and they have **drifted apart** — there is no contract that every engine output reaches a consumer:

- `scripts/buildWorldSummary.js` reads 6 tabs: `Riley_Digest`, `Oakland_Sports_Feed`, `Civic_Office_Ledger`, `Neighborhood_Map`, `World_Population`, `Simulation_Calendar`.
- `scripts/buildDeskPackets.js` reads 21 tabs (the seed/event/citizen/civic set) — but **not** `Riley_Digest`, **not** `Chaos_Cars`.

Any engine output nobody happened to wire up dies in its tab.

## Findings — C100 coverage scan (live)

Per-cycle simulation outputs carrying story/texture signal: **~20 reach a canon consumer, ~18 don't.** "Half" is the real number. Bucketed (so the build target is defensible, not inflated):

**A. Genuinely dead, rich story signal, clean wire — THE BUILD TARGET:**
- `Chaos_Cars` (6 C100 rows) — chaos events + narrative seeds. Consumed by nothing.
- `Texture_Trigger_Log` (28) — per-neighborhood ambient texture (`COMMUNITY · Chinatown · sidewalk_activity · "Sidewalk cafes and shops busy"`). Largest dead signal in the sheet; already seed-shaped (carries Domain + Neighborhood + a Reason string).
- `Riley_Digest` — **asymmetric**: world_summary surfaces it in full (TV lineup, FamousPeople, CityEvents, StreamingTrend, food, nightlife); desk packets get only a thin scrape of the Cycle_Packet text.

**B. Reaches canon lossily via another surface (enrich later — do NOT double-wire):**
- `Crime_Metrics` / `Neighborhood_Demographics` → folded into `Neighborhood_Map`; `Cycle_Weather` → packet text; `Faith_Ledger` → already flows as WorldEvents faith-domain. ⚠️ Faith is the existing flood — routing `Faith_Ledger` into seeds re-floods it from a second source.

**C. Legacy / archive / dormant — correctly unread (exclude):**
- `WorldEvents_Ledger` (v2.5 dupe of V3), `LifeHistory_Archive` / `Story_Seed_Deck_Archive` (archives), `World_Drift_Report` (unwired by design), `Cycle_Seeds` (per-cycle RNG-seed/checksum record, NOT story seeds), `Relationship_Bond_Ledger` (append-only log *behind* the read `Relationship_Bonds` snapshot — content reaches canon).

## The three wires

All distill story-worthy signal into `Story_Seed_Deck` (ride the existing ranked → deduped → domain-routed pipeline desks already consume) or carry ambient as context. "Routed, not dumped."

### Wire 1 — Chaos (extend, don't greenfield)

The chaos→seed path **already exists but only for floor-fired events.** `phase04 chaosCarsEngine.js` exposes:
- `ctx.summary.chaosCarsEvents` — ALL chaos events (full payload).
- `ctx.summary.tier1ChaosEvents` — only `consequenceFloorFired === true`.

`phase07 applyStorySeeds.js:1513` seeds **only** `tier1ChaosEvents` (priority 9, `ACCOUNTABILITY`, `chaos-cascade`). At C100 all 6 events had `floor=FALSE` → that path produced **zero** seeds. That is why chaos didn't reach desks — not the stamp fix, not a missing tab read.

**Story-worthy filter = non-empty `narrativeSeed`** (chaosCarsConfig: "one-line desk-packet seed... present on high-severity"). The engine already gates which events deserve coverage; low-severity blips carry no narrativeSeed and stay seedless. No fallback prose synthesis (same discipline that retired the arc generator — never fabricate specificity).

**Build:** in `applyStorySeeds_`, add `generateChaosSeeds_(S)` reading `S.chaosCarsEvents`, emitting `makeSeed(narrativeSeed, domain, neighborhood, priority, 'chaos', [targetId])` for each event with non-empty `narrativeSeed` AND `!consequenceFloorFired` (floor ones already handled). Priority 3 (above the desk `Priority>1` filter, below the floor-fired 9). Domain from `targetScope`+`primaryMetric` (CrimeIndex→CRIME, Sentiment→COMMUNITY, Annual_Revenue→BUSINESS, citizen tags→COMMUNITY/HEALTH). Neighborhood = `targetId` when scope==neighborhood, else '' (text carries the story; domain routes it).

### Wire 2 — Texture → seeds

`Texture_Trigger_Log` is already seed-shaped. `generateTextureSeeds_` reads the current-cycle rows: `makeSeed(Reason, Domain, Neighborhood, 2, 'texture')`. Priority 2 (survives the desk filter, low rank — enriches, doesn't dominate). **Caps:** top N by `Intensity` (≈8); FAITH-domain sub-cap ≤2 (advisor — do not amplify the existing faith flood).

### Wire 3 — Riley → desk packets

Give `buildDeskPackets` the `Riley_Digest` read world_summary already has. Ambient fields (nightlife/weather/food loads) → `eveningContext` context block. Story-worthy fields (FamousPeople, a notable CityEvent, StreamingTrend) → seed candidates. No new generator — a read + classify.

## Out of scope / separate lanes (do NOT bundle)

- **Faith generation skew** — C100 emitted only 9 WorldEvents, 5 FAITH. Routing dilutes the *visibility* imbalance (real win) but adds no events. The 9-events-5-faith generation balance is a **separate prerequisite pass** on phase04. The router must **cap/exclude faith, not amplify it.**
- **`Event_Arc_Ledger`** (36 live C100 arcs, hard-disabled `arcs=[]` in buildDeskPackets) — re-enabling is the **Row 28 crisis-arc rebuild** (generator fabricates neighborhood specificity), not a one-line wire.
- **Coverage registry / contract** — the anti-drift layer so a new engine output can't silently fail to reach canon again. Bigger redesign; optional; does NOT gate the three wires.

## Deploy gating

Wires 1+2 are engine code (`applyStorySeeds.js`) → `clasp push` → live. Ride the **next deliberate clasp window** already owed for the chaos-stamp fix (`f2c96348`) + the held riders (Row 8 migration, `tier1EssenceEvents.js`). Build + test + commit locally; deploy on Mike's go-call; smoke at the next cycle. Wire 3 is a Node script (`buildDeskPackets.js`) — no clasp, but verify against a re-run packet.

## Verify

- Offline: unit the chaos/texture generators against the 6 C100 chaos payloads + Texture_Trigger_Log C100 rows; assert priority≥2, faith sub-cap, narrativeSeed-empty skipped.
- Live (next cycle): chaos/texture seeds present in `Story_Seed_Deck` at Priority≥2; non-zero chaos/texture seeds in the desk packets; faith share down, not up.
