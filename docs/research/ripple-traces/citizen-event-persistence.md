---
title: Ripple Trace — Citizen-Event Persistence (generateCitizensEvents, pulse, Phase 10, auditor)
created: 2026-07-04
type: research
tags: [engine, ripples, attribution, citizens, persistence, trace, reference]
pointers:
  - "[[../2026-07-04-ripple-attribution-trace]] — synthesis doc (findings P1–P5 derive from this trace)"
  - "[[TEMPLATE]] — the trace template this instantiates"
---

# Ripple Trace: Per-Citizen Event Persistence

> Raw S291 trace, preserved verbatim as reference. Verifies the S260 finding ("per-hood
> pulse composition is NOT persisted post-cycle").

## 1. WHAT PERSISTS (per citizen event, each cycle)

**A. LifeHistory_Log row — the richest per-event record.**
`phase05-citizens/generateCitizensEvents.js:2410-2418` pushes one row per emitted event; flushed via `setValues` at `:2454-2456`. Row shape:
`[ctx.now (timestamp), POPID, Name, tagString, EventText(pick), neighborhood, cycle]`
Schema is 7 populated columns A–G (`schemas/SCHEMA_HEADERS.md:807-816`: Timestamp / POPID / Name / EventTag / EventText / Neighborhood / Cycle; H, I empty).
- `tagString` (col D EventTag) = `primaryTag|tag|tag…` (`:2400`). The tag list **does encode the firing pool as a coarse "source" label**: `source:qol|qol:low`, `source:weather|weather:heavy-rain`, `source:faith`, `source:media`, `source:fame`, plus `holiday:`, `sportsSeason:`, `patrol:suppress`, etc. (`:552, :581-585, :591-594, :866-956`). This is the closest thing to a recorded trigger.
- Other Phase-5 engines append their own LifeHistory_Log rows via `queueAppendIntent_`: `runConductEngine.js:250`, `runRelationshipEngine.js:588`, `runCivicRoleEngine.js:425`, `runYouthEngine.js:605`.

**B. Simulation_Ledger col O (LifeHistory) — a thinner cell append.**
`generateCitizensEvents.js:2404-2406` appends the line `"<inWorldStamp> — [primaryTag] <pick>"` to `row[iLife]`, sets `row[iLastU]=ctx.now`, writes back into the shared `ctx.ledger` (`:2421`, dirty flag `:2450-2451`). Schema: `docs/SIMULATION_LEDGER.md:163` (col O LifeHistory). This cell records **only primaryTag + text** — it drops the `source:` tags, the cycle number, and any neighborhood-in-cell that the LifeHistory_Log row carries.

**C. DialState (col AV) / TraitProfile (col R).** Events mutate 8-dial citizen state persisted per cycle (`SIMULATION_LEDGER.md` col AV note; `generateCitizensEvents.js:325`), but this is *citizen state*, not the event stream — a dial delta does not record which event moved it.

## 2. WHAT'S LOST (computed in ctx, never written)

**A. Per-hood event composition — the pulse.** `recordPulse_` (`utilities/neighborhoodPulseMap.js:110-125`) accumulates each pulsing event into `S.neighborhoodPulse[hood]` as a **scalar bag** `{sentiment, crime, vitality, attractiveness, events}` (`:122-124`) — it sums magnitudes and **discards which tags/events produced them**. Fired once-per-citizen (`generateCitizensEvents.js:2430`). The object is consumed ONLY at Phase 8 `phase08-v3-chicago/v3NeighborhoodWriter.js:335-341`, where `pulseFoldDelta_` folds it as a dampened, volume-normalized delta into 4 neighborhood metric columns (crime/retail/eventAttract/sentiment) — commingled there with chaos-cars folds (`:346-353`). **`S.neighborhoodPulse` is never written to any sheet** (grep confirms v3NeighborhoodWriter is its sole reader). It dies with `ctx.summary` — the code says so at `generateCitizensEvents.js:2372` ("tally… dies with ctx.summary"). So the aggregate magnitude of a cycle's per-hood citizen-event wave survives only as an already-folded, commingled residue in metric columns; the composition is gone.

**B. Event cause / trigger value.** No row records *why* an event fired beyond the `source:` bucket label. `getNeighborhoodContext_` / `crimeMetrics.neighborhoodBreakdown` gate the crime-aware pool (`generateCitizensEvents.js:176-191`), but the triggering value (e.g. QoL index, crime level) is **read, not written**. `qol:low` is a threshold bucket, not a pointer to a causing WorldEvent or a metric reading. The SL col O cell lacks even the `source:` tag.

**C. Ripple intermediate state.** economicRippleEngine ripples / `S.initiativeRipples` / `businessDeltas` are ctx-transient (per `ENGINE_COUPLING_MAP.md:234, :276-278`); only the final `World_Population` employmentRate/economy writes persist (`ENGINE_COUPLING_MAP.md:165`, economicRippleEngine L691) — the attribution chain from citizen event → business delta → economy is not stored.

## 3. Phase 10 persistence — none preserves per-hood citizen-event composition

- **buildCyclePacket.js** reads `S.worldEvents` (city event bus), `S.genericEvents`, arcs, textures from ctx.summary (`:50-59`), renders a raw text snapshot, writes it to the **Cycle_Packet** sheet as one text cell (`:743, :750-757`). It never reads the atmospheric per-citizen stream or `S.neighborhoodPulse`; per-hood citizen-event composition is not in the packet.
- **recordWorldEventsv25.js** writes WorldEvents_Ledger (city bus only) — grep for citizen/LifeHistory/neighborhood/pulse returns nothing.
- **saveV3Seeds.js** writes story seeds (Domain/Neighborhood/priority grain, `:60, :106`) — seed-grain, not event composition.
- **compileHandoff.js** *reads back* LifeHistory_Log for current-cycle "Quoted" entries (`:693-710`) and dedups seeds by domain+neighborhood (`:451-456`) — it consumes the log, adds no new per-citizen persistence.

## 4. Engine-auditor reconstruction — residence inference, not causation

`scripts/engine-auditor/resolveAffectedCitizens.js` reconstructs citizen involvement by reading the **Simulation_Ledger snapshot** (`:14`) and building a `byNeighborhood` index (`:38-55`) mapping hood → resident citizens. It infers *who could be affected* by residence, not who actually experienced an event or why. Of the detectors, only `generateBaselineBriefs.js` reads LifeHistory_Log at all (grep). So the auditor loses: the actual per-event citizen linkage, the firing source-tag, and any cause pointer — it substitutes neighborhood-residence membership.

## 5. ATTRIBUTION VERDICT — "crime spike → citizen events" ripple

**Reconstructable today (correlation grade only):** LifeHistory_Log rows carry (POPID, EventTag with `source:qol|qol:low`, Neighborhood, Cycle) — `generateCitizensEvents.js:2410-2418`. So for a given hood+cycle you *can* recover the set of citizen events drawn from the crime-aware/QoL pool and join them, by `(neighborhood, cycle)`, against Crime_Metrics / WorldEvents_Ledger to show co-occurrence.

**Missing for a true cause→effect chain:**
1. **No trigger value / cause id** — the row records `qol:low` (a threshold bucket), never the crime-metric reading nor a pointer to the specific crime WorldEvent that raised probability. WHAT happened is stored; WHY is only a category label.
2. **The join key is inference, not linkage** — crime spike and citizen events live in separate sheets sharing only `(neighborhood, cycle)`; there is no explicit cause→effect foreign key.
3. **Effect magnitude is unrecoverable** — the per-hood pulse that quantified the wave (`S.neighborhoodPulse`) is never persisted; only its dampened, chaos-commingled residue in 4 metric columns survives (`v3NeighborhoodWriter.js:335-341`).
4. **SL col O is even thinner** — no `source:` tag, so the Simulation_Ledger alone cannot even do the correlation join; it needs LifeHistory_Log.

**Bottom line:** the ripple can be reconstructed only at correlation grade via a `(hood, cycle, source-tag)` join across LifeHistory_Log + Crime_Metrics/WorldEvents_Ledger. A definitive "this crime event caused these citizen events, with this magnitude" cannot be reconstructed — there is no cause id, no trigger-value field, and the pulse composition that measured the effect is discarded post-cycle. This matches the S260 claim: the per-hood pulse composition is NOT persisted; it only explains (folds into) metric deviations.

**UNVERIFIED:** the exact set of `source:`/pool tags emitted by the non-atmospheric generators (civic/media/generational engines) — the atmospheric pool (`generateCitizensEvents.js`) is confirmed, and sibling engines append via `queueAppendIntent_`, but each sibling's tag vocabulary was not enumerated.
