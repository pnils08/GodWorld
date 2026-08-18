---
title: Tier Mobility — how citizens rise and fall
created: 2026-08-18
type: reference
tags: [engine, tiers, fame, media, active]
sources:
  - builder-direct 2026-08-18 (S379) — articulation of the three mechanisms; fame-permanence design intent
  - phase05-citizens/processAdvancementIntake.js — climb + decay implementation
  - phase07-evening-media/culturalLedger.js — fame implementation
pointers:
  - "[[../plans/2026-08-07-spacemolt-game-show]] §2.4 addendum — the show as coverage cannon aimed at this system"
  - "[[ROLLOUT_PLAN]] engine.118 — the unwired fame-permanence door"
  - "[[index]] — registered same commit"
---

# Tier Mobility — how citizens rise and fall

The sim largely builds off current state; a Tier-4 citizen's life reproduces
itself. The tier system is the exception engine — the mechanisms by which the
engine *notices* a citizen and their trajectory changes. Three mechanisms.
Two are wired. One is design intent with the door unbuilt.

## 1. CLIMB — media usage ladder (WIRED)

| Fact | Value | Pointer |
|---|---|---|
| Input | `Citizen_Media_Usage` rows, emergence UsageTypes only (quoted / profile / interviewed / featured; **blank counts as emergence**) | `processAdvancementIntake.js` `isEmergenceUsage_` (L241) |
| Counter | Simulation_Ledger `UsageCount`, +1 per emergence citation, name-normalized match | same file, `processMediaUsage_` |
| Promotion bars | UsageCount ≥3 → Tier 3, ≥6 → Tier 2, ≥9 → Tier 1 — immediate, same processing pass | same file, ~L429-437 |
| Who | ENGINE-clock ledger citizens; unmatched names route to Generic_Citizens `EmergenceCount` (the GC→ledger lottery, engine.58) | same file |
| Feed source | Saturday canon door only — article citations. Wake/ECL/exchange mentions do NOT feed UsageCount | `mediaRoomIntake.js` writes the usage tab |
| Reach | 228 of ~960 living citizens have ever been named in coverage (live count, S379) | `Citizen_Media_Usage` 573 rows |

## 2. DECAY — attention fades (WIRED, engine.69)

| Fact | Value | Pointer |
|---|---|---|
| Trigger | 10 cycles without being named in `Citizen_Media_Usage` (`ATTENTION_QUIET_CYCLES`) | `processAdvancementIntake.js` `decayMediaAttention_` (~L840) |
| Effect | UsageCount −1 per quiet cycle; an EARNED rung (has an "Updated to Tier N" LifeHistory marker) gives way when the count falls below that tier's bar (`TIER_BAR` {1:9, 2:6, 3:3}) — demotion one rung at a time | same |
| Exempt | Tier 1 (protected class — **reach Tier 1 and decay never demotes you**), non-ENGINE clocks, hand-authored tiers (no marker = authored = held) | same, rule 3 |
| Parallel | Cultural `FameScore` decays the same way: 10 quiet cycles (`CULTURAL_FAME_QUIET_CYCLES`) → −1/cycle, floor 0 (engine.68 "fame fades") | `culturalLedger.js` L59-90 |

## 3. FAME — the cultural layer (PARTIALLY WIRED; permanence door is the gap)

What IS wired:

| Fact | Value | Pointer |
|---|---|---|
| CUL rows auto-create | entities named in cultural coverage / evening-famous events register on `Cultural_Ledger` with accumulating `FameScore` + `MediaCount` | `parseMediaIntake.js` L142, `buildEveningFamous.js` L576 → `registerCulturalEntity_` |
| Fame bar | `CULTURAL_FAME_BAR = 25` (builder ruling) — at ≥25 the citizen-events antenna lights up via `UniverseLinks` POPID | `culturalLedger.js` L63, engine.68 |
| A-list/D-list gradient | recognition-event weight scales with fame: ≥25 → 1.15, ≥40 → 1.25, ≥60 → 1.35 — the grade is lived texture already | `generateCitizensEvents.js` L2369-2370 |

What is NOT wired (builder-direct design intent, 2026-08-18 — **engine.118**):

- **No fame→Tier write exists anywhere.** Zero code paths set Simulation_Ledger
  `Tier` from `FameScore`.
- **"Once famous, always famous" is not true today.** FameScore floors at 0 and
  the antenna goes dark below 25; nothing marks the citizen as permanently
  famous.
- **Design intent:** crossing the fame bar mints permanence — Tier 1 floor,
  forever (the escape hatch from mechanism 2's decay); from then on FameScore
  grades A-list vs D-list but never un-famouses. The UsageCount ladder is the
  fast climb; fame is the tenure.

## How the pieces compose

UNDOCKED (research.27) is the worked example: a cast seat generates emergence
citations (recap + wake-2 pilot interview = `quoted`) → mechanism 1 climbs the
pilot; falling off the leaderboard stops the citations → mechanism 2 pulls the
earned rungs back; sustained cultural presence accretes FameScore → mechanism 3
(once engine.118 lands) converts a hot run into tenure. The casino (plan Phase
4b, gated) reuses the same attention economy with downside for the audience.
