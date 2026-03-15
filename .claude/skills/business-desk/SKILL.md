---
name: business-desk
description: Write the business ticker section using Jordan Velez.
---

# /business-desk — Write Business Section

## Usage
`/business-desk [cycle-number]`

## Steps
1. Confirm cycle number. Read `output/desk-packets/manifest.json` to verify packets exist.
2. If `output/desks/business/current/briefing.md` doesn't exist, run:
   ```bash
   node scripts/buildDeskFolders.js {cycle}
   ```
3. Launch the **business-desk** agent:
   ```
   Prompt: "Write the business section for Edition {XX}. Your workspace: output/desks/business/"
   ```
4. Review output at `output/desk-output/business_c{XX}.md`
   - Verify no raw engine metrics in text
   - Check venue names against Cultural_Ledger
