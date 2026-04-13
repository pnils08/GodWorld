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

## Inputs — 3 Documents

Each upstream skill consolidates its output so sift reads exactly 3 files:

1. **World summary** — `output/world_summary_c{XX}.md` — the full factual picture of this cycle INCLUDING engine review findings (ailments, improvements, remedy paths pulled in by `/build-world-summary`)
2. **City-hall production log** — `output/production_log_city_hall_c{XX}.md` — voice decisions with key quotes, tracker updates, project details, media handoff (consolidated by `/city-hall` Step 7)
3. **Newsroom memory** — `docs/mags-corliss/NEWSROOM_MEMORY.md` — errata patterns, coverage gaps, character continuity, previous edition coverage context, active story tracking (updated by post-publish skill each cycle)

### On-demand lookups (during Steps 4-5)

4. **Citizen lookups** — `lookup_citizen(name)` via MCP for every citizen considered for a story
5. **Canon search** — `search_canon(topic)` for storyline continuity — what has the Tribune already published on this topic

## Steps

### Step 1: Read Everything

Read all inputs. Don't judge yet — gather the full picture.

After reading, present to Mike:
- Top signals from the world summary (cycle weight, shocks, domain counts)
- Engine review findings (ailments needing coverage, things improving, incoherence)
- City-hall decisions (what voices decided, what's dramatic)
- Sports feed highlights (Mike's entries — these are the sports stories)

### Step 2: Propose Stories

Read `docs/media/story_evaluation.md` FIRST. It defines what makes a story worth proposing, how to prioritize signals, the three-layer test, and what weak stories look like. That file evolves after each cycle — it's how the sift gets better over time.

Follow the evaluation criteria to propose stories. Present each proposal in the format specified in that file (story, signal, reporter, citizens, layers, priority).

Present 6-10 proposals as a menu. Mike picks, redirects, combines, or cuts.

### Step 3: Assign Reporters

For each story Mike approves:
- Assign ONE reporter (atomic checkout — no overlap)
- Log the assignment

The 9 reporters:

| Reporter | Runs when |
|----------|-----------|
| Carmen Delaine | Civic story assigned |
| P Slayer | Sports opinion assigned |
| Anthony | Sports beat assigned |
| Hal Richmond | Dynasty/farewell content |
| Jordan Velez | Business story assigned |
| Maria Keen | Culture story assigned |
| Jax Caldera | Something smells wrong (conditional) |
| Dr. Lila Mezran | Health event (conditional) |
| Letters | Always — runs last, reacts to edition |

### Step 4: Verify Citizens

Read `docs/media/citizen_selection.md` FIRST. It defines how to pick citizens for stories, when to use known versus new citizens, what's canon versus agent color, tier behavior, gender handling, and how many citizens per story type. That file evolves after each cycle.

For every citizen in every story:
- `lookup_citizen(name)` via MCP — confirm they exist, get POP-ID, role, neighborhood, age, gender
- `search_canon(name)` — what has the Tribune published about them before
- Show Mike candidates with real details. Mike picks who fits.

No name goes into an angle brief unverified.

### Step 5: Write Angle Briefs

Read `docs/media/brief_template.md` FIRST. It defines the brief structure, what makes a good brief versus a bad one, word count target (300-500 words), and reference examples. That file evolves after each cycle — it's how briefs get better over time.

Follow the template to write one brief per reporter to `output/reporters/{reporter}/c{XX}_brief.md`.

### Step 6: Create Edition Production Log

Create `output/production_log_edition_c{XX}.md`. This log starts here and write-edition continues it.

Log:
- Step 0: session state (city-hall log exists, sports feed count)
- Step 1: world summary reference
- Step 2: stories picked (table: story, reporter, section tag)
- Step 3: citizens verified (table: citizen, POP-ID, role, neighborhood, story)
- Angle briefs written (list of file paths)

### Step 7: Verify Outputs + Completion Checklist

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
| `output/production_log_edition_c{XX}.md` | Edition production log — started here, continued by write-edition | Step 6 |

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
