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
1. Read `output/desk-packets/manifest.json` — confirm all 6 packets AND 6 summary files exist
2. Read `output/desk-packets/base_context.json` — get cycle number, calendar, weather
3. Confirm the cycle number matches what the user expects
4. Show the user what's available (include both packet and summary sizes):

```
EDITION [XX] — DESK PACKETS READY
  [x] civic_c80.json (235KB) + summary (18KB) — 12 events, 4 storylines, Mara directive
  [x] sports_c80.json (21KB) + summary (12KB) — 3 events, A's roster loaded
  [x] culture_c80.json (48KB) + summary (15KB) — 18 events, 8 cultural entities
  [x] business_c80.json (10KB) + summary (8KB) — 4 events, nightlife data
  [x] chicago_c80.json (13KB) + summary (10KB) — 5 events, Bulls roster loaded
  [x] letters_c80.json (250KB) + summary (16KB) — all-domain access

Ready to launch 6 desk agents in parallel?
```

**If summaries are missing**, run `node scripts/buildDeskPackets.js [cycle]` to regenerate.

## Step 1.5: Compile Newsroom Briefings (Mags as Memory Broker)

Before launching agents, compile per-desk editorial briefings from institutional memory.

1. **Read** `docs/mags-corliss/NEWSROOM_MEMORY.md` — the institutional memory file
2. **Read** the desk summary files (`{desk}_summary_c{XX}.json`) — identify which citizens, initiatives, and storylines each desk will likely cover
3. **Query Supermemory** for citizen cards relevant to each desk's coverage:
   - Use `/super-search` with citizen names, POPIDs, or neighborhoods from the summary
   - Pull narrative context for citizens who will likely be quoted, referenced, or written about
   - Check `docs/media/CITIZEN_NARRATIVE_MEMORY.md` for the 22 foundation POPIDs (Dynasty Five, Bulls core, reporters, civic figures)
   - Focus on citizens in the Mara directive, interview candidates, and active storylines

3b. **Search the Local Drive Archive** (`output/drive-files/`) for relevant past coverage:
   - Grep for key citizens, storylines, or topics each desk will cover
   - For **sports desk**: search `_As Universe Database/` for TrueSource player cards, `_As_Universe_Stats_CSV/` for batting stats
   - For **civic desk**: search `_Tribune Media Archive/Carmen_Delaine/` and `_Tribune Media Archive/Luis_Navarro/` for coverage precedents
   - For **culture desk**: search `_Tribune Media Archive/Maria_Keen/` for past features
   - For **chicago desk**: search `_Bulls Universe Database/` for player profiles
   - Include key findings (past article references, stat lines, historical context) in the desk briefing
   - This is how agents get institutional memory — they can't search the archive themselves during writing without this

4. **For each of the 6 desks**, write a briefing memo to `output/desk-briefings/{desk}_briefing_c{XX}.md`:
   - `civic_briefing_c{XX}.md`
   - `sports_briefing_c{XX}.md`
   - `culture_briefing_c{XX}.md`
   - `business_briefing_c{XX}.md`
   - `chicago_briefing_c{XX}.md`
   - `letters_briefing_c{XX}.md`

