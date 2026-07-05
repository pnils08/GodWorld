---
title: Mike seed contract — research
created: 2026-07-05
updated: 2026-07-05
type: reference
tags: [research, seeds, engine, editions, active]
sources:
  - Mike-direct S296 (2026-07-05) — conversation, engine-sheet terminal; statements filed verbatim below
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — registered same commit"
---

# Mike seed contract — research

**Source:** Mike, direct conversation, 2026-07-05 (S296), engine-sheet terminal. Verbatim statements below — unedited, typos kept. These are the governing text; everything else in this file is extraction.

> "Correct the new desk packet doesn't tell agents what to write anymore , it says here's what
> happened and to whom, search canon to support and write an article , so the idea is to save
> token burn , dot let the agent search for cictzens raw or leave ambiguous for creating a new
> citizen, provide the exact citizens , neighborhoods , businesses effected by the story seed
> (aka engine event) there are over 20+ engines, 15-20 neighborhoods , businesss , famous
> people , evening events , popular tv shows , etc , the current seeds is trash compared to
> what I built and what happens in this 11 phases"

> "the engine has the truth and it show it nowhere"

> "What does a json do when the sheets are the world . No json is part of this or should carry
> any logic"

> "Run a cycle to completing is a fail if the engine isn't out outing the data, 114 cycles
> completed cause that's the goal , not one produced the world yet"

**What this addresses:** The seed ledgers are the point of the project — the surface where the engine's truth reaches the newsroom — and they carry none of it. 124 cycles have run; no article has ever covered the sim; the engine computes what/who/where/why every cycle and shows it nowhere.

**What it does:** Defines the desk-packet contract: a seed is an engine event, handed to desks as "here's what happened and to whom — search canon, write." Names the anti-goals: agents searching for citizens raw, ambiguity that mints fake citizens, prescriptive voice/angle direction, JSON carrying logic.

**Extraction — what's usable:**
- packet = event + exact affected entities, nothing prescriptive → Story_Seed_Deck row contract (What/Why/Who-exact/Where/Magnitude/Trend; voice/angle/byline columns die)
- exact entities attached at generation moment → in-cycle seed writers; no post-hoc finder process; anti-fabrication guarantee for citizen accuracy
- token burn is the design driver → desks never re-derive the world; the row is the cached truth
- sheets are the world; no JSON logic → seed path is engine-internal, in-cycle, sheet-to-sheet; post-cycle Node enrichment retired as the seed path
- a cycle passes only if it outputs the world → verification standard everywhere: grade output usability, not execution
- the world is rich (20+ engines, 15–20 neighborhoods, businesses, famous people, evening events, TV shows) → seed rows must carry entity breadth, not citizens only

**Not applicable / hazard:** Nothing set aside. Hazard, demonstrated same day: interpreting these statements instead of quoting them — the engine.45 plan translated Mike's direction into a builder-authored diagnosis and lost the design. Where interpretation and this file conflict, this file wins.

**Verdict:** `adopt` — ignites the row-contract-v2 rewrite of the seed plan. ROLLOUT row: engine.35 (existing, in-progress).

**Ignited plans:** [[../plans/2026-06-15-story-seed-deck-engine-emergence]] — §"2026-07-05 — Corrected row contract" is the plan-side landing of this research.

---

## Applications (living)

- 2026-07-05 — engine.35 plan §"Corrected row contract (Mike-direct, S296)" written from this; engine.45 Tasks 4–6 killed by it.

---

## Changelog

- 2026-07-05 — Initial filing (S296). Verbatim-first: source statements quoted unedited, extraction after.
