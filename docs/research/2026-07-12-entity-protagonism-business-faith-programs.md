---
title: Entity protagonism — business/faith event generation + Community_Programs ledger — research
created: 2026-07-12
updated: 2026-07-12
type: reference
tags: [research, engine, seeds, entities, active]
sources:
  - S313 engine-sheet trace (Mike-direct session, 2026-07-11/12) — buildContractSeeds.js, lib/rippleLedger.js caller graph, phase04-events/faithEventsEngine.js, live Story_Seed_Deck read (C101, 0/7 rows carried entities pre-backdrop-fill)
  - phase07-evening-media/buildContractSeeds.js — S313 backdrop fill (the shipped half of this direction)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (research.24)"
  - "[[index]] — registered same commit"
  - "[[2026-07-06-city-citizen-seam-audit]] — sibling: the citizen Grade 1/2/3 seam this extends to non-citizen entities"
---

# Entity protagonism — business/faith event generation + Community_Programs ledger

**Source:** S313 engine-sheet audit trace (Mike-direct). Question asked: are businesses, churches, community programs wired into Story_Seed_Deck? Finding: deck columns K/L wired, but only chaos-cars ever emitted a business-scoped ripple; no producer emits faith/program scopes; Riley digest lifestyle content never reaches seeds. Live C101 deck: 0/7 rows carried any entity.

**What this addresses:** Universal protagonism for non-citizen entities. Businesses, faith orgs, and community programs are ledger rows that should drive fates, not just exist. S313 shipped the *backdrop* half (neighborhood entities attach to seeds the way citizens do — canon builds through usage). This file holds the *protagonist* half: entities having their own events.

**What it does (current state):** `recordRipple_` is the sole `S.rippleEvents` writer; its ~9 callers emit citizen/neighborhood/citywide scopes only (chaos-cars excepted: `targetScope:'business'` on vehicle hits). `faithEventsEngine` (phase04) generates neighborhood-tagged faith events into Faith_Ledger + `S.worldEvents`, but worldEvents never feed `buildContractSeeds_`. Riley_Digest evening content (famous people, restaurants, streaming/food trends) is texture in world_summary only — no lifestyle desk consumes it, no seed carries it.

**Extraction — what's usable (three tracks, Mike-direct S313):**
- **Business events → business-scoped ripples.** "XX is laying off employees / XX is expanding" — economicRippleEngine (or a small business-event generator inside it, FIX-don't-ADD) attributes cycle economics to specific Business_Ledger rows and emits `recordRipple_(targetScope:'business', targetIds:[BIZ_ID])`. The deck already consumes it — seeds arrive with the business as protagonist, exact-target ahead of the S313 backdrop draw. Employee_Count/Growth_Rate columns become causal inputs.
- **Faith events → ripples.** faithEventsEngine already generates the events; it just never records ripples. One `recordRipple_` call per generated event (scope: faith-org name or a FAITH-ID) puts holy days/community programs into the deck with the org as protagonist.
- **Riley lifestyle layer → backdrop businesses.** Famous-people sightings, restaurant/eating geography, streaming+food trends already name places. Fold them into seed backdrop (the S313 columns) so the unused "lifestyle journalist" beat has real entity hooks — top shows, famous people in town, restaurants — and each mention accretes business canon.
- **NEW LEDGER — Community_Programs (Mike-direct S313).** Canon programs are already being generated in stories with no tracking home: **Vinnie Keane Gala; Vinnie Keane refurbished-firehouse free baseball academy (West Oakland); Mark Aitken youth baseball league.** As these generate, they should land as rows (name, founder POPID, neighborhood, type, founded-cycle, status) and become: (a) backdrop-fillable into `OtherEntities` alongside faith orgs (the S313 draw generalizes — one more hood-keyed pool), (b) tied into youth events (generationalEventsEngine / youth citizen events reference the programs in their neighborhood), (c) ripple-targetable like businesses. This is the same "entities are also in the neighborhood" move — programs just need a ledger to exist in first.

**Not applicable / hazard:**
- Citywide backdrop draw was deliberately excluded in the S313 fill (an arbitrary citywide business has no story connection) — keep that boundary when extending.
- Business event *generation* must stay deterministic (ctx.rng) and emit through `recordRipple_` — not a new parallel event ledger. FIX-don't-ADD: extend economicRippleEngine/faithEventsEngine, don't build new engines beside them.
- Community_Programs is a schema addition (new tab) — needs Mike's explicit go at build time per the schema-change bar; the youth-event tie-in touches generational events, so read ENGINE_COUPLING_MAP before the cut.

**Verdict:** `adopt` — design work for research-build; ROLLOUT row research.24 carries state. Plan should sequence: Community_Programs ledger (smallest, unblocks OtherEntities depth) → faith ripples (one call site) → business events (design of layoff/expansion generation) → Riley lifestyle fold.

**Ignited plans:** none yet — research.24 is `ready` for research-build to ignite.

---

## Applications (living)

- 2026-07-12 — S313 backdrop fill in `buildContractSeeds.js` shipped as the companion move (neighborhood businesses/faith orgs attach behind exact targets; tests §8).

---

## Changelog

- 2026-07-12 — Initial extraction (S313, engine-sheet, Mike-direct).