5. **Each briefing contains** (500-1500 words, in Mags' editorial voice):
   - Desk-specific errata and corrections from past editions
   - Cross-desk coordination notes (who else is covering what — avoid overlap)
   - Character continuity pointers (who to carry forward, who doesn't exist)
   - **Citizen Reference Cards** (see format below) — for every citizen this desk is likely to write about
   - Mara Vance directive emphasis for this desk
   - Personal editorial note to the lead reporter

6. Create the directory: `mkdir -p output/desk-briefings`

### Citizen Reference Card Format

Include a `## Citizen Reference Cards` section in each briefing. Each card is 3-5 lines:

```
**[Name]** (age [X], [Neighborhood], [Occupation]) — [POPID if known]
- Last seen: [what they did / said in recent edition]
- Key detail: [narrative context from Supermemory — origin, family, thematic significance]
- DO NOT: [specific warnings — don't promote, don't invent titles, don't confuse with similar names]
```

Example:
```
**Marco Lopez** (40, Laurel, Mechanic) — Mara directive citizen
- Last seen: Edition 81, looking into Baylight DEIR documents
- Key detail: Working-class voice on development. Skeptical but engaged, not oppositional.
- DO NOT: Give him civic titles. He is a mechanic. Not a committee chair, not an organizer.
```

**Card selection by desk:**
- **Civic**: Council members (always all 9), Mara directive citizens, initiative stakeholders
- **Sports**: A's roster (Dynasty Five + current), featured fans, Paulson
- **Culture**: Neighborhood residents, faith figures, event participants
- **Business**: Workers affected by policy, small business owners, Stabilization Fund contacts
- **Chicago**: Bulls roster, Chicago neighborhood citizens, Talia's sources
- **Letters**: All Mara directive citizens, plus 3-5 interview candidates from the summary

**If a citizen has no Supermemory card**, still include a basic card from the desk packet data (name, age, neighborhood, occupation) with a note: "No narrative history yet — introduce naturally."

Write these as Mags — with editorial authority, personal warmth, and specific guidance. These are not templates. They're memos from the Editor-in-Chief to her reporters.

## Step 2: Launch All 6 Desks in Parallel
Use the Task tool to launch 6 agents simultaneously. Each agent gets:
- The desk-specific skill instructions (from the individual desk skills)
- **The desk SUMMARY file first** (`{desk}_summary_c{XX}.json`) — agents should read this before the full packet
- The desk packet JSON (full version, for deep dives only)
- The base_context.json
- The reporter voice profile(s) from bay_tribune_roster.json

**In the agent prompt, explicitly tell each agent:** "Read `output/desk-packets/{desk}_summary_c{XX}.json` FIRST. This is your compact reference. Only open the full packet `{desk}_c{XX}.json` if you need specific quotes, citizen archive, or extended data."

Launch these agents in parallel (all in one message):
1. **Civic Desk** — Carmen Delaine (lead), follows /civic-desk skill
2. **Sports Desk** — P Slayer + Anthony, follows /sports-desk skill
3. **Culture Desk** — Maria Keen (lead), follows /culture-desk skill
4. **Business Desk** — Jordan Velez, follows /business-desk skill
5. **Chicago Bureau** — Selena Grant + Talia Finch, follows /chicago-desk skill
6. **Letters Desk** — citizen voices, follows /letters-desk skill

Each agent writes articles + engine returns for their section.

## Step 2.5: Agent Retry (If Needed)
After all 6 agents return, check if any desk produced **zero articles**. If a desk failed:
1. Log which desk(s) failed and why (ran out of turns, packet navigation issues, etc.)
2. **Retry once** with a simplified prompt: give the agent ONLY the summary file and briefing — no full packet reference. Tell it explicitly: "You have [N] turns. Write [N-2] articles using ONLY the data in this summary. Do not search for additional files."
3. If the retry also fails, Mags writes the section directly using the summary data.
4. Note the failure in the edition's compilation notes for NEWSROOM_MEMORY update.

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

## Step 5.5: Update Newsroom Memory

After verification and before intake, update the institutional memory:

1. **Read** Rhea's verification report from Step 4
2. **Review** Mags' own editorial notes from Step 3 compilation
3. **Update** `docs/mags-corliss/NEWSROOM_MEMORY.md`:
   - Add new errata entries for this edition (desk-specific issues found)
   - Update character continuity (new citizens introduced, threads resolved)
   - Revise coverage patterns (what landed, what fell flat)
   - Archive errata older than 5 editions
   - Update the "Last Updated" header line

This step ensures the next edition benefits from this edition's lessons. Claude-Mem will auto-capture observations during this update.

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
| Desk | Lead | Articles | Summary (start here) | Full Packet |
|------|------|----------|---------------------|-------------|
| Civic | Carmen Delaine | 2-4 | civic_summary_c{XX}.json | civic_c{XX}.json |
| Sports | P Slayer / Anthony | 2-5 | sports_summary_c{XX}.json | sports_c{XX}.json |
| Culture | Maria Keen | 2-4 | culture_summary_c{XX}.json | culture_c{XX}.json |
| Business | Jordan Velez | 1-2 | business_summary_c{XX}.json | business_c{XX}.json |
| Chicago | Selena Grant / Talia Finch | 2-3 | chicago_summary_c{XX}.json | chicago_c{XX}.json |
| Letters | (citizen voices) | 2-4 | letters_summary_c{XX}.json | letters_c{XX}.json |

## Edition Template Reference
See `editions/CYCLE_PULSE_TEMPLATE.md` for exact section format, canon rules, and return formats.
