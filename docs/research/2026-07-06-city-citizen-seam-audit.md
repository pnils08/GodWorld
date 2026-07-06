---
title: City↔citizen seam audit — three event layers, the missing bridge, the loop pattern
created: 2026-07-06
updated: 2026-07-06
type: reference
tags: [research, engine, citizens, seeds, story-seed-deck, career, migration, active]
sources:
  - Sandbox sheet `1syShVWfudY0eCC9rnR7AWZ8-b-fs5RpJW2bhn6nZtzs` — LifeHistory_Log (25,518 events, C105–C116), Simulation_Ledger (900 active), Story_Seed_Deck (9 rows C116), Neighborhood_Map
  - phase05-citizens/generateCitizensEvents.js:1815 (DialState bands scale activity), :1883 (fire-at-all is a dice roll), :2100-2109 (family events gated on MaritalStatus/NumChildren), :2291 (dial weights categories 0.5–1.5)
  - phase05-citizens/runCareerEngine.js:298 (city econMood → macro pressure on transitions), :761 (Career-Transition), :776/:784 (Income written back +6–12% / −12–20%)
  - phase05-citizens/runConductEngine.js:215 (Resisted +5 integrity), :277 (conduct ripples to local crime)
  - phase05-citizens/generateMediaModeEvents.js:52,105 (RoleType-gated; journalists only)
  - phase05-citizens/migrationTrackingEngine.js:135-283 (assessDisplacementRisk_ — Neighborhood_Map.DisplacementPressure + household rent burden + age/education → DisplacementRisk on the row)
  - phase01-config/godWorldEngine2.js:303-304 (Gentrification + MigrationTracking wired at Phase 5, both entry points)
  - docs/plans/2026-06-15-story-seed-deck-engine-emergence.md (§Corrected row contract — entities attach at generation; V2-1..V2-4)
  - docs/plans/2026-07-04-ripple-ledger-attribution.md:160-169 (engine.45 T4/T5 purposes absorbed into deck columns; tasks DEAD)
pointers:
  - "[[../plans/2026-06-15-story-seed-deck-engine-emergence]] — Grade 1 lands inside its V2-3 seed writers"
  - "[[../plans/2026-07-04-ripple-ledger-attribution]] — producer-side sibling; ripple carry survives for Why/Trend"
  - "[[index]] — registered same commit"
---

# City↔citizen seam audit — three event layers, the missing bridge, the loop pattern

**Trigger (Mike, 2026-07-05→06):** "Maybe there is no such thing as an event that touches a
specific citizen — maybe citizen events just happen on dice rolls, not connected to anything."
Method: trace 4 citizens, one per tier, through every logged event in the sandbox window, then
open every generator that fired one. Citizens: POP-00597 Eric Taveras (T1, athlete, Downtown),
POP-00023 Gregory Mims (T2, West Oakland), POP-00013 Maria Keen (T3, journalist, Lake Merritt),
POP-00210 Depak Ying (T4, server, Rockridge). Window: C105–C116 (12 cycles; pre-105 archived).

## Finding 1 — citizen events come in three layers, not one

25,518 events, 910 citizens, ~2 events/citizen/cycle.

| Layer | Volume | Mechanism | Verdict |
|---|---|---|---|
| **Atmosphere** (reflection/curiosity/listening/groove/identity/homeLife…) | ~70% | Weighted dice over template pools — but the **pool is loaded by the citizen's row**: family entries only exist if MaritalStatus/NumChildren say so (:2100), DialState scales activity (:1815) and category weights (:2291), bonds/rivalries gate entries (:2141+) | Dice, but loaded dice. Feeds the 24/7 crons. |
| **Who-you-are** (MEDIA-Event, GAME-Micro, Civic Perception, nbhdState, prevEvening) | ~20% | Role/mode/location gated: Maria (journalist) files stories, Eric (athlete) gets off-days, Gregory gets neither. Civic Perception fired off the actual sandbox initiative passing. | Real identity-driven selection. |
| **Fate-changing** (Career-Transition/CareerState, Conduct, Education, chaos) | ~10% | Ledger columns move: career engine writes Income (:776/:784), conduct writes integrity + ripples local crime (:277). Depak's C105 transition verified against his row (`lastT=105`, LastPromotionCycle=112). | Chaos cars is NOT the only citizen-touching engine. |

Proof-by-contrast: Depak (married, 3 kids) drew bedtime-negotiation events; Eric (young,
single) drew zero family events in 12 cycles. Same generator, different rows, different lives.

