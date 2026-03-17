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
3. Launch the **business-desk** agent with `model: "haiku"` (routine desk — business ticker, economic data translation):
   ```
   Prompt: |
     Write the business section for Edition {XX}.
     Your workspace: output/desks/business/

     Read previous_grades.md and exemplar.md if they exist — learn from past performance.

     READ your briefing.md and packet FIRST. Write FROM the data — neighborhood
     economies, employment shifts, migration patterns, and business activity all
     come from the packet. The packet contains real simulation output for this cycle.

     Available in your workspace (v3.9):
     - briefing.md — story priorities, returning citizens, canon notes, errata
     - Desk packet — neighborhood economies, demographic shifts, migration data,
       economic summary, employment trends, spotlight citizens, cycle summary
     - base_context.json — calendar date, weather, cycle number
     - Past desk output — last 3 editions for continuity
     - Interview transcripts (if available)
     - Truesource reference data

     Your job: cover Oakland's business and economic life THIS cycle. Use real
     neighborhood economic data, employment shifts, and migration patterns from the
     packet. Translate engine numbers into street-level business stories. Quote
     citizens from the interview pool. Do not invent business names or metrics.
   ```
4. Review output at `output/desk-output/business_c{XX}.md`
   - Verify no raw engine metrics in text
   - Check venue names against Cultural_Ledger
