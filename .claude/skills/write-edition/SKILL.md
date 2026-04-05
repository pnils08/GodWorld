---
name: write-edition
description: Produce the Cycle Pulse edition — sift the world, brief the desks, compile, verify, publish. Civic decisions come from city-hall (separate session).
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /write-edition — Edition Production

## Usage
`/write-edition [cycle-number]`

## The Principle

The engine produces a world. Mike produces the sports stories. City-hall produces the civic decisions. This skill turns all of that into a newspaper people want to read.

Mags is the sifter. She reads the engine data, Mike's feed entries, and the city-hall production log. She decides what the paper covers. She writes angle briefs that tell each desk exactly what to write and what citizens to use. She verifies every name against the ledger. She compiles the edition. She is the editor.

The paper covers the WORLD — nightlife, food, sports, famous sightings, weather, neighborhoods, relationships, player arcs, evening texture. Civic decisions are part of the world, not the whole paper.

## Rules
- **Engine data drives the paper.** Read the Riley_Digest, hooks, seeds, evening context, feeds FIRST. That's the world.
- **Mike's feed entries are the sports stories.** Game results, player features, arcs — these are hand-written by Mike. Treat them as gospel.
- **City-hall production log is locked civic canon.** Read it, don't reinterpret it. Civic coverage comes FROM the log.
- **Every citizen name gets verified.** Query the ledger. No exceptions. No guessing roles, ages, or neighborhoods.
- **Atomic topic checkout.** Each story is assigned to ONE desk. No two desks cover the same story.
- **No calendar dates.** The world runs on cycles, not months. No "October 15th." No "last winter." This cycle, last cycle, three cycles ago.

## Prerequisites
1. Engine cycle has been run
2. `/city-hall` has been run in a separate session — `output/production_log_city_hall_c{XX}.md` exists
3. Mike has provided feed entries (game results, player features, arcs) — check the sports feed on the sheet

## Step 0: Production Log

Create `output/production_log_edition_c{XX}.md`:

```markdown
# Edition {XX} Production Log
**Started:** {timestamp}
**Cycle:** {XX}

## Inputs
- City-hall log: [exists/missing]
- Engine data: [cycle weight, key events, evening context summary]
- Mike's feed entries: [list what's there]

## The Sift — What This Edition Covers
[Mags writes this after reading all inputs]

## Topic Assignments
[desk: story — one desk per story]

## Desk Agent Results
[filled in as desks return]

## Compile Notes
[editorial decisions during assembly]

## Quality Notes
[validation, Rhea, Mara]
```

## Step 1: Read the World

Read these in order. No editorial judgment yet — just gather the facts.

**1a. Media production log (resume)**
```
Read: output/production_log_edition_c{XX}.md (if exists)
```
If resuming from a previous session, this tells you where you left off. If starting fresh, create one (Step 0).

**1b. Civic production log (locked canon)**
```
Read: output/production_log_city_hall_c{XX}.md
```
What city-hall decided. Read it once. Don't reinterpret it. This is canon.

**1c. Riley_Digest (past 3 cycles)**
Read C{XX}, C{XX-1}, C{XX-2} from the Riley_Digest sheet. Key data per cycle:
- Cycle weight, events generated, civic load
- Weather, traffic, retail, nightlife, tourism
- Famous people spotted
- Evening food (restaurants, fast food)
- Nightlife (bars, vibe, volume)
- City events
- Evening media (TV, movies, streaming)
- World events (health, civic, safety, faith, sports)
- Demographic shifts

**1d. Oakland Sports Feed (past 3 cycles)**
Read C{XX}, C{XX-1}, C{XX-2} from Oakland_Sports_Feed. These are hand-written by Mike — game results, player features, roster moves, front office decisions, rumors. Every entry is intentional. Treat as gospel.

**1e. Build world summary**
Combine all of the above into a single factual document: `output/world_summary_c{XX}.md`

The world summary is:
- Factual — no editorial judgment, no story picks
- Complete — engine state, sports feed, civic decisions, world events, demographic shifts, three-cycle trends
- Permanent — ingest to world-data Supermemory container after writing
- The thing you and Mike sift from together

Format: see `output/world_summary_c90.md` as the reference template.

**1f. Ingest to world-data**
```bash
npx supermemory add "$(cat output/world_summary_c{XX}.md)" --tag world-data --metadata '{"type": "cycle_summary", "cycle": {XX}}'
```
The world remembers itself. Future cycles can search for what happened in any past cycle.

