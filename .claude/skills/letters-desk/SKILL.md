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
   Prompt: |
     Write the letters section for Edition {XX}.
     Your workspace: output/desks/letters/

     READ your briefing.md and packet FIRST. Write FROM the data — citizen spotlights,
     neighborhood dynamics, active storylines, and civic context all come from the
     packet. The packet contains real simulation output for this cycle.

     Available in your workspace (v3.9):
     - briefing.md — story priorities, returning citizens, canon notes, errata
     - Desk packet — citizen spotlight detail (named citizens with life events),
       neighborhood dynamics, civic context, active arcs, cycle summary
     - base_context.json — calendar date, weather, cycle number
     - Past desk output — last 3 editions for continuity
     - Interview transcripts (if available)
     - Truesource reference data

     Your job: write letters from Oakland citizens reacting to THIS cycle's events.
     Use named citizens from the spotlight or interview pool — real POPIDs, real
     neighborhoods, real occupations from the packet. Each letter should respond to
     a different storyline or event. Do not invent citizens.
   ```
4. Review output at `output/desk-output/letters_c{XX}.md`
   - Verify citizen names against canon
   - Check rest cycle compliance
   - Confirm topic diversity (no two letters on same storyline)
