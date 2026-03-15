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
   Prompt: "Write the sports section for Edition {XX}. Your workspace: output/desks/sports/"
   ```
4. Review output at `output/desk-output/sports_c{XX}.md`
   - Verify player names against roster
   - Check team records
   - Confirm no invented stats
