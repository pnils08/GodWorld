---
name: desk-slice
description: Fork-path curation step (pipeline.44). Mags-as-EIC reads the cycle (world summary + city-hall) and writes one desk slice per running desk — territory, storylines, attached citizens, assigned journalist, pointers. No briefs, no story authoring. Run after /city-hall; /deep-dispatch consumes the slices.
version: "1.0"
updated: 2026-07-11
tags: [media, pipeline-44, fork, active]
effort: low
disable-model-invocation: true
argument-hint: "[cycle-number]"
related_skills: [deep-dispatch, city-hall, build-world-summary]
sources:
  - docs/research/2026-07-11-desk-slice-fork.md — the one-doc (design + Task 1 charge-format rules)
  - docs/media/examples/charge_brief_c100_civic_exemplar.md — the shape the slice feeds
---

# /desk-slice — Per-Desk Slice Prep (fork path)

## The Principle

This is the fork's sift. Mags curates her newsroom — she does NOT author stories, build briefs, or assemble citizen tables. She reads what the cycle produced, decides what's alive per desk, and hands each desk its **whole territory** with the people living it attached. Everything downstream (angle, subject pick within the slice, treatment) belongs to the desk (`/deep-dispatch`).

**Cheap by design.** If a step feels like story-writing, it's the desk's job — stop and move on. The S272 lesson: one desk holding its whole territory finds seams that pre-split angles walk past.

**This skill exists because world summary doesn't carry city-hall.** Mags is the one seat that reads both.

## Prerequisites

- `output/world_summary_c{XX}.md` — cycle ground truth. Missing → stop (`/build-world-summary` didn't run).
- City-hall output: `## /city-hall` section of `output/production_log_c{XX}.md` (or the cycle's city-hall log). Missing → stop.
- This is the FORK path (pipeline.44). Do not run `/sift` for the same cycle's fork lane — the frozen edition path keeps `/sift`; this replaces it here.

## Step 1: Mags page recall (EIC conditioning)

```bash
node scripts/magsPageRecall.js --cycle={XX} --mark --context="<one-line cycle shape from world summary>"
```

Read-conditioning only; fenced output, never quoted as fact. Fail-open — a missing block never blocks the run. (`--mark` belongs to the sift-equivalent EIC moment — that is this skill on the fork lane.)

## Step 2: Read the cycle

Mags reads, in order:
1. `output/world_summary_c{XX}.md` — the cycle.
2. City-hall section — decisions, votes, voices (world summary lacks these).
3. `output/engine_anomalies_c{XX}.json` — every `cover-as-story` item. **These are events citizens lived (bug-is-event); they must land in some desk's slice. Never scrub one as an artifact.**
4. `Story_Seed_Deck` content rows + open tension register (`logs/citizen-tension-state.json`) — candidate texture; tensions are subjective seeds, never publishable as fact.
5. `output/desk_signal_c{XX}.json` — the engine's pre-sorted per-desk lane index (pointers only; Mags still reads the sources above — the partition just tells her where each desk's signal lives). Fail-open: if absent, proceed with the reads above.

Mags reads the content; the slices will pass **pointers**. The desk reaches the raw material itself — that gap is what kept the C100 spike a spike (Task 1 forensics, held-rule 1).

## Step 3: Pick territories

For each desk running this cycle (pilot roster: civic + sports; extend by cycle), pick the desk's **top storylines** — 2–4 per desk:

- **Whole territory, not pre-split angles.** Name what's alive; don't prescribe the take.
- Entities are the stories; events are rare. A storyline is usually a person/place/program under pressure across cycles, not a single incident.
- Every `cover-as-story` anomaly gets a home desk.
- A storyline may sit in two desks' slices ONLY if their lanes genuinely differ (the LANE sentence is the collision control).

## Step 4: Attach citizens

Per storyline, attach the citizens living it — POP ids verified via MCP `lookup_citizen` (never invent, never trust memory). 1–4 per storyline. These feed `/deep-dispatch`'s quote batch (`citizenVoice --batch --record`), so prefer citizens with DialState (voiced-capable); note the ones without.

## Step 5: Assign the journalist

One journalist per desk run, from the desk's roster (`.claude/agents/REPORTER_DESK_INDEX.md`). The slice names the writer; lane fit is Mags' call (e.g., accountability-shaped civic territory → Carmen, not a milestone-recap voice).

## Step 6: Write the slices

One file per desk: `output/slices/c{XX}/{desk}.md`. Fixed shape:

```markdown
# SLICE — {desk} desk, Cycle {XX}
JOURNALIST: {name}

LANE
{One sentence: the read that is THIS desk's alone — no other desk holds it.}

STORYLINES
## {storyline-name}
{1–2 context lines. What is alive and why now. NO figures — the desk reaches
numbers itself through the pointers.}
CITIZENS: POP-NNNNN {Name} — {one context line} | POP-NNNNN ...

## {storyline-name}
...

POINTERS
- output/engine_anomalies_c{XX}.json — {which items are this desk's}
- output/world_summary_c{XX}.md — cycle ground truth, read first for any stat
- {city-hall log path} — {which decisions/voices are this desk's}
- search_articles "{key}" / "{key}" — continuity, the arc you're writing into
- MCP lookup_citizen / search_canon / search_world; dashboard localhost:3001/api/*

CARRY
{Optional: 1–2 lines of continuity from the desk's own prior artifacts —
search_articles by byline/desk. What this desk said last cycle that this
cycle answers.}
```

**Hard rules:** no figures anywhere in a slice; no prescribed angles; every POP id MCP-verified; every cover-as-story anomaly placed.

## Step 7: Slice table + page note

1. Append to `output/production_log_c{XX}.md` a `## /desk-slice` section: one row per desk — `| Desk | Journalist | Storylines | Citizens attached | Slice path |`.
2. Close the EIC moment on Mags' page:

```bash
node scripts/magsPageAppend.js --cycle={XX} --daypart=SIFT --text="<one honest EIC line about what the cycle is>"
```

Skill ends here. `/deep-dispatch {desk}` picks up each slice. No briefs, no dispatch.json, no agent launches in this skill.

---

## Changelog

- 2026-07-11 — v1.0 (S313, pipeline.44 Task 2). Built from Task 1 forensic rules: whole-territory slices, pointers-not-data, LANE as collision control, bug-is-event placement duty, attached citizens feed the quote batch.