**1g. Present to Mike**
Show Mike the world summary. This is what you sift from together. No stories picked yet — just the world.

## Step 2: The Sift — Write Angle Briefs

This is the job. After reading all inputs, Mags decides what the paper covers.

Write one angle brief per REPORTER to `output/reporters/{reporter}/c{XX}_brief.md`.

### The 9 Reporters

| Reporter | Agent | Role | Runs when |
|----------|-------|------|-----------|
| Carmen Delaine | `carmen-delaine` | Civic lead | Civic story assigned |
| P Slayer | `p-slayer` | Sports opinion/fan | Sports story assigned |
| Anthony | `anthony` | Sports beat/stats | Sports story assigned |
| Hal Richmond | `hal-richmond` | Sports legacy | Dynasty/farewell content |
| Jordan Velez | `jordan-velez` | Business/economics | Business story assigned |
| Maria Keen | `maria-keen` | Culture/neighborhoods | Culture story assigned |
| Jax Caldera | `jax-caldera` | Freelance accountability | Something smells wrong |
| Dr. Lila Mezran | `lila-mezran` | Health/human cost | Health event in engine data |
| Letters | `letters-desk` | Citizen voices | Always — reacts to the edition |

**Each reporter is one agent, one voice, one identity.** No desk agents juggling multiple voices. Each reporter gets their IDENTITY.md and their angle brief. Nothing else.

**Secondary reporters** (Navarro, Shimizu, Torres, Graye, Marston, Ortega, Reyes, Tan, Cruz) launch ONLY when the sift assigns them a specific story. Most cycles they don't run.

**Chicago bureau** (Selena Grant, Talia Finch) is supplemental-only. When a Chicago storyline matters — Paulson at a Bulls game, a trade connection — it runs as a supplemental, not part of the regular edition. Not every cycle. Not a standing bureau.

### Conditional Agents

- **Jax Caldera:** Only launches when the sift finds a gap — silence on a major issue, contradiction between reporters, a story everyone's avoiding. He asks the question nobody wants asked.
- **Dr. Lila Mezran:** Only launches when the engine produces a health event — crisis spikes, hospital capacity, community health data. She covers the human body the way Maria Keen covers the neighborhood.
- **Letters desk:** Launches LAST — needs to know what other reporters covered so citizens can react.

### Angle Brief Format

**Each brief contains:**
- THE STORY — what this reporter is writing and why
- CITIZENS TO USE — verified names with roles, ages, neighborhoods from the ledger
- WHAT NOT TO COVER — topics assigned to other reporters (atomic checkout)
- SPECIFIC DATA — the feed entries, engine data, or production log quotes relevant to this story only

**Rules for the sift:**
- The engine data comes first. What's the city doing tonight? What happened? Who was out?
- Mike's feed entries come second. What sports stories did he write?
- City-hall production log comes third. What civic decisions need coverage?
- Every name verified against the ledger before it goes in a brief
- Each reporter gets 1-2 stories max
- Topic checkout tracked in the production log

## Step 3: Build Desk Packets + Folders
```bash
node scripts/buildDeskPackets.js {cycle}
node scripts/buildDeskFolders.js {cycle}
```
These scripts build the raw data — packets, summaries, briefings, archives, errata, grades. The angle briefs you wrote in Step 2 go INTO the desk folders alongside this data.

**Verify:** Angle briefs exist in `output/desks/{desk}/current/angle_briefs/` for all active desks.

## Step 4: Launch Reporter Agents

Each reporter is launched individually with direct editorial direction. Do NOT tell agents to "read the packet and decide what to write." Tell them WHAT to write.

**Prompt structure per reporter:**
```
You are [Reporter Name]. Here is your assignment:

ARTICLE — [headline/topic]
[Specific direction from the angle brief — who, what, angle, citizens to use]

Read your IDENTITY.md at [path]. Use ONLY citizens named in this assignment.
Write to [output path]. [word count]. Do NOT spend time reading other files — write.
```

**The E90 lesson:** Agents told what to write produce articles. Agents told to figure it out spend all their tokens reading files and produce nothing.

**Launch order:**
1. P Slayer, Anthony, Hal first — sports stories from Mike's feed entries
2. Carmen, Jordan, Maria in parallel — civic/business/culture
3. Jax and Mezran if assigned — conditional
4. Letters LAST — needs to know what others covered

