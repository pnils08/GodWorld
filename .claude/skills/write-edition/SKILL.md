---
name: write-edition
description: Run the complete Cycle Pulse edition production pipeline — 6 desk agents, compile, verify, Mara audit.
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
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

## Step 0.5: Initialize Production Log

Create `output/production_log_c{XX}.md`. This file survives compaction — if context is lost mid-run, post-compact Mags reads it and picks up where she left off.

```markdown
# Edition {XX} Production Log
**Started:** {timestamp}
**Pipeline State:** STEP 1 — Verifying packets

## Completed Steps
(updated as each step finishes)

## Editorial Decisions
(story assignments, angles chosen, reporters selected, flags raised)

## Voice Agent Decisions
(Mayor authorizations, faction reactions — summarized from voice output)

## Quality Notes
(validation issues, Rhea feedback, Mara feedback)

## Next Step
Step 1 — Verify packets
```

**Update this file at every pipeline step.** Change the Pipeline State line, add to Completed Steps, log decisions as you make them. This is not optional — it's how you survive compaction.

**After compaction:** Read `output/production_log_c{XX}.md` FIRST, before anything else. It tells you exactly where you are.

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
node scripts/buildInitiativeWorkspaces.js {cycle}
```
Launch 5 initiative agents in parallel (haiku). Each reads its own workspace at `output/initiative-workspace/{init}/current/`. Launch City Clerk after. These are additive — failures don't block the pipeline.

## Step 2.5: Apply Tracker Updates + Build Decision Queues

After initiative agents complete, close the feedback loop and prepare voice agent decisions:

```bash
# Write initiative decisions back to the sheet (dry run first, --apply after review)
node scripts/applyTrackerUpdates.js {cycle}
node scripts/applyTrackerUpdates.js {cycle} --apply

# Generate pending_decisions.md for voice agents based on updated initiative state
node scripts/buildDecisionQueue.js {cycle}
```

`applyTrackerUpdates.js` writes initiative agent `trackerUpdates` to the Initiative_Tracker sheet — this is how agents move the world. Show the dry run output to the user before applying.

`buildDecisionQueue.js` reads initiative packets and maps blockers to responsible offices. Each voice agent gets a `pending_decisions.md` with specific decisions they must respond to, including options and consequences.

## Step 3: Voice Agents (Parallel)
Build voice workspaces, then launch agents:
```bash
node scripts/buildVoiceWorkspaces.js {cycle}
```
Launch voice agents to generate source material for desk agents:
1. Mayor's Office -> reads workspace, saves to `output/civic-voice/mayor_c{XX}.json`
2. 3 Faction agents in parallel (OPP, CRC, IND) -> save to `output/civic-voice/`
3. Extended voices (Police Chief, Baylight, DA) — only if relevant events exist

Each agent reads its own workspace at `output/civic-voice-workspace/{office}/current/`.
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

Each agent gets the same core instruction: READ your briefing.md and packet FIRST, write FROM the data. The v3.9 Cycle_Packet now serializes ~90% of engine output — neighborhood dynamics, evening city, crime, economics, migration, story hooks, spotlight citizens. If the agent ignores the packet, the edition ignores the world.

Launch all 6 using each desk's `/desk-name` skill. The skill files contain the full agent prompts with v3.9 data references.

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

## Step 7.5: Mara Vance Canon Audit (External — claude.ai)
Mara reads the edition clean. No engine context, no Rhea report, no validation results.
She reads journalism and judges whether the city feels real.

1. Generate audit packet:
```bash
node scripts/buildMaraPacket.js {XX} editions/cycle_pulse_edition_{XX}.txt
```
2. Upload to Drive:
```bash
node scripts/saveToDrive.js output/mara-audit/edition_c{XX}_for_review.txt mara
node scripts/saveToDrive.js output/mara-audit/audit_history.md mara
```
3. Tell the user: "Edition draft and audit history uploaded to Mara's Drive folder. Ready for her review."

## Step 8: MARA REVIEW GATE (MANDATORY)
**STOP. Pipeline pauses here until Mara approves on claude.ai.**

The user hands the edition to Mara. She reads it as a reader who knows the city.
Her canon audit comes back with corrections and forward guidance.

When the user returns with Mara's response:
- Apply any corrections Mara identified
- Save her audit to `output/mara_canon_audit_c{XX}.txt`
- Update `docs/mara-vance/AUDIT_HISTORY.md` with new findings
- Show: article count, Rhea score, Mara assessment, corrections applied, new citizens

**Then get explicit user approval to publish.** Wait for "yes" / "approved" / "publish".

## Step 9: Save & Publish (after Mara approval + user approval)
1. Save to `editions/cycle_pulse_edition_{XX}.txt`
2. Upload to Drive: `node scripts/saveToDrive.js editions/cycle_pulse_edition_{XX}.txt edition`
3. Upload Mara audit: `node scripts/saveToDrive.js output/mara_canon_audit_c{XX}.txt mara`
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

## Step 11: Post-Run Filing Check
```bash
node scripts/postRunFiling.js {XX}
```
Verifies all outputs exist and are named correctly. Use `--upload` to auto-upload missing files to Drive. Writes `output/run_manifest_c{XX}.json`.
