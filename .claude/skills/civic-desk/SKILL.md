---
name: civic-desk
description: Write the civic affairs section for an edition using Carmen Delaine and the civic desk reporters.
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
3. Launch the **civic-desk** agent:
   ```
   Prompt: "Write the civic section for Edition {XX}. Your workspace: output/desks/civic/"
   ```
4. Review output at `output/desk-output/civic_c{XX}.md`
   - Verify vote math adds up (9 seats)
   - Check council names and factions
   - Confirm initiative statuses match canon
