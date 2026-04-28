---
name: podcast
description: Generate a podcast episode from a published edition — two-host dialogue transcript, optional audio render via Voicebox.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: medium
disable-model-invocation: true
argument-hint: "[cycle-number] [format]"
---

# /podcast — Generate a Podcast Episode

## Usage
`/podcast [cycle] [format]`
- cycle: cycle number (e.g., 91)
- format: morning_edition (default), postgame, debrief

## The Principle

The podcast is the edition heard, not read. Two hosts react to what happened in the world this cycle — the stories, the people, the texture. They're not reading articles aloud. They're having a conversation about the city.

Mags decides when to produce a podcast. Not every edition gets one.

## Prerequisites
- Edition published at `editions/cycle_pulse_edition_{XX}.txt`
- World summary exists: `output/world_summary_c{XX}.md`
- Media production log exists: `output/production_log_edition_c{XX}.md`
- Civic production log exists: `output/production_log_city_hall_c{XX}.md` (if civic content matters)

## Step 0: Production Log

Read the existing media production log: `output/production_log_edition_c{XX}.md`. Append a new section:

```markdown
## Podcast: {format}
**Started:** {timestamp}
**Format:** {Morning Edition / Postgame / Debrief}
**Hosts:** {Host 1} + {Host 2}
**Status:** IN PROGRESS

### Transcript
[filled in at Step 3]

### Audio
[filled in at Step 5 — Phase 30 pending]
```

## Step 1: Select Format and Hosts

Read `docs/media/podcast/SHOW_FORMATS.md` for format details.

| Format | Hosts | When to use |
|--------|-------|-------------|
| **Morning Edition** | Two citizen hosts | Default — full edition review from citizen perspectives |
| **Postgame** | P Slayer + Anthony | After a big sports cycle — game results, roster moves |
| **Debrief** | Mags + Hal | When the edition needs editorial reflection |

**Morning Edition host selection:**
- Check the edition's CITIZEN USAGE LOG for candidates
- Look up citizen details via MCP: `lookup_citizen(name)` (combines world-data card + bay-tribune appearances). See [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix.
- Select hosts with contrasting perspectives relevant to the lead story
- Present host picks to Mike for approval

## Step 2: Assemble Inputs

The podcast agent gets:

1. **Edition content** — first 3000-5000 words of the published edition (headlines, ledes, key details)
2. **World summary** — `output/world_summary_c{XX}.md` — the texture the hosts would notice: famous sightings, food, nightlife, weather, streaming, events
3. **Civic voice statements** — relevant quotes from `output/civic-voice/*_c{XX}.json` (if civic content matters)
4. **Show format** — from SHOW_FORMATS.md
5. **Host assignments** — Name, Age, Neighborhood, Occupation, Perspective for each host

**Do NOT embed the full edition.** 3000-5000 words is enough. The agent can Read the full file if it needs deeper quotes.

**No calendar dates.** Cycle references only.

## Step 3: Launch Podcast Agent

Launch using the podcast-desk subagent:

```
subagent_type: podcast-desk

prompt: |
  Write a podcast transcript for Edition {XX}.

  **SHOW FORMAT**
  {format section from SHOW_FORMATS.md}

  **HOST ASSIGNMENTS**
  Host 1 (Person1): {Name}, {Age}, {Neighborhood}, {Occupation}. {Perspective}.
  Host 2 (Person2): {Name}, {Age}, {Neighborhood}, {Occupation}. {Perspective}.

  **EDITION HIGHLIGHTS**
  {first 3000-5000 words — headlines, ledes, key details}

  **WORLD TEXTURE** (from world summary — the stuff hosts notice)
  {Famous people spotted, evening food, nightlife, city events, weather, streaming}

  **CIVIC DECISIONS** (if relevant)
  {key quotes from voice agent output}

  Cycle: {XX}

  Write the transcript to output/podcasts/c{XX}_transcript.txt
  Use <Person1> and <Person2> tags for dialogue.
```

## Step 4: Review Transcript

Show Mike a preview — first 10-15 exchanges. Check:
- Do hosts sound like real people, not article summaries?
- Do they reference the world texture (food, weather, sightings)?
- Any calendar dates? (should be cycle references)
- Any engine language?
- Does the conversation flow naturally — disagreements, humor, personal reactions?

Mike approves or adjusts.

## Step 5: Render Audio (when Phase 30 is built)

**Current state:** Audio rendering not available. Phase 30 (Voicebox) will provide:
- Different voice profiles per host
- Multi-track composition
- Expressive tags ([sigh], [laugh], [gasp])
- REST API on localhost:17493
- Export to MP3/WAV

**When Phase 30 is ready:**
```bash
node scripts/renderPodcast.js {cycle} {format}
```

**For now:** The transcript IS the deliverable. Save to `output/podcasts/c{XX}_transcript.txt`.

## Step 5.5: Ingest to bay-tribune

The podcast is canon — citizen voices reacting to the edition. Post-publish has already run by this point, so podcast handles its own ingest.

```bash
cp output/podcasts/c{XX}_transcript.txt /tmp/podcast_edition_{XX}.txt
node scripts/ingestEdition.js /tmp/podcast_edition_{XX}.txt
```

**Known issue:** `ingestEdition.js` filename pattern expects edition format. Copy with detectable name as workaround. Future: podcast-aware ingest path so searches distinguish edition text from podcast transcript.

## Step 6: Report

```
PODCAST — Edition {XX}
  Format: {format name}
  Hosts: {Host 1} + {Host 2}
  Transcript: output/podcasts/c{XX}_transcript.txt ({X} exchanges)
  Ingested: bay-tribune [doc ID]
  Audio: [not available — Phase 30 pending]
```

## What This Skill Does NOT Do

- **Write journalism** — the podcast reacts to published content, it doesn't create news
- **Run automatically** — Mags decides when an edition warrants a podcast
- **Generate audio yet** — waiting for Phase 30 (Voicebox). Transcript only for now.
