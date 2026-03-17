---
name: chicago-desk
description: Write the Chicago bureau section using Selena Grant and Talia Finch.
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
3. Launch the **chicago-desk** agent:
   ```
   Prompt: |
     Write the Chicago section for Edition {XX}.
     Your workspace: output/desks/chicago/

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
