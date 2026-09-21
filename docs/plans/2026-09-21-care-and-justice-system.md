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
- **Hospital_Ledger** is 4 rows, 11 columns (AdmissionId, POPID, Cause, AdmitCycle, StatusNow, DischargeCycle, Outcome, CyclesInCare). Causes are physical strings ("a workplace accident", "severe seasonal flu"). Admissions come from the generational-events lifecycle and Health_Cause_Queue, not from chaos-car outcomes.
- **Nothing exists** for: a judicial record (an arrest has a story hook and nothing else — no charge, court date, disposition or sentence), a mental-health cause or care state, or a link from an OARI van event to a hospital stay or an arrest.

## The gaps

1. **Judicial data set or ledger.** An `arrested` outcome ends at a story hook. The care-and-justice path needs a record of what happened next (charged, diverted to OARI or treatment, released, held), readable by the initiatives and by desks.
2. **Mental health in the health systems.** Hospital causes are physical only. Mental-health and substance crises need to be a cause and a care state, so an OARI `substance_intervention` can end in a stay or a referral.
3. **One chain, not four tables.** Chaos-car event → response (OARI van, ambulance, patrol) → outcome (deescalated, treated, admitted, arrested) → record (Hospital_Ledger, judicial ledger) → what OARI is graded on. Today the events are dice rolls that write a story hook and a life-history line; they do not feed the records, and nothing reads the OARI events to grade OARI.
4. **OARI's real measure.** The diversion count deferred in the safety-lever plan has its likely data source already: `oari_van` rows in the chaos_cars ledger (de-escalated, substance intervention) against arrests and hospital admissions in the same hoods. Not yet verified that those rows persist in a readable tab.

## First moves (research-build, read-only)

1. Confirm what `chaos_cars` persists (`phase10-persistence/saveChaosCars.js`) and count `oari_van` outcomes per hood per cycle from real data.
2. Trace how a `medical_emergency` and an `arrested` outcome could reach the Hospital_Ledger writer and a judicial record, with the wiring card before any cut.
3. Bring the builder the sim calls: what a judicial ledger tracks, what mental-health states exist, and whether OARI is graded on diversion.

## Changelog

- 2026-09-21 (research-build) — Filed from builder direction after the OARI grading review; data-first map of chaos cars, Hospital_Ledger and the missing judicial and mental-health records.
