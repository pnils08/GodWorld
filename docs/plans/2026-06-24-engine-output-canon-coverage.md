# Engine-Output → Canon Coverage (chaos / texture / Riley wiring + seed-router)

**Status:** Wires 1–3 BUILT + CLASP-DEPLOYED (smoke pending C101 — never executed yet); Wire 1b (chaos-seed scope + citizen-as-voice) SCOPED, holding for C101 — S275 (engine-sheet)
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

### Wire 1b — Chaos seed SCOPE routing + citizen-as-voice (S275, Mike-direct; pending C101)

**Refinement of Wire 1, NOT a replacement.** Wire 1 seeds every high-severity chaos event uniformly across scope. Mike's distinction (S275): a chaos hit on a **business/neighborhood** is a public/collective event → its own story seed (correct, as Wire 1 already does); a hit on a **citizen** is human texture — the citizen is the *voice* of the neighborhood/business story, not its own headline. Tier-1 citizen chaos stays a guaranteed front-page seed (already handled; Mike confirmed correct).

**Empirical grounding (S275 — read from chaosCarsConfig + live deck, NOT assumed):**
- `narrativeSeed` is set on **12 of 31 outcomes, every one `severity:'high'`** → Wire 1's gate is a deliberate **high-severity filter**, sound (low-severity blips correctly stay seedless). Earlier worry that the gate "starves chaos" was **falsified** — high-severity chaos WILL seed at C101.
- Live `Story_Seed_Deck`: **1922 rows through C100, 0 chaos seeds ever** — because C100's 6 chaos events were all low-severity (small-sample) AND C100 ran before engine.41's chaos path executed. **C101 is the first cycle to actually run Wire 1.**
- `makeSeed`'s 6th param `suggestedCitizens` is **vestigial**: stored on the seed object (L403), consumed by nothing, dropped at deck-write (no `Story_Seed_Deck` column). The voice mechanism is a wire attached at neither end.
- `buildDeskPackets.js` already has a **Neighborhood Citizen Index** (hood → named citizens) — the generic "citizen voice for a neighborhood" already feeds desks. Wire 1b adds the *specifically chaos-affected* residents as the voice for THAT event.

**The delta (only one real change vs Wire 1):**
- business/neighborhood high-severity chaos → seed. **Unchanged.**
- Tier-1 citizen → front-page floor seed. **Unchanged.**
- **High-severity non-Tier-1 CITIZEN chaos → stop self-seeding as its own COMMUNITY headline; attach the citizen onto the co-located (same cycle + neighborhood) business/neighborhood seed's `suggestedCitizens`.**

**Substrate work (when built):**
1. `applyStorySeeds.js` chaos loop — citizen non-floor scope: don't `seeds.push`; collect onto the matching neighborhood/business seed.
2. Give `suggestedCitizens` a producer (the above) AND persistence: **add `Story_Seed_Deck` column U `SuggestedCitizenVoices`** (POPID list) — a live-sheet schema widen (20→21, same deliberate step as the prior 18→20), **Mike's go required**. `buildDeskPackets` reads by header (`toObj`), so col U flows to desks automatically once written.
3. Desk consumption (read col U → quote affected residents) — engine-sheet BUILDS the substrate; any desk-agent/skill change is rb-design + engine-sheet-build, **never media** (media executes only).

**Why HOLD for C101 (open empirical question):** does a citizen chaos hit actually co-occur (same cycle + neighborhood) with a business/neighborhood chaos seed to attach to? C101's real chaos-seed distribution answers it; building the voice-attach before that = guessing at co-location/volume. Cost of waiting = one cycle where a high-severity citizen chaos may headline instead of being a voice — acceptable diagnostic (we audit cycles, don't ship them). So: **don't reopen/stack on the deployed-but-unrun Wire 1; let C101 run, read the distribution, then build Wire 1b against real numbers.**

**Sibling system — chaos-trauma dials (S275, commit `6ec638f6`, local/unpushed, engine.42 — NOT this plan):** the citizen-dial consequence system (chaos-cars hits accrue → wary/traumatized → heal over chaos-free time) is built + committed local, separate concern. It stamps `chaos:wary`/`chaos:trauma` into LifeHistory_Log provenance — currently **invisible to the seed pipeline** (applyStorySeeds reads clean payload fields only; adversarial-review sub-threshold finding). A future enrichment could let a traumatized-citizen signal weight voice selection in Wire 1b — noted, out of scope for the first cut.

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

## Status log

### engine.41 — status (drained from ROLLOUT, 2026-06-26 / S274)

**Engine-output → canon coverage** (Mike-direct S271, "half the engine makes it to canon — unacceptable"). C100 scan: ~20 of the per-cycle story-signal outputs reach a canon consumer, ~18 die in-tab (world_summary reads 6 tabs / desk_packets 21, hand-picked + drifted, no contract). **4 wires BUILT + CLASP-DEPLOYED S271** (route story-worthy signal into the seed deck — "routed not dumped"): (1) **broad chaos field → seeds** — existing path seeded ONLY `consequenceFloorFired`; at C100 all 6 chaos events had floor=FALSE → 0 chaos seeds (the real reason chaos missed desks, not the stamp); now every `chaosCarsEvents` w/ non-empty `narrativeSeed` → seed @prio 3 (engine's own desk-worthy signal; empty=skip, no fabrication). (2) **`Texture_Trigger_Log` → seeds** @prio 2 (cap 8, FAITH sub-cap 2 — don't amplify the flood). (3a) **`Riley_Digest` evening layer → desk packets** — Node (`buildDeskPackets` `eveningContext.riley`), LIVE, end-to-end verified C100 (TV/famous/cityEvents/streaming/nightlife). (3b) **Riley story-worthy → seeds** (cityEvents/streaming/famous-consolidated) @prio 2 CULTURE. Commits `4b94bda3`/`09af10ac`/`b387ec8d`, pushed `3263c5bf..b387ec8d`; CLASP-DEPLOYED via isolated worktree (engine.41 `applyStorySeeds.js` + chaos-stamp `f2c96348` LIVE; gated riders processAdvancementIntake/citizenDialMap/citizenMemory/compressLifeHistory/tier1EssenceEvents held at baseline, confirmed absent from manifest, `.test.js` excluded). **SMOKE @C101** (additive seeds.push + safePhaseCall_-wrapped — NOT engine-breaking; feature-verify not regression-gate): chaos/texture/Riley seeds in `Story_Seed_Deck` @Priority≥2 + appearing in desk packets; faith share DOWN not up. **Separate lanes (do NOT fold in):** faith generation skew (9 events/5 faith = phase04 generation pass), `Event_Arc_Ledger` re-enable (Row 28 rebuild), coverage registry/contract (optional anti-drift).

