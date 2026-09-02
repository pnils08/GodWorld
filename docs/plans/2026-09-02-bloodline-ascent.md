---
title: Bloodline Ascent — a generic citizen's path to heritage (engine.147)
created: 2026-09-02
updated: 2026-09-02
type: plan
tags: [engine, citizens, heritage, household, tier, dials, active]
sources:
  - builder direction 2026-09-02 (S411, engine-sheet chat) — recorded verbatim in §Direction
  - docs/engine/TIER_MOBILITY.md — the three mobility mechanisms as they exist
  - docs/plans/2026-09-01-education-career-connection.md — the four loops + engine.145/146 this arc builds on
pointers:
  - "[[engine/ROLLOUT_PLAN]] — engine.147"
  - "[[engine/TIER_MOBILITY]] — CLIMB / fame door / demotion as built"
  - "[[plans/2026-05-30-citizen-lifecycle-fame-system]] — engine.29, parked; the fame half of this arc"
  - "[[plans/2026-07-13-family-household-loop-build]] — the household half, as built"
  - "[[plans/2026-07-31-citizen-memory-perception]] — engine.94, dials + memory + approval ceiling"
  - "[[index]] — registered same commit"
---

# Bloodline Ascent — a generic citizen's path to heritage (engine.147)

**Status: DIRECTION CAPTURED, NOT DESIGNED.** This file exists so the next session boots on the builder's words and this session's data, not on a reconstruction. First task is a measure, not a build.

## Direction (builder, 2026-09-02, recorded as said)

> The idea here is the citizen's path to success in this world. Take a generic citizen (a Tier-5 in waiting) with very little impact on its world, and how they can go from that to Tier 1, with a full household, and ascend to a heritage figure in the sim. Where the Keane family is carried in off professional sports fame and riches, the same path (albeit weighed against them) can ascend to that same level with chance events, cron wakes, media coverage and lottery-type events like UNDOCKED and casino gains. Like real life, a citizen is impacted by where they live, the choices the civic engine makes, the choices its cron makes in a wake, and how those hitting their dial system start to alter their life path — the same way someone on heritage can lose it all with the inverse. The idea is to have the cycles throwing all this data at a cron and it knowing it needs to maneuver up in Tier and dial state to advance their bloodline.

Earlier the same day: *"we will be checking heritage and households in the next project to ensure all the systems landed and the infrastructure is set on the path to success or failure of bloodlines."*

**Read of the direction (engine-sheet):** two halves. (1) **Audit** — do the systems that exist actually connect into one path from Tier-5 to heritage, and the inverse? (2) **The maneuvering cron** — a citizen-loop wake that reads what the cycle threw at a citizen (hood state, civic choices, media coverage, casino/UNDOCKED outcomes, dial deltas) and acts to move Tier and dial state toward advancing the bloodline. The test for every piece: does a row drive a fate (universal protagonism).

## What exists today (verified S411 or pointed)

- **Tiers:** four tracked tiers + Generic_Citizens as the Tier-5 pool. Mobility as built is in `docs/engine/TIER_MOBILITY.md`: CLIMB via the UsageCount ladder (media appearances), the fame door (engine.118, designed, **unwired** — zero fame→Tier writes exist), demotion. Media promotion is structurally dead (engine.108: a Tier-5 can never be covered because the packet path stopped reading Generic_Citizens). **That is the first rung and it is missing.**
- **Heritage:** `Heritage_Ledger` 5 lines, all `Founding` (Corliss, Dillon, Keane, Kelley, Varek), 1–4 living members, 1–2 generations, scores 12–17. Columns: LineageId, FamilyName, FounderPopId, FoundedCycle, FoundedDoor, Generations, LivingMembers, MembersList, HeritageScore, HeritageTier, TotalNetWorth, HomesOwned, BusinessesOwned, CivicMembers, FameMembers. No sector/trade on a line. `heritageTierByPop_` feeds the 18th-birthday settlement (+1/+2 on the draw, engine.66). Founding doors: pointed in the heritage build (grep `FoundedDoor`).
- **Household:** `Household_Ledger` 682 rows (HouseholdId, HeadOfHousehold, Type, Members, Neighborhood, HousingType, rent/cost, HouseholdIncome, Formed/Dissolved, Savings). 49 of 50 minors have a household; 47 a resolvable parent. Household income + parent education + heritage tier + school quality set a kid's start (engine.60/66/143/144).
- **Dials:** `DialState` per citizen, compressed from LifeHistory lines by `compressLifeHistory_` through `citizenDialMap.js` (every event tag → dial deltas; `youth-*` tags included since S411). Dial bands already scale participation (drive → youth-event frequency; engine.32 T5) and the E2/E3 events do not read dials.
- **Education → career (S411):** field-first settlement, credential tie-break, youth-mode texture; SkillTags = current then trained field; a parent's field pulls the kid's.
- **Chance/lottery inputs:** `Casino_Ledger` armed live (4b, grok); UNDOCKED show feed (`Undocked_Feed`, Reputation lines); chaos cars; health milestones; employer success/layoff (engine.135); civic scoring and initiatives as hood-level conditions (engine.139).
- **Crons/wakes:** the 24/7 citizen-loop wakes (citizen-voice agents), the civic Sunday chain, the media daily pipeline. None of them today reads a citizen's Tier/dial position and *acts* to move it.
- **Memory:** engine.94 Track A (grief/approval self-arm) live; Track B (typed grudge, ambition, folk memory) gated on a design session — **ambition is the dial this arc needs**.

## First task (next session): the measure

Trace ONE generic citizen forward through the mechanisms above, on paper, hop by hop: Generic_Citizens → first coverage → Tier 4 row → household → first job → dial movement → Tier 3 → … → heritage line founded → Tier 1. At each hop name the file:line that performs it or write **GAP**. Then the inverse for a Founding-line member. Expected gaps from what S411 saw: the Tier-5 → Tier-4 door (engine.108), the fame door (engine.118 unwired), no ambition dial (engine.94 Track B), no cron that reads Tier/dial and acts, no heritage trade/field on a line, no heritage *loss* path.

Deliverable of the measure: a hop table with pointers and gaps, and a build order the builder can approve. No code before that table exists.

## Open questions (for the builder, after the measure)

- Is the maneuvering cron a **citizen-voice wake** (the citizen chooses) or an **engine phase** (the world moves them)? The direction says cron; the doctrine says the engine is the substrate and crons capture. Both may be right at different hops.
- What is "advance the bloodline" as a number — HeritageScore, HeritageTier, generations, members in Tier ≤2? The line needs one target the cron can steer toward.
- Loss: what un-founds a line (last member dies, score below a floor, a scandal)? Nothing today.

## Changelog

- 2026-09-02 (engine-sheet, S411) — Direction captured as said, the existing-mechanism map pointed, the measure defined as the first task. No design, no code.