## Finding 2 — the seam: city→state exists, state→experience doesn't

City engines and citizen engines are separate characters that crossweave in threads:

- **City → citizen state: WORKS.** Migration engine (every cycle, Phase 5): West Oakland
  DisplacementPressure 8 + rent burden + age/education → DisplacementRisk written per row.
  Live sandbox: 913 scored 0–7, **13 citizens at risk 7**, 57 MigrationIntent "considering."
- **City → citizen perception: WORKS.** prevEvening/nbhdState/civicNews lines.
- **State → experience: MISSING.** Zero displacement/migration events in 25,518 log rows.
  The 13 risk-7 citizens have no event, no seed, no story. The score is a silent column.
- **Seed → citizen: MISSING.** Story_Seed_Deck C116: 9 rows, Citizens/CitizenEvents/
  Businesses/OtherEntities **0/9 filled** — the contract says entities attach at generation;
  the writers don't do it.

No citywide CAT/crisis engine exists (the old fabricated crisis buckets were pulled —
ENGINE_REPAIR Row 28, folded into engine.35). Chaos events are local. City-wide "events" today
are top-down numbers, which is exactly what the seed deck now explains.

## Finding 3 — reference implementations for the loop pattern

- **Career = the FULL loop, live today:** city econMood tilts transition dice (:298) →
  transition writes Income on the row → event lands in LifeHistory → voice reads LifeHistory.
  This is the working template every other domain should mimic.
- **Migration = HALF loop:** city math → row column, then stops. Deliberate for now
  (Mike 2026-07-06): migration stays a city-level data point — no citizen removal while the
  life cycle is being perfected. Verified: zero departures in the window.
- **Education = partial:** cityDynamics flavor events but barely steer fate.
- **Health = not looped.**

## The doctrine (Mike, 2026-07-06)

**The event is disposable; the testimony is the asset.** Storylines are forgotten without a
search; what persists is the citizen speaking about the event through their own life ("the
flood was tough, but I got promoted that week"). Events exist as an excuse for citizens to
generate experience and voice it. Citizens lay dormant until they speak — LifeHistory is the
dormant state, voice is the waking. Extends the universal-protagonism
doctrine (every citizen is the main character of their own life — Mike verbatim, S296).

A citizen does NOT need to have received an event to testify: attach POPIDs to a seed and the
voice already has that citizen's LifeHistory — the lived-in texture comes from their log, not
the seed. Hand the agent the POPID and the citizen is free.

## The grades (agreed direction, 2026-07-06)

1. **Grade 1 — attach at generation (NEXT).** Seed writers attach N POPIDs drawn from the
   seed's neighborhood (citywide seed → sample across hoods). No new engine; edit inside the
   existing V2-3 writers. Verify per V2-4: open the sheet, every row carries POPIDs.
2. **Grade 2 — exposure-weighted draw (later).** Retail seed prefers retail workers;
   displacement seed prefers high DisplacementRisk rows. Same join, smarter dice.
3. **Grade 3 — participation events (someday).** Major seeds also write a lived line into the
   attached citizens' LifeHistory. Only grade needing new engine logic. Not forced now.

## Future projects (parked, not scheduled)

- **Displacement column real estate.** 6 Simulation_Ledger columns (DisplacementRisk,
  MigrationIntent, MigrationReason, MigrationDestination, MigratedCycle, ReturnedCycle) serve
  a half-loop deliberately kept city-level. Decide: repurpose, complete the loop later, or
  slim. Premium ledger space.
- **Loop-mimicry per domain.** Clone the career-loop shape (city input → dice tilt → column
  write → LifeHistory event → voice) for education, health, etc.
- **Ledger logic integrity.** Misaligned data misfire events: **19 professionals with
  HS-or-less education** (incl. POP-00143 DISTRICT ATTORNEY, edu=hs-diploma), 26 blank
  EducationLevel; education + income are major career-engine inputs. Also two career systems
  disagree about the same citizen (Depak: CareerStage "senior/31.2yrs" vs v2.3 CareerState
  "level=1/tenure=1") — old columns and the v2.3 model don't talk.
- **Neighborhood_Map input sparsity.** DisplacementPressure blank for most hoods (only West
  Oakland=8) — the existing bridge runs on mostly-empty city inputs.

## Status

- 2026-07-06 — Filed (engine-sheet, Mike-direct). Audit complete; Grade 1 is the agreed next
  build, pending Mike's go on the edit.
