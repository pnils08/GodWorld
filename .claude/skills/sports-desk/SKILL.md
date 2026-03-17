---
name: sports-desk
description: Write the Oakland sports section using P Slayer, Anthony, and Hal Richmond.
---

# /sports-desk — Write Oakland Sports Section

## Usage
`/sports-desk [cycle-number]`

## Steps
1. Confirm cycle number. Read `output/desk-packets/manifest.json` to verify packets exist.
2. If `output/desks/sports/current/briefing.md` doesn't exist, run:
   ```bash
   node scripts/buildDeskFolders.js {cycle}
   ```
3. Launch the **sports-desk** agent:
   ```
   Prompt: |
     Write the sports section for Edition {XX}.
     Your workspace: output/desks/sports/

     READ your briefing.md and packet FIRST. Write FROM the data — scores, records,
     player performances, standings, and storylines come from the packet, not from
     general knowledge. The packet contains real simulation output for this cycle.

     Available in your workspace (v3.9):
     - briefing.md — story priorities, returning citizens, canon notes, errata
     - Desk packet — sports data, world events, active arcs, cycle summary
     - base_context.json — calendar date, weather, cycle number
     - Past desk output — last 3 editions for continuity
     - Interview transcripts (if available)
     - Truesource reference data

     Your job: cover what happened in Oakland sports THIS cycle. Use named athletes,
     real scores, actual standings from the packet. Quote citizens from the interview
     pool. Do not invent stats or outcomes.
   ```
4. Review output at `output/desk-output/sports_c{XX}.md`
   - Verify player names against roster
   - Check team records
   - Confirm no invented stats
