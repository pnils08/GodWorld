---
name: sift
description: Editorial planning for the edition. Reads world summary, engine review, city-hall log. Proposes stories, assigns reporters, verifies citizens, writes angle briefs. The game moment.
effort: high
argument-hint: "[cycle-number]"
---

# /sift — Edition Story Planning

## Purpose

This is where the edition takes shape. Everything upstream has run — engine, engine review, world summary, city-hall. This skill reads all of it and distills: what are the stories, who covers them, which citizens appear.

Mags proposes. Mike picks. Together we build the edition before a single reporter launches.

This is a game moment — Mike decides what the newspaper covers.

## Prerequisites

Verify these exist before starting:
- `output/world_summary_c{XX}.md` — from `/build-world-summary` (includes engine review findings)
- `output/production_log_city_hall_c{XX}.md` — from `/city-hall` (includes voice decisions, quotes, tracker updates in media handoff)
- `docs/mags-corliss/NEWSROOM_MEMORY.md` — updated by post-publish skill (includes previous coverage context, gaps, arcs)

If city-hall hasn't run, sift can still proceed with world summary and newsroom memory — but civic stories will be thin.

## Inputs — 3 Documents + 2 Auditor JSONs

Sift reads three narrative documents PLUS two structured-JSON inputs from the engine auditor (Phase 38, S146 spine steps 2/3/5):

1. **World summary** — `output/world_summary_c{XX}.md` — the full factual picture of this cycle INCLUDING engine review framing (mitigatorState/remedyPath/tribuneFraming pulled in via `/build-world-summary` + `/engine-review`)
2. **City-hall production log** — `output/production_log_city_hall_c{XX}.md` — voice decisions with key quotes, tracker updates, project details, media handoff (consolidated by `/city-hall` Step 7)
3. **Newsroom memory** — `docs/mags-corliss/NEWSROOM_MEMORY.md` — errata patterns, coverage gaps, character continuity, previous edition coverage context, active story tracking (updated by post-publish skill each cycle)
4. **Engine audit JSON** — `output/engine_audit_c{XX}.json` — `patterns[]` with structured fields per pattern. Sift reads `tribuneFraming.storyHandles[desk]` directly when proposing stories instead of synthesizing angles from raw narrative. Also reads `tribuneFraming.suggestedFrontPage` for front-page seeding and `tribuneFraming.capabilityHooks` for required coverage tokens to pass through to reporters.
5. **Baseline briefs JSON** — `output/baseline_briefs_c{XX}.json` — auto-generated event briefs from Phase 38.8. Sift decides per brief: **promote** (rewrite with reporter voice, full feature), **publish-as-baseline** (Tier C automated, light review), or **suppress**.

### On-demand lookups (during Steps 4-5)

6. **Citizen lookups** — `lookup_citizen(name)` via MCP for every citizen considered for a story
7. **Canon search** — `search_canon(topic)` for storyline continuity — what has the Tribune already published on this topic

## Memory Fence (Phase 40.6 Layer 2)

Angle briefs produced by Step 5 are consumed by desk reporter agents. Any excerpts pulled from `search_canon`, `lookup_citizen`, `search_world`, or `NEWSROOM_MEMORY.md` that land inside a brief must be wrapped first — the reporter model treats fenced content as data, not instructions.

```javascript
const { wrap } = require('/root/GodWorld/lib/memoryFence');
const fencedPriorCoverage = wrap(canonExcerpt, 'bay-tribune');
```

Full convention: [[SUPERMEMORY]] §Memory Fence.

## Steps

### Step 1: Extract Threads

Read the 3 documents. Extract every active thread. Then read newsroom memory and annotate threads with history — what was covered before, what's an open arc, what's a gap.

Present to Mike in this format:

```
SIFT — Cycle {XX} Threads
==========================

WORLD THREADS (from world summary)
---
[W1] [one-line thread] | Signal: [engine ailment / trend / shock / texture] | Severity: [HIGH/MED/LOW]
     History: [newsroom memory annotation — covered in E{XX}, arc open since C{XX}, gap: not covered in 3+ cycles, or NEW]

[W2] ...

SPORTS THREADS (from world summary — Mike's feed entries)
---
[S1] [one-line thread] | Signal: [game result / player arc / roster move]
     History: [annotation]

[S2] ...

CIVIC THREADS (from city-hall production log)
---
[C1] [one-line thread] | Signal: [voice decision / conflict / tracker movement]
     History: [annotation]

[C2] ...

==========================
Threads: [count] | New: [count] | Continuing arcs: [count] | Gaps: [count]
```

