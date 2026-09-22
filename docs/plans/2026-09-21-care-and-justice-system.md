---
title: Care and justice as one system — OARI, chaos cars, hospital stays, mental health, courts
created: 2026-09-21
updated: 2026-09-21
type: plan
tags: [civic, engine, draft]
sources:
  - Builder direction 2026-09-21 — after the OARI grading review, new gaps - a judicial data set or ledger, mental health data in the health systems; OARI, chaos cars, health data and hospital stays must align as one system
  - output/antigravity/2026-09-21-review-open-calls.md — OARI graded on violence only; the mission has no measure
  - docs/plans/2026-09-21-safety-lever.md — OARI grading decision, diversion count deferred
  - phase04-events/chaosCarsEngine.js, utilities/chaosCarsConfig.js — the event front end
  - phase04-events/generationalEventsEngine.js — hospital lifecycle, Phase 10 Hospital_Ledger persist
pointers:
  - "[[plans/2026-09-21-safety-lever]] — OARI grading decision this plan unblocks"
  - "[[plans/2026-09-19-civic-wake-game-loop]] — civic.38 parent"
  - "[[plans/2026-05-07-chaos-cars-engine]] — engine.11"
  - "[[SIM_DOCTRINE]] — a gate needs a movable input"
  - "[[index]] — registered same commit"
---

# Care and justice as one system

**Goal:** A crisis has a path a citizen can walk through and the sim can measure: a call happens, a response arrives (OARI van, ambulance, patrol), and the person ends up cared for, in hospital, or in the justice system, each step written to a record that the next step and the initiatives can read.

**Status:** Draft, builder direction captured 2026-09-21. Data-first map only. No design ruling, no build. Sim calls belong to the builder; mechanism to research-build; engine work to engine-sheet.

## What exists today (read 2026-09-21)

- **Chaos cars** (engine.11, Phase 4) fire 3-15 typed municipal-vehicle events a cycle. The vehicle list already includes an `oari_van` (`chaosCarsConfig.js:208`) whose outcomes include `deescalated` and `substance_intervention`; those raise an `OARI_INTERVENTION` story hook (`chaosCarsEngine.js:367`). Other outcomes include `medical_emergency` (hook `CITIZEN_HOSPITALIZED`) and `arrested` (hook `CITIZEN_ARRESTED`). The `chaos_cars` ledger row is the source of truth for each event.
- **Hospital_Ledger** is 4 rows, 11 columns (AdmissionId, POPID, Cause, AdmitCycle, StatusNow, DischargeCycle, Outcome, CyclesInCare). Causes are physical prose ("a workplace accident", "severe seasonal flu"). CORRECTION 2026-09-21: the chaos ambulance IS wired in — see the review below. An earlier line here said hospital stays do not come from chaos-car outcomes; that was wrong.
- **Nothing exists** for: a judicial record (an arrest has a story hook and nothing else — no charge, court date, disposition or sentence), a mental-health cause or care state, or a link from an OARI van event to a hospital stay or an arrest.

## Chaos cars review (research-build, 2026-09-21, read from code and the T6 reports)

**The fleet.** Ten typed vehicles, 3-15 dice-rolled events a cycle, each = vehicle x scope (citizen / neighborhood / business) x outcome x magnitude, written first to the `Chaos_Cars` ledger row and then to derived surfaces (`chaosCarsConfig.js` VEHICLE_CONFIGS, `chaosCarsEngine.js`). No-death rule enforced at config load and at the roll. Design intent (engine.11): break cookie-cutter equilibrium; chaos vehicles are crisis **igniters** (engine.67 step 8, builder doctrine "each has a generator to attach to").

| Vehicle | Weight | What it writes | Attaches to a system? |
|---|---|---|---|
| cop_car | 1.2 | ticket / pulled over / helped / **arrested** (15%); hood CrimeIndex down | Arrest = story hook + life-history tag only. No Status, no record. **No judicial system.** |
| fire_engine | 0.8 | false alarm / minor fire / major blaze; business revenue, hood Sentiment down | No injuries, no link to the ambulance or hospital |
| ambulance | 0.9 | minor injury / **medical emergency** (25%) / **workplace accident** (20%) | **Wired in.** Medical emergency flips the citizen to `critical`, workplace accident to `hospitalized`, with human-prose HealthCause; the generational health lifecycle, the career income hit and the household hospital-strain pool take over (`chaosCarsEngine.js:324-350`). Retirees excluded by guard. |
| oari_van | 1.0 | welfare check (50%) / **deescalated** (25%) / **substance intervention** (25%); hood Sentiment up, hood CrimeIndex down | Story hook + Stabilized/Recovery tag only. **Not linked to the OARI initiative (INIT-002), its deployment phase, or any hospital, treatment or mental-health record.** The van fires whether or not OARI exists. |
| building_inspector | 0.7 | passed / citation / forced closure; business revenue and headcount | Business_Ledger |
| garbage_truck | 1.1 | dumping cleared / missed pickup / sanitation delay; hood Sentiment and RetailVitality down | Hood metrics only |
| mail_truck | 1.0 | vital document / lost package / mail theft | Citizen tag, business revenue |
| ice_cream_truck | 0.5 | morale boost / block party / noise complaint | Hood Sentiment, EventAttractiveness |
| street_sweeper | 0.8 | beautification / parking ticket / traffic jam | Hood RetailVitality, Sentiment |
| pge_truck | 0.7 | planned shutoff / outage restored / transformer blowout | Hood Sentiment, business revenue; no link to the utilities system |

