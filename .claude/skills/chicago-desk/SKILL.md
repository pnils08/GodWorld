---
name: chicago-desk
description: Write the Chicago bureau section using Selena Grant and Talia Finch.
version: "1.0"
updated: 2026-04-17
tags: [media, active]
effort: high
disable-model-invocation: true
---

# /chicago-desk — Write Chicago Section

## Usage
`/chicago-desk [cycle-number]`

## Steps
1. Confirm cycle number. Read `output/desk-packets/manifest.json` to verify packets exist.
2. If `output/desks/chicago/current/briefing.md` doesn't exist, run:
   ```bash
   node scripts/buildDeskFolders.js {cycle}
   ```
3. Launch the **chicago-desk** agent with `model: "sonnet"` (complex desk — dual-city narrative, Paulson thread, neighborhood texture):
   ```
   Prompt: |
     Write the Chicago section for Edition {XX}.
     Your workspace: output/desks/chicago/

     THINK BEFORE WRITING: Before drafting any article, reason through:
     - Where is the Paulson thread? (read archive/ and your MEMORY.md)
     - What happened with the Bulls this cycle? (check packet for scores/records)
     - What's the Bridgeport neighborhood feeling? (check domain data)
     - Read previous_grades.md and exemplar.md if they exist — learn from them.

     READ your briefing.md and packet FIRST. Write FROM the data — Chicago satellite
     data, Bulls/Bears results, and bureau-specific context all come from the packet.
     The packet contains real simulation output for this cycle.

     Available in your workspace (v3.9):
     - briefing.md — story priorities, returning citizens, canon notes, errata
     - Desk packet — Chicago satellite data, sports results, world events, arcs
     - base_context.json — calendar date, weather, cycle number
     - Past desk output — last 3 editions for continuity
     - Truesource reference data

     Your job: cover Chicago THIS cycle through the Skyline Tribune bureau. Use real
     game results, named athletes, and actual standings from the packet. Write Chicago
     weather and setting, not Oakland. Include at least one Talia Finch piece.
   ```
4. Review output at `output/desk-output/chicago_c{XX}.md`
   - Verify Bulls player names (no real NBA name leaks)
   - Check Chicago weather used, not Oakland
   - Confirm at least one Talia piece
