---
name: letters-desk
description: Write the letters to the editor section with citizen voices.
---

# /letters-desk — Write Letters Section

## Usage
`/letters-desk [cycle-number]`

## Steps
1. Confirm cycle number. Read `output/desk-packets/manifest.json` to verify packets exist.
2. If `output/desks/letters/current/briefing.md` doesn't exist, run:
   ```bash
   node scripts/buildDeskFolders.js {cycle}
   ```
3. Launch the **letters-desk** agent:
   ```
   Prompt: "Write the letters section for Edition {XX}. Your workspace: output/desks/letters/"
   ```
4. Review output at `output/desk-output/letters_c{XX}.md`
   - Verify citizen names against canon
   - Check rest cycle compliance
   - Confirm topic diversity (no two letters on same storyline)
