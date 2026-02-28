---
name: podcast
description: Generate a podcast episode from a published edition. Standalone version — can run independently of the write-edition pipeline.
---

# /podcast — Generate a Podcast Episode

## Usage
`/podcast [cycle] [format]`
- cycle: cycle number (e.g., 84)
- format: morning_edition (default), postgame, debrief

## What This Does
1. Reads the published edition for the given cycle
2. Selects hosts based on the format and edition content
3. Launches the podcast-desk agent to write a conversation transcript
4. Renders the transcript to audio via Podcastfy
5. Saves MP3 to `output/podcasts/`

## Steps

### Step 1: Find the Edition
Look for the edition file:
- Main edition: `editions/cycle_pulse_edition_{cycle}.txt`
- Supplemental: `editions/supplemental_*_c{cycle}.txt`

If neither exists, stop. Can't podcast an edition that doesn't exist.

### Step 2: Select Format and Hosts
Read `docs/media/podcast/SHOW_FORMATS.md` for format details.

**Morning Edition:** Pick two citizen hosts. Check the edition's CITIZEN USAGE LOG for candidates. Select hosts with contrasting perspectives relevant to the lead story. Present host picks to user for approval.

**Postgame:** Hosts are P Slayer and Anthony. No selection needed.

**Debrief:** Hosts are Mags and Hal. No selection needed.

### Step 3: Launch Podcast Desk Agent
Follow the launch protocol in `.claude/skills/podcast-desk/SKILL.md`:
- Assemble inputs (edition content, civic voice statements, show format, host assignments)
- Launch the podcast-desk agent via Task tool
- Collect the transcript from `output/podcasts/c{cycle}_transcript.txt`

### Step 4: Review Transcript
Show the user a preview — first 10-15 exchanges. Ask if they want to render audio or adjust the script.

### Step 5: Render Audio
Run: `node scripts/renderPodcast.js {cycle} {format}`

### Step 6: Report
```
PODCAST COMPLETE — Edition {cycle}
  Format: {format name}
  Hosts: {Host 1} + {Host 2}
  Transcript: output/podcasts/c{cycle}_transcript.txt ({X} exchanges)
  Audio: output/podcasts/c{cycle}_{format}.mp3 ({X} MB, ~{X} minutes)
```