**Output:** Each reporter writes to `output/reporters/{reporter}/articles/`. One reporter, one folder, one or two articles.

## Step 4.5: Read Every Article

Before compiling, Mags reads every article. Not a scan — a read. Check:
- Did the agent follow the angle brief?
- Are citizen names correct? (verify any you're unsure of)
- Does the voice match the reporter?
- Any fabricated facts, stats, game results?
- Any calendar dates that should be cycle references?
- Any engine language?

Flag problems. Fix what's fixable. Cut what's broken. Better to have 8 clean articles than 13 with canon violations.

## Step 5: Compile

The edition is story-driven, not section-driven. No fixed template with slots to fill. The stories this cycle determine the shape of the paper.

**How it works:**

1. Take all the articles that passed review in Step 4.5
2. Order them by what's most worth reading — the best story leads
3. Label each with its section tag (SPORTS, CIVIC AFFAIRS, CITY LIFE, BUSINESS, FEATURES, etc.)
4. If a section has no story this cycle, it doesn't appear. No filler.
5. Front page is the best story. Could be sports, could be a profile, could be civic. Mike picks.

**Section tags** — labels, not requirements:

| Tag | What goes here |
|-----|---------------|
| SPORTS | Game recaps, player features, roster moves, fan columns |
| CITY LIFE | Nightlife, food, famous sightings, gallery walks, neighborhood texture |
| CIVIC AFFAIRS | Government decisions — from civic production log. Could be 1 article or a 5-line ticker |
| BUSINESS | Economic stories, development, Baylight operational, business ticker |
| FEATURES | Profiles, human interest, long-form |
| HEALTH | Crisis coverage, community health — when Mezran runs |
| ACCOUNTABILITY | Jax piece — when something smells wrong |
| OPINION | P Slayer, editorial columns |
| LETTERS | Citizen reactions |

**Fixed elements** (every edition):

```
============================================================
THE CYCLE PULSE — EDITION {XX}
Bay Tribune | Cycle {XX} | [Holiday/Season if applicable]
Weather: [from engine] | City Mood: [from engine]
============================================================

FRONT PAGE — [best story, Mike picks]
EDITOR'S DESK — Mags, 150-250 words

[STORIES — ordered by quality, tagged by section]

LETTERS TO THE EDITOR
ARTICLE TABLE
CITIZEN USAGE LOG
STORYLINES UPDATED
COMING NEXT EDITION
END EDITION
```

**If this cycle has 4 sports stories, 1 culture piece, and no civic news — that's the paper.** No empty sections. No filler.

**Chicago** is supplemental-only. When a Chicago storyline matters, it runs as a separate supplemental.

**Show compiled edition to Mike.** This is his review point.

## Step 6: Validation + Rhea

```bash
node scripts/validateEdition.js editions/cycle_pulse_edition_{XX}.txt
```

Fix CRITICALs. Then launch Rhea:
- PASS (score >= 75, zero CRITICALs) → proceed
- REVISE → fix and rerun, max 2 rounds

## Step 7: Mara Audit (External)

```bash
node scripts/buildMaraPacket.js {XX} editions/cycle_pulse_edition_{XX}.txt
node scripts/saveToDrive.js output/mara-audit/edition_c{XX}_for_review.txt mara
```

**STOP. Wait for Mara on claude.ai.** Apply corrections when Mike returns with her response.

**USER APPROVAL GATE — Mike says publish or doesn't.**

## Step 8: Publish

```bash
# Save edition
node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt edition

# Ingest to canon
node scripts/ingestEdition.js editions/cycle_pulse_edition_{XX}.txt
```

## Step 9: Post-Publish

1. Write `output/latest_edition_brief.md`
2. Update `docs/mags-corliss/NEWSROOM_MEMORY.md` with errata and editorial notes
3. Restart Discord bot: `pm2 restart mags-bot`
4. Run filing check: `node scripts/postRunFiling.js {XX}`

## What This Skill Does NOT Do

- **Run civic voices or initiative agents** — that's `/city-hall` in a separate terminal
- **Build initiative packets or voice workspaces** — city-hall handles that
- **Decide civic outcomes** — city-hall decided, this skill reports
- **Guess at citizen details** — every name is verified against the ledger
- **Let agents decide what to write** — Mags decides, agents execute
- **Photos, PDFs, or print layout** — that's `/edition-print` in a separate terminal
