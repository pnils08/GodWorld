---
name: civic-desk
description: Write the civic affairs section for an edition using Carmen Delaine and the civic desk reporters.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: high
disable-model-invocation: true
---

# /civic-desk — Write Civic Affairs Section

## Usage
`/civic-desk [cycle-number]`

## Steps
1. Confirm cycle number. Read `output/desk-packets/manifest.json` to verify packets exist.
2. If `output/desks/civic/current/briefing.md` doesn't exist, run:
   ```bash
   node scripts/buildDeskFolders.js {cycle}
   ```
3. Launch the **civic-desk** agent with `model: "sonnet"` (complex desk — council votes, initiative logic, faction dynamics require reasoning):
   ```
   Prompt: |
     Write the civic section for Edition {XX}.
     Your workspace: output/desks/civic/

     THINK BEFORE WRITING: Before drafting any article, reason through:
     - What changed this cycle vs last? (read past output in archive/)
     - Which storylines advanced and which stalled?
     - What do the vote numbers actually mean? (count all 9 seats)
     - Which citizens from the packet have stories worth telling?
     - Read previous_grades.md and exemplar.md if they exist — learn from them.

     READ your briefing.md and packet FIRST. Write FROM the data — council votes,
     initiative statuses, neighborhood dynamics, and civic load all come from the
     packet. The packet contains real simulation output for this cycle.

     Available in your workspace (v3.9):
     - briefing.md — story priorities, returning citizens, canon notes, errata
     - Desk packet — civic data, neighborhood dynamics, shock context, civic load,
       initiative updates, demographic shifts, migration patterns
     - Voice statements — Mayor decisions, faction reactions (in civic-voice/ files)
     - base_context.json — calendar date, weather, cycle number
     - Past desk output — last 3 editions for continuity
     - Interview transcripts (if available)
     - Truesource reference data

     Your job: cover what happened in Oakland civic life THIS cycle. Use real council
     votes, named officials, actual initiative statuses from the packet. Neighborhood
     dynamics and shock context give you local angles beyond City Hall. Quote citizens
     from the interview pool. Do not default to generic policy summaries.
   ```
4. Review output at `output/desk-output/civic_c{XX}.md`
   - Verify vote math adds up (9 seats)
   - Check council names and factions
   - Confirm initiative statuses match canon