**Findings.**
1. **Ambulance to hospital already works.** The one care-chain link that exists is the ambulance igniter (and the heat-wave igniter in `generationalEventsEngine.js:261-312`). The design pattern for the missing links is already in the code: flip the citizen's real Status and let the existing lifecycle take over.
2. **Arrests and OARI outcomes are dead ends.** Both stop at a story hook. The OARI substance-intervention seed promises "a ride to treatment instead of a cell", and no treatment or mental-health record exists to receive it.
3. **OARI's van moves a different crime number than OARI is graded on.** The van writes hood `CrimeIndex` on Neighborhood_Map (a 0-1-scale pulse column); the safety lever and the delivery gate read `ViolentLevel` on Crime_Metrics. Two crime measures, no link.
4. **Too sparse to grade with.** Weights sum to 8.7, so the OARI van is about 11.5% of 3-15 events: roughly one van event a cycle for the whole city, about half of them welfare checks, aimed at random citizens and hoods, not at the hoods where violence is high (the T6 dry run drew 5 in 5 cycles). A per-hood diversion count from this engine alone would be 0 or 1 for most cycles.
5. **Events are dice, not conditions.** Nothing here raises call volume where violence or illness is high or where OARI has capacity. That is the chaos design (anti-cookie-cutter), and it is also why it cannot carry the grading job by itself.
6. **Persistence gap.** `Chaos_Cars` is a live tab (12 columns; 66 rows as of 2026-09-05) but is not in the local beats dump, so packs, counters and desks cannot read it from disk.

**Direction to bring to the builder (mechanism recommendation, not a ruling).** Keep chaos as the crisis igniter for individual lives. Add a condition-driven service layer beside it: per hood, per cycle, call volume from the live Crime_Metrics and health levels; OARI capacity from INIT-002's deployment state; each call resolving to an outcome (de-escalated, treated, admitted, arrested) that writes the real Status and a record, exactly as the ambulance does today. OARI is then graded on diversion (calls OARI resolved that would otherwise have been arrests or admissions) in its own hoods, from data with enough volume to mean something.

## The gaps

1. **Judicial data set or ledger.** An `arrested` outcome ends at a story hook. The care-and-justice path needs a record of what happened next (charged, diverted to OARI or treatment, released, held), readable by the initiatives and by desks.
2. **Mental health in the health systems.** Hospital causes are physical only. Mental-health and substance crises need to be a cause and a care state, so an OARI `substance_intervention` can end in a stay or a referral.
3. **One chain, not four tables.** Chaos-car event → response (OARI van, ambulance, patrol) → outcome (deescalated, treated, admitted, arrested) → record (Hospital_Ledger, judicial ledger) → what OARI is graded on. Today the events are dice rolls that write a story hook and a life-history line; they do not feed the records, and nothing reads the OARI events to grade OARI.
4. **OARI's real measure.** The diversion count deferred in the safety-lever plan cannot come from the chaos van alone (about one event a cycle citywide, random hoods; see review finding 4). It needs the condition-driven service layer above.

## First moves (research-build, read-only)

