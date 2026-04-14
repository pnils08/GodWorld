---
name: write-edition
description: Execute the edition from sift output. Launch reporters, review articles, compile, validate, Mara audit, publish. Mechanical when sift is right.
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /write-edition — Edition Execution

## Usage
`/write-edition [cycle-number]`

## The Principle

Sift did the editorial work — stories picked, reporters assigned, citizens verified, briefs on disk. This skill executes. Launch reporters, review what they write, compile the edition, validate, get Mara's approval, publish.

If sift is right, this is mechanical.

## Prerequisites

Verify these exist before starting:
- `output/production_log_edition_c{XX}.md` — from `/sift` (has story picks, assignments, citizen table, brief paths)
- `output/reporters/{reporter}/c{XX}_brief.md` — angle briefs from `/sift` (one per assigned reporter)

If either is missing, `/sift` didn't complete. Don't proceed.

## Rules
- **Reporters read their brief + IDENTITY.md. Nothing else.** No world summary, no city-hall log, no sheet queries.
- **No calendar dates.** Cycles, not months.
- **Story-driven layout.** No fixed sections to fill. No filler.
- **Every citizen name was verified in sift.** If a reporter introduces a new name not in the brief, flag it.

## Step 1: Launch Reporter Agents

Read the production log for assignments. Launch each reporter with direct editorial direction.

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
1. P Slayer, Anthony, Hal first — sports stories
2. Carmen, Jordan, Maria in parallel — civic/business/culture
3. Jax and Mezran if assigned — conditional
4. Letters LAST — needs to know what others covered

**Output:** Each reporter writes to `output/reporters/{reporter}/articles/`.

**Update production log** with reporter results table (reporter, articles, status).

## Step 2: Read Every Article

Before compiling, Mags reads every article. Not a scan — a read. Check:
- Did the agent follow the angle brief?
- Are citizen names correct? (verify any you're unsure of via MCP)
- Does the voice match the reporter?
- Any fabricated facts, stats, game results?
- Any calendar dates that should be cycle references?
- Any engine language?
- Any names not in the brief? (hallucination flag)

Flag problems. Fix what's fixable. Cut what's broken. Better to have 8 clean articles than 13 with canon violations.

**Update production log** with editorial review (articles passed, cut, fixes applied).

## Step 3: Compile

The edition is story-driven, not section-driven.

1. Take all articles that passed review
2. Order by what's most worth reading — front page was picked in sift, but may change if an article exceeded expectations
3. Label each with its section tag from sift assignments
4. If a section has no story this cycle, it doesn't appear

**Edition format:**

```
============================================================
THE CYCLE PULSE — EDITION {XX}
Bay Tribune | Cycle {XX} | [Holiday/Season if applicable]
Weather: [from world summary] | City Mood: [from world summary]
============================================================

FRONT PAGE — [best story]
EDITOR'S DESK — Mags, 150-250 words

[STORIES — ordered by quality, tagged by section]

LETTERS TO THE EDITOR
ARTICLE TABLE
CITIZEN USAGE LOG
STORYLINES UPDATED
COMING NEXT EDITION
END EDITION
```

Save to `editions/cycle_pulse_edition_{XX}.txt`.

**Show compiled edition to Mike.** This is his review point.

**Update production log** with compile details (front page, total articles, edition path).

## Step 4: Validation + Rhea

```bash
node scripts/validateEdition.js editions/cycle_pulse_edition_{XX}.txt
```

Fix CRITICALs. Then launch Rhea.

Rhea has scoped Bash access — dashboard API (localhost:3001), Supermemory (bay-tribune + world-data), world summary. She's a real verifier with live data access.

- PASS (score >= 75, zero CRITICALs) → proceed
- REVISE → fix and rerun, max 2 rounds

**Update production log** with validation results (validator flags, Rhea score, fixes).

## Step 5: Mara Audit (External)

Mara is on claude.ai with her own Supermemory access. She searches canon herself.

1. Upload edition to Drive: `node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt mara`
2. Tell Mike the edition is ready for Mara
3. Mike takes it to Mara on claude.ai
4. Mara reads, searches, comes back with corrections
5. Mike brings corrections back — apply them

**STOP. Wait for Mara.**

**USER APPROVAL GATE — Mike says publish or doesn't.**

**Update production log** with Mara verdict and corrections.

## Step 6: Publish

```bash
# Save edition to Drive
node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt edition

# Ingest to bay-tribune canon
node scripts/ingestEdition.js editions/cycle_pulse_edition_{XX}.txt
```

**Update production log** with Drive file ID and ingest confirmation. Canon status: LIVE.

## Handoff

After publish, two separate skills pick up:

| Skill | What it does | When |
|-------|-------------|------|
| `/edition-print` | Photos (DJ Hartley), PDF, Drive upload of print assets | After publish, separate terminal |
| `/post-publish` (planned) | Coverage ratings, wiki ingest, newsroom memory update, filing check, criteria file updates | After publish, closes the feedback loop |

## Output Files

| File | Purpose | Created by |
|------|---------|------------|
| `output/reporters/{reporter}/articles/*.md` | Reporter articles | Step 1 |
| `editions/cycle_pulse_edition_{XX}.txt` | Published edition | Step 3 |
| `output/production_log_edition_c{XX}.md` | Continued from sift — reporter results, review, compile, validation, Mara, publish added | Steps 1-6 |

## Legacy Reference

These elements were part of the old write-edition (pre-S144) and are now handled by other skills:

- **World summary build** → `/build-world-summary`
- **Story picks and sifting** → `/sift`
- **Citizen verification** → `/sift` Step 4
- **Angle brief writing** → `/sift` Step 5
- **Production log creation** → `/sift` Step 2
- **Desk packet building** → legacy scripts preserved, not in pipeline
- **Voice workspace building** → `/city-hall-prep`

## Where This Sits

After `/sift`. Before `/edition-print` and `/post-publish`.

Full chain: `/run-cycle` → `/city-hall-prep` → `/city-hall` → `/sift` → `/write-edition` → `/edition-print` + `/post-publish`
