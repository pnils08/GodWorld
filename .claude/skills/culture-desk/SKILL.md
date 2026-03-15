---
name: culture-desk
description: Write the culture and seasonal section using Maria Keen and the culture desk reporters.
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
3. Launch the **culture-desk** agent:
   ```
   Prompt: "Write the culture section for Edition {XX}. Your workspace: output/desks/culture/"
   ```
4. Review output at `output/desk-output/culture_c{XX}.md`
   - Verify cultural entity names from packet
   - Check neighborhood names are valid
   - Confirm no phantom citizens
