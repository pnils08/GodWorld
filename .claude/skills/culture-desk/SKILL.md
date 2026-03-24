---
name: culture-desk
description: Write the culture and seasonal section using Maria Keen and the culture desk reporters.
effort: medium
disable-model-invocation: true
---

# /culture-desk — Write Culture Section

## Usage
`/culture-desk [cycle-number]`

## Steps
1. Confirm cycle number. Read `output/desk-packets/manifest.json` to verify packets exist.
2. If `output/desks/culture/current/briefing.md` doesn't exist, run:
   ```bash
   node scripts/buildDeskFolders.js {cycle}
   ```
3. Launch the **culture-desk** agent with `model: "haiku"` (routine desk — venue coverage, seasonal texture, lower complexity):
   ```
   Prompt: |
     Write the culture section for Edition {XX}.
     Your workspace: output/desks/culture/

     Read previous_grades.md and exemplar.md if they exist — learn from past performance.

     READ your briefing.md and packet FIRST. Write FROM the data — evening city
     venues, neighborhood vibes, food trends, cultural events, and seasonal details
     all come from the packet. The packet contains real simulation output for this cycle.

     Available in your workspace (v3.9):
     - briefing.md — story priorities, returning citizens, canon notes, errata
     - Desk packet — evening city data (nightlife spots, restaurants, crowd energy,
       food trends), neighborhood dynamics, cultural entities, city events,
       spotlight citizens, cycle summary
     - base_context.json — calendar date, weather, cycle number
     - Past desk output — last 3 editions for continuity
     - Interview transcripts (if available)
     - Truesource reference data

     Your job: cover Oakland's cultural life THIS cycle. Use real venue names,
     neighborhood-specific details, and seasonal context from the packet. The evening
     city data tells you what's happening on the streets — write from that, not from
     generic Oakland color. Quote citizens from the interview pool.
   ```
4. Review output at `output/desk-output/culture_c{XX}.md`
   - Verify cultural entity names from packet
   - Check neighborhood names are valid
   - Confirm no phantom citizens
