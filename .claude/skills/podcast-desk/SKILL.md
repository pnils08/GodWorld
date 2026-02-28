---
name: podcast-desk
description: Write a podcast transcript for an edition using the podcast desk agent.
---

# /podcast-desk — Produce a Podcast Episode

## Usage
Called by `/write-edition` (Step 5.06) or standalone via `/podcast [cycle] [format]`.

## Rules
- The edition must be compiled and verified BEFORE the podcast desk runs
- The podcast desk consumes published content — it does NOT write journalism
- Mags decides when to produce a podcast. Not every edition gets one.
- Show format must be selected before launching the agent

## Input Assembly

Before launching the podcast-desk agent, assemble these inputs:

### 1. Edition Content
Read the compiled edition from `editions/cycle_pulse_edition_{XX}.txt` or `editions/supplemental_{topic}_c{XX}.txt`.

### 2. Civic Voice Statements (if available)
Read any civic voice output from `output/civic-voice/`:
- `mayor_c{XX}.json`
- `opp_faction_c{XX}.json`
- `crc_faction_c{XX}.json`
- `ind_swing_c{XX}.json`

Embed relevant quotes into the agent prompt.

### 3. Show Format
Read `docs/media/podcast/SHOW_FORMATS.md` and select the appropriate format:
- **The Morning Edition** — full edition review, citizen hosts (default)
- **The Postgame** — sports deep dive, P Slayer + Anthony
- **The Debrief** — editorial review, Mags + Hal

### 4. Host Assignment (Morning Edition only)
For The Morning Edition, select two citizen hosts based on the edition's lead story:
- Check `output/desk-packets/base_context.json` for cycle context
- Pick citizens whose neighborhoods and occupations connect to the stories
- Prefer existing citizens from the edition's CITIZEN USAGE LOG
- Describe each host in the prompt: Name, Age, Neighborhood, Occupation, Perspective

### 5. Base Context
Read `output/desk-packets/base_context.json` for cycle number, calendar date, weather.

## Launch the Agent

Launch using the Task tool:

```
subagent_type: podcast-desk

prompt: |
  Write a podcast transcript for Edition {XX}.

  **PRE-LOADED: SHOW FORMAT**
  {contents of the selected format section from SHOW_FORMATS.md}

  **HOST ASSIGNMENTS**
  Host 1 (Person1): {Name}, {Age}, {Neighborhood}, {Occupation}. {Perspective note}.
  Host 2 (Person2): {Name}, {Age}, {Neighborhood}, {Occupation}. {Perspective note}.

  **EDITION CONTENT**
  {first 3000-5000 words of the compiled edition — enough for lead stories, sports, civic, culture headlines and ledes}

  **CIVIC VOICE STATEMENTS**
  {relevant Mayor/faction quotes, if available}

  **BASE CONTEXT**
  Cycle: {XX} | Date: {month year} | Weather: {weather}

  Write the transcript and save it to output/podcasts/c{XX}_transcript.txt
```

**Token budget note:** Do NOT embed the full edition. Embed the first 3000-5000 words (enough for headlines, ledes, and key details). The agent can Read the full file if it needs deeper quotes.

## After the Agent Returns

1. **Verify transcript exists:** Check `output/podcasts/c{XX}_transcript.txt`
2. **Verify format:** Confirm `<Person1>` and `<Person2>` tags are present and alternating
3. **Render audio:** Run `node scripts/renderPodcast.js c{XX} {format}`
4. **Output:** MP3 at `output/podcasts/c{XX}_{format}.mp3`

## Show the User

```
PODCAST — Edition {XX}
  Format: {The Morning Edition / The Postgame / The Debrief}
  Hosts: {Host 1 Name} + {Host 2 Name}
  Transcript: output/podcasts/c{XX}_transcript.txt
  Audio: output/podcasts/c{XX}_{format}.mp3
  Length: ~{X} exchanges ({estimated minutes})

  Ready to render audio? (requires Podcastfy)
```