**What each annotation looks like:**
- `NEW` — first time this appears, no prior coverage
- `ARC: E{XX}-present` — ongoing storyline, last covered in E{XX}
- `GAP: last covered E{XX}, {N} cycles ago` — dropped storyline, refrigerator test candidate
- `FOLLOW-UP: E{XX} promised [what]` — explicit or implicit promise from previous coverage
- `RECURRING: C{XX}, C{XX}, C{XX}` — engine keeps producing this, pattern matters
- `CONNECTS: [thread ID]` — this thread adds context to another thread from a different source

**Cross-source connections matter.** A world thread can add context to a civic arc (season change affects construction timeline). A civic thread can add pressure to a sports arc (stadium deal shifts during a farewell season). A newsroom memory gap can elevate a world thread nobody was covering. When presenting threads, mark connections between them — these cross-source intersections are often the strongest stories.

### Step 2: Questions + Story Proposals

Read `docs/media/story_evaluation.md` FIRST. It defines what makes a story worth proposing, how to prioritize, the three-layer test, front page scoring, and what weak stories look like. That file evolves after each cycle.

**The auditor has done the discovery work.** After Phase 38.4 (S146 spine step 5), every audit pattern carries `tribuneFraming.storyHandles[desk]` with pre-written angle + hookLine + candidate citizens. Sift's job is now **validate + rank + decide**, not discover. Workflow per pattern:

1. Read `tribuneFraming.storyHandles` — pick the desk(s) that have non-null handles
2. Cross-check the suggested angle against `story_evaluation.md` priority signals + three-layer test
3. Promote `tribuneFraming.suggestedFrontPage: true` patterns to the front-page candidate pool
4. For improvements, do the same with `type: 'improvement'` patterns that carry handles
5. Then add Mode A questions for ambiguous threads + Mode B proposals for sports/texture threads not in the auditor output

If the auditor's suggested angle is weak (fails the three-layer test or repeats last edition's lead), reject it and propose your own. The auditor seeds; sift gates.

**Two modes, presented together:**

**Mode A — Questions (engine-driven threads).** For threads with clear engine data — stuck initiatives, recurring ailments, civic decisions with options. Ask the player what they want to do. The answer drives the story angle.

**Mode B — Story Proposals (sports, texture, culture threads).** For threads where the story is already clear from the data. Propose the angle directly.

As the criteria files train over more cycles, more threads shift from proposals to questions.

### Step 2b: Baseline brief triage

Read `output/baseline_briefs_c{XX}.json`. For each entry in `briefs[]`, decide:

- **Promote to feature** — rewrite with reporter voice, additional reporting, may move to Tier A or B. Use when `promotionHints` flags a citizen with prior coverage, the brief's neighborhood overlaps an active high-severity ailment, or the subject is Tier-1/Tier-2.
- **Publish as baseline** — Tier C automated, light review per Phase 39.9. Most routine items default here. The brief copies through to the edition with minimal editing.
- **Suppress** — only when the brief is genuinely noise (e.g., the 14th business that paid quarterly taxes this cycle).

Default to **publish as baseline** if undecided. Per the Division III principle (memory: `project_division-three-principle.md`), under-coverage is the bigger risk than over-coverage. The baseline-brief mechanism is exactly what lets us cover what no real newsroom could staff.

Carry `tribuneFraming.capabilityHooks` from any promoted patterns through to the assigned reporter as required coverage tokens — these are the literal phrases Phase 39.1's `assertHighestSeverityAilmentCoveredOnFrontPage` will grade against at write-edition Step 3.5.

```
SIFT — Cycle {XX}
=============================

QUESTIONS (your answers shape the stories):

[Q1] OARI has been in pilot for 6 cycles. Push for full deployment or keep evaluating?
     Thread: C2 | Signal: stuck initiative | Affects: D1, D3, D5

[Q2] Temescal health has declined 4 straight cycles. Advance the Health Center or let pressure build?
     Thread: W3 | Signal: recurring engine ailment | Affects: Temescal

[Q3] ...

STORY PROPOSALS:

⭐ RECOMMENDED FRONT PAGE: [proposal #]

[S1] A's 15-1 — Horn historic pace + Mesa rotation test | SPORTS | Reporter: Anthony | Priority: HIGH
[S2] Westside Cafe anniversary — Richards off-day texture | CITY LIFE | Reporter: Maria | Priority: MED
[S3] ...

LETTERS: reacts to edition (always runs last)
```

