---
name: run-cycle
description: Run a GodWorld engine cycle with pre-flight checks, trigger the simulation, and post-cycle review.
---

# /run-cycle — Run a GodWorld Engine Cycle

## Rules
- Read SESSION_CONTEXT.md FIRST every time
- Show results clearly, no jargon
- Get approval before making any changes
- User is a beginner coder — keep explanations simple

## Sheet Access
Use service account (credentials/service-account.json) with lib/sheets.js.
Spreadsheet ID: 1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk

---

## Step 0: Pre-Mortem Scan

Run `/pre-mortem` before every cycle. This scans the engine code for:
- Math.random() violations (determinism — must use ctx.rng)
- Direct sheet writes outside Phase 10 (3 documented exceptions)
- ctx field dependency mismatches (read-before-write = silent failure)
- Sheet header alignment (column in code but not in sheet = data loss)
- Neighborhood reference validation (must be one of 17 canonical districts)
- Write-intent target validation (targeting non-existent sheet = data vanishes)

If it returns **CRITICAL** findings — fix before running. If **CLEAN** — proceed to Step 1.

---

## Step 1: Pre-Flight Checks

Pull these sheets via service account and show a checklist summary.

### Engine State
- **World_Config** — Current cycle number, last run timestamp
- **Engine_Errors** — Any errors from last cycle?

### Citizen Pipeline
- **Intake** — Citizens waiting to promote? (count + names if <20). editionIntake v2.0 writes new citizens here directly from editions.
- **Advancement_Intake1** — Existing citizens with updates pending? editionIntake v2.0 writes updates here.
- **Simulation_Ledger** — Current citizen count (675 expected). ClockMode breakdown: ENGINE/GAME/CIVIC/MEDIA/LIFE.
- **Generic_Citizens** — Pool size (emergence pipeline only — not used for desk packets since S94)
- **Chicago_Citizens** — Pool size

### Media Pipeline (from last edition)
- **Intake** — New citizens staged from last edition?
- **Advancement_Intake1** — Existing citizen updates pending?
- **Storyline_Tracker** — Active storyline count, any new from last edition?
- **Business_Intake** — Any staged businesses to promote? (run `processBusinessIntake.js` if so)
- **Citizen_Usage_Intake** — Citizen media appearances tracked? (6-col format with POPID)

### Civic State
- **Initiative_Tracker** — Any pending-vote initiatives this cycle?
- **Civic_Office_Ledger** — All seats filled? Any status issues?
- **Election_Log** — Is this an election cycle? (cycleOfYear 45, even years only)

### World State
- **Storyline_Tracker** — Active storyline count
- **Relationship_Bonds** — Has data? (was empty until Session 11 fix)
- **Event_Arc_Ledger** — Active arcs count
- **Cultural_Ledger** — Entity count

### Sports
- **Oakland_Sports_Feed** — A's/Warriors current records
- **Chicago_Sports_Feed** — Bulls current record

### City Systems
- **Transit_Metrics** — Latest cycle data present?
- **Crime_Metrics** — Latest cycle data present?
- **Faith_Ledger** — Latest cycle data present?
- **Faith_Organizations** — Organization count (should be 16 Oakland congregations)
- **Neighborhood_Map** — All 17 neighborhoods present?
- **Cycle_Weather** — Latest weather entry?

### Summary Format
Present as a simple checklist:
```
PRE-FLIGHT: Cycle [XX] → [XX]
  [x] Pre-mortem: CLEAN (0 critical, 0 warnings)
  [x] World_Config: Cycle 87, last run 2026-03-10
  [x] Intake: 3 citizens ready to promote
  [x] Initiative_Tracker: INIT-005 pending-vote (Temescal Health Center)
  [ ] BLOCKER: Business_Intake has 4 unprocessed rows
```

Flag any blockers. Common blockers:
- Unprocessed rows in Intake, Advancement_Intake1, or Business_Intake from last edition
- Engine_Errors from last cycle (must resolve before running again)
- Cycle_Packet cycle number doesn't match World_Config (stale packet)
- Empty Relationship_Bonds (seed issue — bonds engine will skip)

---

## Step 2: Trigger the Engine

Tell the user to open Google Apps Script editor and run `runWorldCycle()`.
The engine runs in Google's cloud — it cannot be triggered from Claude Code.
Wait for the user to confirm it finished.

---

## Step 3: Post-Cycle Review

After engine completes, pull and summarize:

### Core Output
- **World_Config** — Confirm cycle number advanced
- **Cycle_Packet** — The main output. See the v3.9 section guide below.
- **Riley_Digest** — Quick readable summary of what happened
- **Engine_Errors** — Any errors during the run?

### Cycle Packet v3.9 — What to Look For

The packet has 22+ sections. Focus on these for edition planning:

| Section | What It Tells You | Who Uses It |
|---------|-------------------|-------------|
| CYCLE SUMMARY | Engine's one-line read of what happened + headline | Everyone — the lead |
| STORY HOOKS | Up to 10 engine-flagged newsworthy items | Desk agents — these ARE the stories |
| NEIGHBORHOOD DYNAMICS | 12 neighborhoods x 6 metrics | Culture, civic — where the action is |
| SPOTLIGHT DETAIL | Named citizens + reasons for being flagged | All desks — ready-to-use sources |
| SHOCK CONTEXT | Anomaly reasons, duration, severity score | Front page — breaking news triggers |
| DEMOGRAPHIC SHIFTS | Population movement patterns | Civic, business — migration/gentrification signals |
| CITY EVENTS | Festivals, openings, rallies | Culture desk material |
| EVENING CITY | Nightlife, entertainment, evening activity | Culture desk — texture and atmosphere |
| CRIME SNAPSHOT | Crime data by type and neighborhood | Civic desk — safety/justice stories |
| MIGRATION | Who's moving where, per neighborhood | Civic, culture — displacement/attraction stories |

