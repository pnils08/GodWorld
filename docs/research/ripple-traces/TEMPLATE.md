---
title: "TEMPLATE — Ripple Trace: <domain>"
type: template
tags: [engine, ripples, attribution, trace, template]
pointers:
  - "[[../2026-07-04-ripple-attribution-trace]] — the synthesis doc; add new domains' findings there when traced"
---

# Ripple Trace Template

Copy this file to `docs/research/ripple-traces/<domain>.md` for each new engine/domain traced.
One trace = one domain's answer to three questions, every claim file:line-cited. These traces
are the reference layer under the ripple-ledger work — impossible to understand the engine's
attribution behavior without this level of detail (Mike-direct S291). Traces are **kept, not
archived**, and updated when the traced code changes materially.

**Domains traced so far:** civic-initiatives, crime-chaos, economy, sports, citizen-event-persistence (S291).
**Untraced domains (candidates):** weather/seasons, faith orgs, culture/texture ledgers, calendar/holidays, bonds/relationships/arcs, health/generational lifecycle, youth/education, businesses (lifecycle), elections, media-feedback/edition-coverage effects, night-life/evening systems, world-events bus itself.

## How to run a trace

1. **Ground first, code second.** Read the relevant sections of `docs/engine/archive/ENGINE_TRUTH_MAP.md`
   (per-file behavior + breakage), `docs/engine/ENGINE_COUPLING_MAP.md` (event→dial→ripple mechanics),
   `docs/engine/ENGINE_STUB_MAP.md` (ctx reads/writes). Then read the actual files — the maps index
   the code, they don't replace it.
2. **Trace three questions per causal mechanism:**
   - What does the engine **COMPUTE** when this domain's state changes? (trigger → modification, file:line)
   - Where is the effect **PERSISTED**, and is the **CAUSE recorded alongside it** — could a later
     reader reconstruct "X caused Y on Z at cycle N"? Check both the sheet writes AND the two
     cross-cycle serializers (`finalizeCycleState.js` `PREV_CYCLE_STATE_JSON`, `applyShockMonitor.js`
     `currentCycleState`) — ctx-only state evaporates at cycle end.
   - Does it reach a **MEDIA SURFACE** (`engine_audit_c{N}.json` patterns, `baseline_briefs_c{N}.json`,
     `Story_Seed_Deck`, `Story_Hook_Deck`), or is it invisible to the newsroom?
3. **Hunt the known failure classes** (from the S291 synthesis — check each explicitly):
   - *Compute-and-evaporate:* multi-cycle state (durations, decay) never serialized → dead machinery.
   - *Cause stripped at write:* bare numbers/labels landing on sheets while the driver dies in ctx.
   - *Dead writes:* computed into ctx fields nothing reads (grep for consumers, not just writers).
   - *Hollow reads:* reading ctx fields nothing writes (grep for writers, not just readers). Check phase ordering too.
   - *Built-but-unwired:* functions with zero cycle-path callers.
   - *Locality inversion:* hood-grain signal reaching citizens only as citywide averages.
   - *Post-hoc reconstruction:* downstream tooling inventing attribution the engine never persisted.
4. **Mark UNVERIFIED honestly.** A complete report with UNVERIFIED marks beats an unfinished one.
   Flat facts, no recommendations — recommendations belong in the synthesis/plan.
5. **File + link:** save here, add findings (numbered, e.g. W1..Wn for weather) to the synthesis doc,
   register nothing separately in docs/index.md (the folder has one index entry).

## Report structure

```
# Ripple Trace: <DOMAIN>

Scope note: <files covered, disjoint representations, anything excluded and why>

## 1. CAUSAL MECHANISMS
**M1 — <name>** <trigger → compute → modification, file:line>
...

## 2. PERSISTENCE
| Effect | Lands | Cause recorded alongside? |
|---|---|---|
...plus: are any of this domain's ctx fields in the two cross-cycle serializers?

## 3. MEDIA SURFACE
Visible: ... / Invisible: ...

## 4. GAPS
G1..Gn — computed-but-unattributed / unpersisted / dead / hollow, with evidence.
UNVERIFIED: ...
```