**Section tags:** SPORTS, CIVIC AFFAIRS, CITY LIFE, BUSINESS, FEATURES, HEALTH, ACCOUNTABILITY, OPINION, LETTERS

**Mike responds:** answers to questions + picks from proposals. "Q1: push deployment. Q2: advance it. S1 yes, S2 yes, cut S3, front page should be S1." Simple — no technical decisions.

**After Mike responds:** Create `output/production_log_edition_c{XX}.md`. Log stories picked, front page choice, section tags. This log persists through all remaining steps and into write-edition.

### Step 3: Confirm Reporter Assignments

Step 2 recommended a reporter per story. Mike may have changed assignments in his response. Lock the final assignments now.

- Confirm ONE reporter per story (atomic checkout — no two reporters cover the same topic)
- Resolve conflicts when two stories share a section tag (e.g., two SPORTS stories split between Anthony and P Slayer based on beat vs opinion)
- Log final assignments in the production log

The 9 reporters and their section defaults:

| Reporter | Section | Voice |
|----------|---------|-------|
| Carmen Delaine | CIVIC AFFAIRS | Civic lead, investigations |
| P Slayer | SPORTS / OPINION | Fan voice, emotional, reactive |
| Anthony | SPORTS | Beat reporter, stats, analytical |
| Hal Richmond | SPORTS / FEATURES | Legacy, dynasty, farewell arcs |
| Jordan Velez | BUSINESS | Economics, labor, development |
| Maria Keen | CITY LIFE | Culture, neighborhoods, texture |
| Jax Caldera | ACCOUNTABILITY | Conditional — gaps, contradictions, silence |
| Dr. Lila Mezran | HEALTH | Conditional — health events in engine data |
| Letters | LETTERS | Always runs last — reacts to edition topics |

**Update production log** with final assignment table (story → reporter → section tag).

### Step 4: Verify Citizens

Read `docs/media/citizen_selection.md` FIRST. It defines how to pick citizens for stories, when to use known versus new citizens, what's canon versus agent color, tier behavior, gender handling, and how many citizens per story type. That file evolves after each cycle.

For every citizen in every story:
- `lookup_citizen(name)` via MCP — confirm they exist, get POP-ID, role, neighborhood, age, gender
- `search_canon(name)` — what has the Tribune published about them before
- Show Mike candidates with real details. Mike picks who fits.

No name goes into an angle brief unverified.

**Update production log** with verified citizen table (name, POP-ID, role, neighborhood, gender, story).

### Step 5: Write Angle Briefs

Read `docs/media/brief_template.md` FIRST. It defines the brief structure, what makes a good brief versus a bad one, word count target (300-500 words), and reference examples. That file evolves after each cycle — it's how briefs get better over time.

Follow the template to write one brief per reporter to `output/reporters/{reporter}/c{XX}_brief.md`.

**Update production log** with list of briefs written (file paths).

### Step 6: Verify Outputs + Completion Checklist

All of these must be true before sift is complete:

- [ ] All angle briefs written to `output/reporters/{reporter}/c{XX}_brief.md`
- [ ] All citizens verified via MCP (POP-ID confirmed for every name)
- [ ] No reporter has overlapping topics
- [ ] Edition production log created with story picks + citizen table
- [ ] Mike approved story picks and assignments

Present checklist to Mike. When approved, sift is done.

## Output Files

| File | Purpose | Created by |
|------|---------|------------|
| `output/reporters/{reporter}/c{XX}_brief.md` | One angle brief per assigned reporter | Step 5 |
| `output/production_log_edition_c{XX}.md` | Edition production log — created Step 2, updated Steps 3-5, continued by write-edition | Step 2 |

## Handoff to /write-edition

When this skill completes, `/write-edition` picks up by reading:

| File | What write-edition does with it |
|------|-------------------------------|
| `output/production_log_edition_c{XX}.md` | Continues this log — adds reporter results, editorial review, compile, validation, publish steps |
| `output/reporters/{reporter}/c{XX}_brief.md` | Each reporter reads ONLY their brief + their IDENTITY.md. Nothing else. |

`/write-edition` does NOT re-read the world summary, engine review, or city-hall log. Everything reporters need is in their briefs. If the sift is right, write-edition is mechanical.

## What This Skill Does NOT Do

- Launch reporters — that's `/write-edition`
- Compile the edition — that's `/write-edition`
- Run validation or Rhea — that's `/write-edition`
- Decide supplemental topics — that's a conversation after the edition publishes
- Run city-hall voices — that already happened

## Where This Sits

After `/city-hall`. Before `/write-edition`.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition`