Don't just confirm the packet exists — scan the Story Hooks and Shock Context sections. These tell you what the engine thinks is newsworthy. If the hooks are weak or generic, the edition will struggle for leads.

### What Happened This Cycle
- **WorldEvents_Ledger** — Count new events, list notable ones (medium+ severity)
- **Initiative_Tracker** — Did any votes resolve? New initiatives proposed?
- **Election_Log** — Any election activity?
- **Civic_Office_Ledger** — Any seat changes?
- **Civic_Sweep_Report** — Updated?
- **Event_Arc_Ledger** — New or resolved arcs?

### Citizen Changes
- **Simulation_Ledger** — Did Intake citizens promote? Compare count to pre-flight
- **Relationship_Bonds** — New bonds formed?
- **LifeHistory_Log** — New life events written this cycle? Engine now writes Name + Neighborhood (fixed S93) — check that new entries have names, not just POPIDs.
- **Citizen_Media_Usage** — New usage entries?

### World Systems
- **Transit_Metrics** — New cycle entry?
- **Crime_Metrics** — New cycle entry?
- **Faith_Ledger** — New faith events this cycle?
- **Cycle_Weather** — Weather for this cycle?
- **Neighborhood_Map** — Any demographic shifts?

### Sports
- **Oakland_Sports_Feed** — Updated records?
- **Chicago_Sports_Feed** — Updated records?
- **Chicago_Feed** — Chicago satellite data updated?

### Media Prep
- **Media_Briefing** — Generated briefing text
- **Story_Seed_Deck** — New seeds for this cycle?
- **Story_Hook_Deck** — New hooks for this cycle?
- **Storyline_Tracker** — Updated storylines?
- **Texture_Trigger_Log** — New triggers?
- **Domain_Tracker** — Domain presence changes?

### Summary Format
Organize the post-cycle summary as:
1. **Cycle [XX]** — date range, season, any holidays
2. **Big Events** — what happened (world events, civic actions)
3. **Citizen Changes** — who promoted, new bonds, life events
4. **Civic Activity** — votes, initiatives, elections
5. **Sports** — team updates
6. **Issues** — anything broken or unexpected
7. **Ready for edition?** — yes/no and any fixes needed first

---

## Step 4: Post-Cycle Pipeline

After review, run these scripts to prepare for edition production. Order matters — each step feeds the next. All are zero-token (no LLM calls, just data routing).

### 4a. Build Desk Packets
```bash
node scripts/buildDeskPackets.js [cycle]
```
Splits Cycle_Packet into per-desk JSON packets. Also builds `truesource_reference.json` (canon citizen names/positions) and `citizen_archive.json`. Output: `output/desk-packets/`.

### 4b. Build Initiative Packets (if civic initiatives are active)
```bash
node scripts/buildInitiativePackets.js [cycle]
```
Per-initiative JSON packets from 7 Sheets tabs + Mara directive. Only needed if Initiative_Tracker has active/pending-vote initiatives. Output: `output/initiative-packets/`.

### 4c. Build Initiative Workspaces (if 4b ran)
```bash
node scripts/buildInitiativeWorkspaces.js [cycle]
```
Per-initiative workspace folders for initiative agents. Output: `output/initiative-workspace/`.

### 4d. Build Voice Workspaces
```bash
node scripts/buildVoiceWorkspaces.js [cycle]
```
Per-voice-agent workspace folders + v3.9 domain briefings. Routes engine data by role — crime data to police chief, displacement numbers to OPP, fiscal data to CRC. Output: `output/civic-voice-workspace/`.

### 4e. Build Desk Folders
```bash
node scripts/buildDeskFolders.js [cycle]
```
Per-desk workspace folders with everything agents need: briefings, errata warnings, voice statements, archive context, previous_grades.md, exemplar.md. Output: `output/desks/{desk}/current/`.

### 4f. Check Supplemental Triggers
```bash
node scripts/checkSupplementalTriggers.js [cycle]
```
Scans civic data for supplemental edition candidates. Output: `output/supplemental-triggers/triggers_c{XX}.json`.

After these complete, the user can run `/write-edition`.

---

## Step 5: Post-Edition Reference

These run after `/write-edition` completes (documented in that skill's Steps 14-27):

```bash
# Grade the edition (per-desk and per-reporter)
node scripts/gradeEdition.js [cycle]

# Update rolling averages and roster recommendations
node scripts/gradeHistory.js

# Extract A-grade articles as exemplars for next edition's desk folders
node scripts/extractExemplars.js [cycle]

# View full pipeline trace
node lib/pipelineLogger.js summary [cycle]
```

These feed back into the next cycle's desk folders and voice workspaces via `buildDeskFolders.js` and `buildVoiceWorkspaces.js` — the Karpathy Loop (grade → feedback → better output → better grades).
