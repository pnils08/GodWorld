---
name: city-hall
description: Run the civic government pipeline — initiative agents, tracker updates, decision queues, voice agents. Produces statements and canon that feed into editions.
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /city-hall — Civic Government Pipeline

## Usage
`/city-hall [cycle-number]`

## Rules
- This is Steps 2–3 extracted from `/write-edition`. Same scripts, same agents, same output.
- Show the user what each step produced before moving to the next.
- Get approval before applying tracker updates to the sheet.

## Live Status (auto-injected)

**Desk packets (required input):**
```
!`cat output/desk-packets/manifest.json 2>/dev/null || echo "NO PACKETS — run: node scripts/buildDeskPackets.js [cycle]"`
```

**Existing voice output:**
```
!`ls output/civic-voice/*_c*.json 2>/dev/null | tail -7 || echo "No voice output yet"`
```

## Prerequisites
Before running, the user should have already:
1. Run the engine cycle
2. Built desk packets: `node scripts/buildDeskPackets.js [cycle]`

## Step 0.5: Initialize Production Log

Create `output/production_log_city_hall_c{XX}.md`. This file survives compaction — if context is lost mid-run, post-compact Mags reads it and picks up where she left off.

```markdown
# City Hall C{XX} Production Log
**Started:** {timestamp}
**Pipeline State:** STEP 1 — Verifying packets

## Completed Steps
(updated as each step finishes)

## Initiative Agent Output
(what each initiative agent produced)

## Voice Agent Decisions
(Mayor positions, faction reactions, extended voice statements)

## Next Step
Step 1 — Verify packets
```

**Update this file at every pipeline step.** Change the Pipeline State line, add to Completed Steps, log decisions as you make them.

**After compaction:** Read `output/production_log_city_hall_c{XX}.md` FIRST, before anything else. It tells you exactly where you are.

## Step 1: Verify Packets
1. Read `output/desk-packets/manifest.json` — confirm all 6 packets exist
2. Read `output/desk-packets/base_context.json` — get cycle number, calendar
3. Confirm cycle number matches user expectation
4. Show summary to user:
```
CITY HALL C{XX} — PACKETS READY
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

**Initiative agents:**
- `civic-project-stabilization-fund`
- `civic-project-oari`
- `civic-project-health-center`
- `civic-project-transit-hub`
- `city-clerk` (runs after the 4 above)

Show the user what each agent produced.

## Step 2.5: Apply Tracker Updates + Build Decision Queues

After initiative agents complete, close the feedback loop and prepare voice agent decisions:

```bash
# Dry run first — show the user what will change
node scripts/applyTrackerUpdates.js {cycle}

# USER APPROVAL GATE — wait for approval before applying
node scripts/applyTrackerUpdates.js {cycle} --apply

# Generate pending_decisions.md for voice agents
node scripts/buildDecisionQueue.js {cycle}
```

`applyTrackerUpdates.js` writes initiative agent decisions to the Initiative_Tracker sheet. **Always dry run first. Show output. Wait for approval.**

`buildDecisionQueue.js` maps blockers to responsible offices. Each voice agent gets `pending_decisions.md` with specific decisions, options, and consequences.

## Step 3: Build Voice Workspaces + Civic Voice Packets

```bash
node scripts/buildCivicVoicePackets.js {cycle}
node scripts/buildVoiceWorkspaces.js {cycle}
```

`buildCivicVoicePackets.js` pulls live data from Google Sheets and builds per-office JSON packets at `output/civic-voice-packets/`.

Populates `output/civic-voice-workspace/{office}/current/` for each voice agent with:
- Base context (cycle, calendar)
- Previous voice statements
- Initiative data filtered by role
- Domain briefing (crime → police chief, displacement → OPP, fiscal → CRC)
- Pending decisions from the decision queue
- Previous grades

## Step 4: Launch Voice Agents (Parallel)

Launch voice agents to generate source material:
1. Mayor's Office -> reads workspace, saves to `output/civic-voice/mayor_c{XX}.json`
2. 3 Faction agents in parallel (OPP, CRC, IND) -> save to `output/civic-voice/`
3. Extended voices (Police Chief, Baylight, DA) — only if relevant events exist

Each agent reads its own workspace at `output/civic-voice-workspace/{office}/current/`.

## Step 5: Review Output

Show the user a summary of what city hall produced:
- Which agents ran
- Key positions taken
- Any drama or disagreements between voices
- Initiative phase changes
- Statements that will feed into the next edition

**City hall output stays in `output/civic-voice/`.** When `/write-edition` runs later, `buildDeskFolders.js` distributes these statements to desk agents automatically.
