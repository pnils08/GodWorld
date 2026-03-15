---
name: write-edition
description: Run the complete Cycle Pulse edition production pipeline — 6 desk agents, compile, verify, Mara audit.
---

# /write-edition — Full Edition Production Pipeline

## Usage
`/write-edition [cycle-number]`

## Rules
- Read SESSION_CONTEXT.md FIRST
- Show the user a plan before launching agents
- Get approval before compiling the final edition

## Prerequisites
Before running, the user should have already:
1. Run the engine cycle
2. Built desk packets: `node scripts/buildDeskPackets.js [cycle]`
3. Built civic voice packets: `node scripts/buildCivicVoicePackets.js [cycle]` (optional)

## Step 1: Verify Packets
1. Read `output/desk-packets/manifest.json` — confirm all 6 packets exist
2. Read `output/desk-packets/base_context.json` — get cycle number, calendar
3. Confirm cycle number matches user expectation
4. Show summary to user:
```
EDITION [XX] — PACKETS READY
  [x] civic, sports, culture, business, chicago, letters
Ready to proceed?
```

## Step 2: Initiative Agents (Parallel, Optional)
If civic initiatives need advancing this cycle:
```bash
node scripts/buildInitiativePackets.js {cycle}
```
Launch 5 initiative agents in parallel (haiku). Launch City Clerk after. These are additive — failures don't block the pipeline.

## Step 3: Voice Agents (Parallel)
Launch voice agents to generate source material for desk agents:
1. Mayor's Office -> save to `output/civic-voice/mayor_c{XX}.json`
2. 3 Faction agents in parallel (OPP, CRC, IND) -> save to `output/civic-voice/`
3. Extended voices (Police Chief, Baylight, DA) — only if relevant events exist

Voice agent outputs are distributed to desk folders automatically in Step 4.

## Step 4: Build Desk Folders
```bash
node scripts/buildDeskFolders.js {cycle}
```
One command. Zero LLM tokens. Populates all 6 desk workspaces with:
- Packets, summaries, base context
- Script-generated briefings (canon, errata, story priorities, returning citizens)
- Voice statement distribution (civic gets all, chicago gets none)
- Interview transcripts
- Last 3 editions of past output
- Reference data (truesource, citizen archive)

**Verify:** Check `output/desks/{desk}/current/briefing.md` exists for all 6 desks.

## Step 5: Launch 6 Desk Agents (Parallel)
Launch ALL 6 in a single message with `run_in_background: true`:

```
Agent: sports-desk
Prompt: "Write the sports section for Edition {XX}. Your workspace: output/desks/sports/"

Agent: civic-desk
Prompt: "Write the civic section for Edition {XX}. Your workspace: output/desks/civic/"

Agent: culture-desk
Prompt: "Write the culture section for Edition {XX}. Your workspace: output/desks/culture/"

Agent: business-desk
Prompt: "Write the business section for Edition {XX}. Your workspace: output/desks/business/"

Agent: chicago-desk
Prompt: "Write the Chicago section for Edition {XX}. Your workspace: output/desks/chicago/"

Agent: letters-desk
Prompt: "Write the letters section for Edition {XX}. Your workspace: output/desks/letters/"
```

Each agent reads its own IDENTITY.md, RULES.md, and desk folder. No pre-loading needed from the orchestrator.

## Step 5.1: Collect Results
Check each agent's output. When all 6 return, confirm articles were produced. If a desk failed, retry once with a focused prompt.

## Step 5.5: Jax Caldera — Accountability Check (Conditional)
Review collected output for stink signals (silence on major policy, contradictions between desks, dropped storylines). If found, launch `freelance-firebrand` agent for one accountability piece. If not, skip.

## Step 6: Compile (Mags Role)
After all desks return, compile the full edition:

1. **Front page call** — which desk has the strongest lead? Show user, let them decide.
2. **Assemble in template order:**
   - HEADER (from base_context)
   - FRONT PAGE (deck line + standardized byline)
   - EDITOR'S DESK — Mags writes 150-250 words framing the edition
   - CIVIC AFFAIRS
   - BUSINESS
   - CULTURE / SEASONAL — OAKLAND
   - OPINION (P Slayer / Farrah / Elliot pieces get [OPINION] tag)
   - SPORTS — OAKLAND
   - SKYLINE TRIBUNE — CHICAGO BUREAU
   - QUICK TAKES — 3-5 short items from leftover signals
   - WIRE / SIGNALS — optional (Reed Thompson / Celeste Tran)
   - LETTERS TO THE EDITOR
   - ACCOUNTABILITY — Jax piece if deployed
   - ARTICLE TABLE, STORYLINES, CITIZEN USAGE LOG, CONTINUITY NOTES
   - COMING NEXT CYCLE — 3-5 teasers
   - END EDITION
3. **Quality checks:** deck lines, standardized bylines, cross-references, photo credits
4. **Show compiled edition to user**

## Step 6.5: Programmatic Validation
```bash
node scripts/validateEdition.js editions/cycle_pulse_edition_{XX}.txt
```
Catches data errors (wrong positions, vote swaps, engine language) instantly. Fix CRITICALs before Rhea.

## Step 7: Rhea Verification
Launch `rhea-morgan` agent on compiled edition.
- APPROVED (score >= 75, zero CRITICALs) -> proceed
- REVISE -> retry failing desks with Rhea's error report, max 2 rounds

## Step 7.5: Mara Vance Audit
Launch Mara audit agent with:
- The compiled edition
- `docs/mara-vance/AUDIT_HISTORY.md`
- Rhea's report
- `output/desk-packets/base_context.json`

Save audit to `output/mara_directive_c{XX}.txt`. Update `AUDIT_HISTORY.md`.

## Step 8: USER REVIEW GATE (MANDATORY)
**STOP. Nothing saved or published until explicit user approval.**

Show: article count, Rhea score, Mara assessment, corrections applied, new citizens.
Wait for "yes" / "approved" / "publish". NEVER proceed on your own judgment.

## Step 9: Save & Publish (after approval)
1. Save to `editions/cycle_pulse_edition_{XX}.txt`
2. Upload to Drive: `node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt edition`
3. Upload Mara audit: `node scripts/saveToDrive.js output/mara_directive_c{XX}.txt mara`
4. Ingest to Supermemory: `node scripts/ingestEdition.js editions/cycle_pulse_edition_{XX}.txt`

## Step 9.5: Print Pipeline
1. Photos: `node scripts/generate-edition-photos.js editions/cycle_pulse_edition_{XX}.txt`
2. PDF: `node scripts/generate-edition-pdf.js editions/cycle_pulse_edition_{XX}.txt`
3. Upload PDF: `node scripts/saveToDrive.js output/pdfs/bay_tribune_e{XX}.pdf edition`

## Step 9.6: Podcast (Optional)
If the edition warrants it, run `/podcast`. Not automatic — Mags decides.

## Step 10: Post-Publish
1. Write `output/latest_edition_brief.md` — article summaries, initiative status, active citizens
2. Clear Discord bot history and reload:
   ```bash
   echo '{"savedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","history":[]}' > logs/discord-conversation-history.json
   pm2 reload mags-discord-bot
   ```
3. Update `docs/mags-corliss/NEWSROOM_MEMORY.md` with errata and editorial notes
