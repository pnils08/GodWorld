---
title: Owed responses — a listed event hitting a named citizen reserves that citizen a wake
created: 2026-10-29
updated: 2026-10-29
type: plan
tags: [media, citizens, wakes, draft]
sources:
  - output/cron-compare/culture_c113_tamsin-pruitt_packet-v2_angle.json (C113 Lives slice — 4 mood lines, 0 milestone events)
  - output/world_summary_c113.md ## Chaos Events (4 chaos cars named citizens)
  - lib/wakePerception.js:847 (wake draw weight 1 + 2·eventMag) · utilities/citizenDialMap.js nudgesForEvent_
  - scripts/citizen-wake.js:200 (voiceOnce — deepseek-v4-flash, reasoning off, 260 tokens, no tools; 3 wakes/day)
  - scripts/buildLivesSlice.js (LIFE_TAGS — stance lines no longer lead, 253cdde4)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.93"
  - "[[2026-10-11-media-extension]] — pipeline.73, the slice layer this feeds"
---

# Owed responses

**Problem (builder 2026-10-29).** Tamsin (Lives) covers citizens living events; other desks cover the event with a quote. A citizen the event hit often has no recorded response, so the Lives slice has nothing true to carry. C113: 4 chaos cars hit named citizens (train signal failure, medical hold on board, parking ticket, mail delivery); each left one line (Friction/Setback tag) and no wake. 0 of 4 woke. Wake draw is weight 1 + 2·eventMag over 1,039 citizens at 3 wakes/day: Friction ×5, Setback ×11 against ×1 — a better chance, still a small one.

**Direction (builder, 2026-10-29).** Events we want canon depth on record a response: chaos cars, casino or UNDOCKED win over a stake, a hospital stay of N cycles, a citizen in the judicial system for an offense type.

## Design (not built)

1. A listed event hitting a named citizen marks them *owed* a wake.
2. Each cycle reserves R wakes for owed citizens, most severe first; the rest stay the normal weighted draw.
3. An owed mark lapses after M cycles unreached.

## Builder's rulings (2026-10-29)

Thresholds, from measured rates (chaos: 11 cycles of world_summary; casino: 164 settled wagers C107–C113; hospital: 3 stays; court ledger empty):

| Event | Owes a response | Expected / cycle |
|---|---|---|
| Chaos car | the engine's `severity: 'high'` citizen outcomes (arrested, medical_emergency, workplace_accident, substance_intervention, deescalated, mail_theft_reported) | ~0.7 |
| Casino / UNDOCKED | wager over 1,000, or winnings over 500 (builder, second pass: not a 500 stake) | ~0.5 (3 wagers ≥1,000 and 2 net wins ≥500 in C107–C113) |
| Hospital stay | any admission | ~0.4 |
| Court case | any detention, any offense | ~0.2 |

- **Reserved wakes R = 6** a cycle (builder raised it from 3; agreed), most severe first. At ~2 owed a cycle on these bars, R=6 is headroom plus room for absorbed tickets.
- **Expiry M = 2 cycles.**
- **Absorption (builder):** a cycle where no high-severity event fired lets the low-severity citizen-hit chaos events (tickets, warnings, delays) take the reserved wakes, severity then recency. Read as: zero severe events → low ones absorbed (builder: "how you set it is fine"). Leftover-slots-every-cycle would be a one-line change.
- Casino volume tripled C107→C113 (12→40 settled); revisit the 1,000 wager bar in ~5 cycles. The engine rates a train held for a medical emergency low; it is not in the high class.

Build not started. Wake selection is `lib/` (engine substrate): bench proof, review, PROD.

## Measured volume (C113)

4 chaos cars on citizens, 2 casino losses, 0 open hospital stays (3 rows, all discharged), 0 judicial rows → ~6–8 owed per cycle against ~21 wakes.

## Cost note

A wake is one call: deepseek-v4-flash-0731 via OpenRouter, reasoning off, 260 max tokens, no tools. OpenRouter has no batch tier; the Anthropic Batch API (50%) covers Claude models only. Batching these wakes saves little and adds a wait; not pursued. Desk writers on Claude models are where batch cost is worth measuring (separate question).

## Other desks (survey, read 2026-10-29)

Chaos Events read by: CivicOffice, CivicDomain, Jax, Transit. Hospital_Ledger: Health, Neighborhood, Lives. Judicial_Ledger: CivicDomain, Neighborhood, Safety. Casino_Ledger: Economic, Lives. Citizen pages/reflections: CivicOffice, Lives, Pulse, PSlayer, Voices. Lives reads no chaos events. Each desk that covers an event gains a recorded response once this lands; which desks carry it is a per-slice call after the build.

## Process

Wake selection is `lib/` — engine substrate: bench proof on the candidate, review, then PROD. Row opened on the builder's word 2026-10-29.

## Changelog

- 2026-10-29 (research-build) — Builder ruled thresholds (casino: wager over 1,000, winnings over 500), R=6, M=2, absorption as set; row ready, build not started.
- 2026-10-29 (research-build) — Plan opened from the Tamsin C113 flag (stance lines quoted as speech; slice fed moods on a thin day). Slice side shipped same day: 7c5f390a, b26a4184, cf0e995f, bd1f0c28, 253cdde4.
