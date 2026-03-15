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
   Prompt: "Write the Chicago section for Edition {XX}. Your workspace: output/desks/chicago/"
   ```
4. Review output at `output/desk-output/chicago_c{XX}.md`
   - Verify Bulls player names (no real NBA name leaks)
   - Check Chicago weather used, not Oakland
   - Confirm at least one Talia piece