### engine.41 — S275 current-state reconcile + Wire 1b scoped (engine-sheet)

**State of Wires 1–3:** DEPLOYED, **never executed.** C100 ran before/without the chaos→seed path producing output — live `Story_Seed_Deck` = 1922 rows through C100 with **0 chaos seeds** (all 6 C100 chaos events were low-severity → no `narrativeSeed` → correctly seedless; small-sample, not a bug). **C101 is the first real test of Wire 1** (and the smoke that gates Wire 1b). The deck IS load-bearing — consumed live by sift/dispatch/write-supplemental/run-cycle + `buildDeskPackets`.

**Falsified my own earlier read (data-first):** suspected engine.41's `narrativeSeed` gate "starves chaos." Checked the config — `narrativeSeed` is on 12/31 outcomes, **all high-severity**. The gate is a sound high-severity editorial filter, not a starvation bug. So Wire 1 needs no fix; the only refinement is the citizen-as-voice scope distinction → **Wire 1b** (full design added under "The three wires" above).

**Decision: HOLD Wire 1b for C101.** Don't reopen/stack on the deployed-but-unrun Wire 1 (deploy-attribution discipline — can't tell which change did what before Wire 1 has run once). The voice-attach design depends on an empirical co-location question (do citizen + business/neighborhood chaos co-occur same cycle+hood?) that C101's distribution answers. Build Wire 1b after C101, as a phase on THIS plan, including the **`Story_Seed_Deck` col-U `SuggestedCitizenVoices` widen** (Mike's go on the live-sheet change).

**Adjacent (separate commit, not this plan):** engine.42 chaos-**trauma** citizen-dial system shipped local S275 (`6ec638f6`) — chaos-cars hits accrue persistent exposure → one-time wary/traumatized break → heal over chaos-free time + positive folds. Clasp-gated, smoke at next cycle. Its `chaos:wary`/`trauma` LifeHistory provenance is currently invisible to the seed pipeline (possible future Wire 1b enrichment).

---

## Relocated ROLLOUT_PLAN row detail — 2026-07-02 (S286 pointer-collapse)

Verbatim rows moved out of ROLLOUT_PLAN.md when it collapsed to pointer-only. This is the working detail for the open job(s); the rollout row is one line pointing here.

### engine.41

| engine.41 | **Engine-output → canon coverage** (Mike-direct S271, "half the engine makes it to canon — unacceptable"). C100 scan: ~20 of the per-cycle story-signal outputs reach a canon consumer, ~18 die in-tab (world_summary reads 6 tabs / desk_packets 21, hand-picked + drifted, no contract). **4 wires BUILT + CLASP-DEPLOYED S271** (route story-worthy signal into the seed deck — "routed not dumped"): (1) **broad chaos field → seeds** — existing path seeded ONLY `consequenceFloorFired`; at C100 all 6 chaos events had floor=FALSE → 0 chaos seeds (the real reason chaos missed desks, not the stamp); now every `chaosCarsEvents` w/ non-empty `narrativeSeed` → seed @prio 3 (engine's own desk-worthy signal; empty=skip, no fabrication). (2) **`Texture_Trigger_Log` → seeds** @prio 2 (cap 8, FAITH sub-cap 2 — don't amplify the flood). (3a) **`Riley_Digest` evening layer → desk packets** — Node (`buildDeskPackets` `eveningContext.riley`), LIVE, end-to-end verified C100 (TV/famous/cityEvents/streaming/nightlife). (3b) **Riley story-worthy → seeds** (cityEvents/streaming/famous-consolidated) @prio 2 CULTURE. Commits `4b94bda3`/`09af10ac`/`b387ec8d`, pushed `3263c5bf..b387ec8d`; CLASP-DEPLOYED via isolated worktree (engine.41 `applyStorySeeds.js` + chaos-stamp `f2c96348` LIVE; gated riders processAdvancementIntake/citizenDialMap/citizenMemory/compressLifeHistory/tier1EssenceEvents held at baseline, confirmed absent from manifest, `.test.js` excluded). **SMOKE @C101** (additive seeds.push + safePhaseCall_-wrapped — NOT engine-breaking; feature-verify not regression-gate): chaos/texture/Riley seeds in `Story_Seed_Deck` @Priority≥2 + appearing in desk packets; faith share DOWN not up. **Separate lanes (do NOT fold in):** faith generation skew (9 events/5 faith = phase04 generation pass), `Event_Arc_Ledger` re-enable (Row 28 rebuild), coverage registry/contract (optional anti-drift). | wip (built + clasp-deployed; smoke @C101) | engine-sheet | [[../plans/2026-06-24-engine-output-canon-coverage]] |

