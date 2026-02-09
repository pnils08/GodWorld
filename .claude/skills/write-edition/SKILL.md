---
name: write-edition
description: Run the complete Cycle Pulse edition production pipeline — 6 desk agents, compile, verify, Mara audit.
---

# /write-edition — Full Edition Production Pipeline

## Usage
`/write-edition [cycle-number]`
- Runs the complete Cycle Pulse edition production
- Launches all 6 desk agents in parallel, then compiles

## Rules
- Read SESSION_CONTEXT.md FIRST
- This is the master pipeline — it orchestrates all 6 desk skills
- Show the user a plan before launching agents
- Get approval before compiling the final edition

## Prerequisites
Before running this skill, the user should have already:
1. Run the engine cycle (`/run-cycle` or manually)
2. Built desk packets: `node scripts/buildDeskPackets.js [cycle]`
3. Written a Mara directive (optional but recommended for civic desk)

Check that `output/desk-packets/manifest.json` exists for this cycle.

## Step 1: Verify Desk Packets
1. Read `output/desk-packets/manifest.json` — confirm all 6 packets exist
2. Read `output/desk-packets/base_context.json` — get cycle number, calendar, weather
3. Confirm the cycle number matches what the user expects
4. Show the user what's available:

```
EDITION [XX] — DESK PACKETS READY
  [x] civic_c80.json (37KB) — 12 events, 4 storylines, Mara directive included
  [x] sports_c80.json (21KB) — 3 events, A's roster loaded
  [x] culture_c80.json (48KB) — 18 events, 8 cultural entities
  [x] business_c80.json (10KB) — 4 events, nightlife data
  [x] chicago_c80.json (13KB) — 5 events, Bulls roster loaded
  [x] letters_c80.json (65KB) — all-domain access

Ready to launch 6 desk agents in parallel?
```

## Step 2: Launch All 6 Desks in Parallel
Use the Task tool to launch 6 agents simultaneously. Each agent gets:
- The desk-specific skill instructions (from the individual desk skills)
- The desk packet JSON
- The base_context.json
- The reporter voice profile(s) from bay_tribune_roster.json

Launch these agents in parallel (all in one message):
1. **Civic Desk** — Carmen Delaine (lead), follows /civic-desk skill
2. **Sports Desk** — P Slayer + Anthony, follows /sports-desk skill
3. **Culture Desk** — Maria Keen (lead), follows /culture-desk skill
4. **Business Desk** — Jordan Velez, follows /business-desk skill
5. **Chicago Bureau** — Selena Grant + Talia Finch, follows /chicago-desk skill
6. **Letters Desk** — citizen voices, follows /letters-desk skill

Each agent writes articles + engine returns for their section.

## Step 3: Compile (Mags Corliss Role)
After all 6 agents return, compile the full edition:

1. **Call front page** — Which desk produced the strongest lead story?
   - Show the user a summary of each desk's output
   - Recommend a front page pick but let the user decide
2. **Assemble in template order:**
   - HEADER (from base_context)
   - FRONT PAGE (strongest story)
   - CIVIC AFFAIRS
   - BUSINESS
   - CULTURE / SEASONAL — OAKLAND
   - SPORTS — OAKLAND
   - SKYLINE TRIBUNE — CHICAGO BUREAU
   - LETTERS TO THE EDITOR
   - ARTICLE TABLE (merged from all desks)
   - STORYLINES UPDATED (merged, deduped)
   - CITIZEN USAGE LOG (merged, grouped by category)
   - CONTINUITY NOTES (merged)
   - END EDITION

3. **Show the compiled edition to the user for review**

## Step 4: Verification (Rhea Morgan Role)
Run a verification pass:
- Cross-check all citizen names against desk packet canon data
- Verify team records and roster names
- Check for duplicate citizens across desks
- Flag any engine jargon that leaked into article text
- Verify article count and total word count

Show issues found (if any) and recommended fixes.

## Step 5: Save Edition
After user approval:
1. Save to `editions/cycle_pulse_edition_{XX}.txt`
2. If corrections needed, save as `_v2.txt` after fixes
3. Show the user the file path and total stats:
   - Article count
   - Total word count
   - New canon figures introduced
   - Citizen usage count

## Step 6: Intake (Optional)
Ask if the user wants to run the intake pipeline now:
```
node scripts/editionIntake.js editions/cycle_pulse_edition_{XX}.txt --dry-run
```
If dry-run looks good:
```
node scripts/editionIntake.js editions/cycle_pulse_edition_{XX}.txt
node scripts/processIntake.js [cycle]
```

## Desk Summary
| Desk | Lead | Articles | Packet |
|------|------|----------|--------|
| Civic | Carmen Delaine | 2-4 | civic_c{XX}.json |
| Sports | P Slayer / Anthony | 2-5 | sports_c{XX}.json |
| Culture | Maria Keen | 2-4 | culture_c{XX}.json |
| Business | Jordan Velez | 1-2 | business_c{XX}.json |
| Chicago | Selena Grant / Talia Finch | 2-3 | chicago_c{XX}.json |
| Letters | (citizen voices) | 2-4 | letters_c{XX}.json |

## Edition Template Reference
See `editions/CYCLE_PULSE_TEMPLATE.md` for exact section format, canon rules, and return formats.
