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

## Step 1: Pre-Flight Checks

Pull these sheets via service account and show a checklist summary.

### Engine State
- **World_Config** — Current cycle number, last run timestamp
- **Engine_Errors** — Any errors from last cycle?

### Citizen Pipeline
- **Intake** — Citizens waiting to promote? (count + names if <20)
- **Advancement_Intake1** — Existing citizens with updates pending?
- **Simulation_Ledger** — Current citizen count (GAME vs SIM breakdown)
- **Generic_Citizens** — Pool size
- **Chicago_Citizens** — Pool size

### Media Pipeline (from last edition)
- **Storyline_Intake** — Processed? (check for unprocessed rows)
- **Citizen_Usage_Intake** — Processed?
- **Media_Intake** — Processed?
- **Press_Drafts** — Latest cycle number in drafts?
- **Citizen_Media_Usage** — All routed?

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
- **Sports_Feed** — General feed status
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
  [x] World_Config: Cycle 79, last run 2026-02-08
  [x] Intake: 217 citizens ready to promote (includes Bulls roster)
  [x] Initiative_Tracker: INIT-005 pending-vote (Temescal Health Center)
  [ ] BLOCKER: Storyline_Intake has 12 unprocessed rows
```

Flag any blockers. Common blockers:
- Unprocessed intake rows from last edition
- Empty Relationship_Bonds (seed issue)
- Citizens stuck in Intake that should have promoted
- Missing sports feed data

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
- **Cycle_Packet** — Read the full generated packet (THE main output)
- **Riley_Digest** — Quick readable summary of what happened
- **Engine_Errors** — Any errors during the run?

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
- **LifeHistory_Log** — New life events written this cycle?
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

## Step 4: Next Steps

Ask if the user wants to:
1. Build desk packets for an edition (`node scripts/buildDeskPackets.js`)
2. Fix any issues found in the post-cycle review
3. Just review and stop here