1. DONE 2026-09-21: chaos cars reviewed (above) and the live `Chaos_Cars` tab pulled read-only (91 rows, C100-C108; saved `output/engine-sheet/2026-09-21-chaos-cars-live-pull.json`, not committed to canon — a working pull). Measured: `oari_van` is 15 of 91 events (16.5%) — 10 `welfare_check`, 5 `substance_intervention`, zero `deescalated`. Citizen-scope targets resolved against the live ledger for neighborhood. **Zero of 15 OARI-van events, across all 9 cycles, landed in OARI's own target hoods** (West Oakland, Fruitvale, East Oakland — the INIT-002 deployment hoods). The 8 neighborhood-scope events hit Rockridge(2), Laurel(2), Lake Merritt, Ivy Hill, Uptown, Glenview; the 7 citizen-scope events resolved to Piedmont Ave, Lake Merritt(2), Temescal, Chinatown, Jack London, Downtown. This sharpens finding 4 from an estimate ("thin, 0 or 1 a cycle") to a measured fact: the chaos van has never once fired where OARI operates, over the full C100-C108 window. It cannot be OARI's grading data source in its current form — a random citywide roll only reaches a 3-hood target by chance, and 0/15 is that chance realized.
2. Trace how a `medical_emergency` and an `arrested` outcome could reach the Hospital_Ledger writer and a judicial record, with the wiring card before any cut.
3. **RULED 2026-09-21 (builder): build the condition-driven service layer** — the existing safety-lever plan (`docs/plans/2026-09-21-safety-lever.md`) already depends on it for OARI's real grading, and the chaos-van path is now measured as unreachable (0/15 in OARI's own hoods, above). Judicial ledger and mental-health state rulings are still open; the service layer is scoped starting now, in parallel.

## Service layer scoping (research-build, 2026-09-21 — design only, no build)

**Relationship to the safety lever (does not duplicate it):** the safety-lever plan already designs a passive, always-on bounded relief on `ViolentLevel` for a deployed initiative — no discrete calls, no citizen, no judicial or hospital link. That mechanism ships or doesn't on its own Tasks 1-7 and is unaffected by this. The service layer below is a different, event-based mechanism: individual crisis calls that resolve to a citizen-level outcome, feeding the judicial ledger, mental-health states and OARI's real diversion count. Both can exist; they read different inputs and write different things. Do not let one implementation absorb the other's job.

**Shape, following the ambulance/heat-wave igniter pattern already proven in `generationalEventsEngine.js` and `chaosCarsEngine.js:324-350` (flip real Status, let existing lifecycle take over):**

- **Call volume, per hood per cycle:** driven by the hood's own condition — live `Crime_Metrics.ViolentLevel` and health levels (`Sick` count, Hospital_Ledger admissions), not a flat dice roll. A hood with worse conditions generates more calls. This is the missing link chaos cars don't have (finding 5 in the review above): conditions, not chance, should set volume.
- **OARI capacity, per hood per cycle:** derived from INIT-002's deployment state (Stage, ImplementationPhase) and target hoods — a call in a hood OARI doesn't serve cannot be answered by OARI. This reuses Task 3's eligibility whitelist from the safety-lever plan (`implementation-active`, `dispatch-live`, `pilot-active`, `operational`).
- **Call resolution:** each call draws from a fixed outcome set — de-escalated (OARI), treated/admitted (hospital), arrested (judicial) — gated by capacity: if OARI has no capacity in that hood/cycle, the call defaults to the non-OARI path (arrest or admission), the same way an ambulance call resolves today regardless of what else exists.
- **Writes:** de-escalated → a life-history tag, no ledger row (the citizen was fine). Treated/admitted → the existing Hospital_Ledger writer, Cause = a mental-health or crisis string (ruling 2 needed first). Arrested → the new judicial ledger (ruling 1 needed first).
- **OARI's diversion count:** de-escalated + OARI-attributed substance interventions in OARI's own hoods, against the arrest/admission count that would otherwise have occurred in the same hoods. This is the real measure the safety-lever plan deferred; it supersedes grading OARI on `ViolentLevel` alone once it exists, but does not require removing that lever — the two can run side by side and be reconciled later.

**Open before any build (this is scoping, not a ruling to proceed to code):** rulings 1 and 2 above (judicial ledger shape, mental-health states) gate the write side. The call-volume formula (how conditions map to a count) needs its own bounded design and bench pair, same discipline as the safety lever. No engine, config or schema change is proposed here.

## Changelog

- 2026-09-21 (research-build) — Service layer scoped (design only): shape, relationship to the safety lever, write targets, OARI diversion measure; rulings 1-2 still gate the build.

- 2026-09-21 (research-build) — Builder ruled: build the condition-driven service layer now (existing safety-lever system depends on it); scoping starts.

- 2026-09-21 (research-build) — Live Chaos_Cars pull (91 rows, C100-108): confirmed zero OARI-van events in OARI's own target hoods across the full window; sharpens the chaos-review finding from estimate to measured fact.

- 2026-09-21 (research-build) — Chaos cars reviewed: ten-vehicle table, ambulance already igniting the hospital lifecycle, arrests and OARI outcomes dead-end at story hooks, van moves a different crime number than OARI is graded on, volume too thin to grade with; earlier hospital claim corrected.
- 2026-09-21 (research-build) — Filed from builder direction after the OARI grading review; data-first map of chaos cars, Hospital_Ledger and the missing judicial and mental-health records.
