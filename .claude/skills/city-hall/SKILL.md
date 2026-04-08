---
name: city-hall
description: Run the civic government — voice agents make decisions, tracker updates, canon output. Mags sifts, agents decide.
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /city-hall — Civic Government

## Usage
`/city-hall [cycle-number]`

## The Principle

Mags and Mike are the sifters. We decide what each voice needs to know. No data dumps. No 7-tab packets. Each voice agent gets their IDENTITY.md and a pending_decisions.md with exactly what's on their desk this cycle. Nothing else.

Less data, stronger identity, one clear decision. Bounded input — data is chaos.

## Rules
- Voice agents get IDENTITY.md + pending_decisions.md. That's it.
- No initiative packets. No citizen lists. No crime metrics. No neighborhood demographics.
- Mayor runs FIRST — his decisions may affect what other voices face.
- "No decision" is not an option for any voice. They commit or the story moves without them.
- Show the user what each voice decided before applying tracker updates.
- USER APPROVAL GATE before writing to the Initiative_Tracker sheet.

## Agent Coordination (from Paperclip patterns)

**Heartbeat model:** Voices don't run as long sessions. They wake, receive their decision, produce output, done. If a voice has no pending decision this cycle, it doesn't run. No idle agents.

**Atomic topic checkout:** Each initiative/topic is assigned to ONE voice. No two voices produce output about the same initiative unless the decision cascades (Mayor → Chief). Track assignments in the production log:
```
## Topic Assignments
- OARI: Mayor (political) → Montez (operational) → Tran-Muñoz (project)
- Stabilization Fund: Mayor (enforcement) → Vega (oversight)
- Baylight: Ramos (construction) → Ashford (oversight)
```
This prevents the E90 problem where five articles covered the same two stories. Each topic has a primary owner. Others only speak if the decision flows to them.

**Structured result capture:** Every voice returns the same format — `output/civic-voice/{office}_c{XX}.json` with: office, cycle, statements array, each statement has type, initiative, decision, quote, reasoning. No free-form. The clerk script validates this schema.

## Prerequisites
1. Engine cycle has been run
2. Mike provides the pressure — what needs to happen this cycle, what can't be punted. This can be a Mara directive, feed entries, or just Mike telling you.

## Step 0: Production Log

Create `output/production_log_city_hall_c{XX}.md`:

```markdown
# City Hall C{XX} Production Log
**Started:** {timestamp}
**Cycle:** {XX}
**Pressure from Mike:** {what he said needs to happen}

## Tracker State (before voices)
{read Initiative_Tracker — ImplementationPhase + MilestoneNotes only}

## Voice Decisions
{filled in as voices return}

## Tracker Updates Applied
{filled in after --apply}
```

Update this file at every step. This is how you survive compaction.

## Step 1: Read the Tracker + Approval Ratings

Read Initiative_Tracker from the sheet. Key columns:
- InitiativeID, Name, ImplementationPhase, MilestoneNotes
- NextScheduledAction, NextActionCycle
- AffectedNeighborhoods, PolicyDomain

Also read Civic_Office_Ledger — Approval column for all council members + Mayor.

**Why this matters now (S137b):** ImplementationPhase drives engine behavior — "disbursement-active" ripples economic effects into West Oakland, "dispatch-live" ripples safety effects into D1/D3/D5. Approval ratings are dynamic — they change based on initiative performance, media coverage, and district alignment. A council member at 30 approval is vulnerable. Below 20 triggers recall pressure.

Log tracker state AND approval ratings in the production log. Show Mike.

## Step 2: Write Pending Decisions

For each voice that has a decision this cycle, write `output/civic-voice-workspace/{office}/current/pending_decisions.md`.

**What goes in:**
- The situation in plain language — what's stuck, what moved, what's due
- 2-3 real options with real consequences
- Who's watching
- "No decision is not an option this cycle."
- **Their current approval rating** and whether they're vulnerable/popular
- **Their district's neighborhoods** and how current initiatives are affecting them
- If media coverage was negative/positive in their domain — tell them the city noticed

**What does NOT go in:**
- Citizen lists
- Neighborhood demographics
- Crime data
- Business ledger data
- Anything from buildInitiativePackets.js

**How to decide who gets a decision:** Read the tracker. If an initiative has a NextScheduledAction due this cycle, someone has to act. Mike's pressure directive tells you who and what.

## Step 3: Run Mayor FIRST

Launch `civic-office-mayor` agent. Mayor gets:
- `.claude/agents/civic-office-mayor/IDENTITY.md`
- `output/civic-voice-workspace/civic-office-mayor/current/pending_decisions.md`

Output: `output/civic-voice/mayor_c{XX}.json`

**Wait for Mayor to complete.** Read his decisions. His positions may change what other voices face — if Mayor orders Montez to sign, that changes Montez's decision. Update other pending_decisions.md files if needed.

## Step 4: Run Remaining Voices (Parallel)

Launch remaining voice agents in parallel. Each gets only:
- Their IDENTITY.md
- Their pending_decisions.md (updated after Mayor if needed)

**Voice agents:**
- `civic-office-police-chief` → `output/civic-voice/police_chief_c{XX}.json`
- `civic-office-opp-faction` → `output/civic-voice/opp_faction_c{XX}.json`
- `civic-office-crc-faction` → `output/civic-voice/crc_faction_c{XX}.json`
- `civic-office-ind-swing` → `output/civic-voice/ind_swing_c{XX}.json`
- `civic-office-baylight-authority` → `output/civic-voice/baylight_authority_c{XX}.json`
- `civic-office-district-attorney` → only if relevant this cycle
- `civic-project-*` agents → only if Mike says an initiative needs a project-level response

## Step 5: Run Project Agents (After Voices)

Project agents run AFTER voice decisions are final. They don't govern — they populate. They're the controlled hallucinators of city hall.

**What they do:** Take the political decision as given and invent the operational details that make the world real. If Mayor says Baylight is a go, Ramos decides what the stadium is called, who the flagship tenants are, what the concourse looks like. If OARI is deployed, Tran-Muñoz describes the first dispatch protocol, the shift schedule, the responder assignments.

**What they don't do:** Override voice decisions. Stall initiatives. Create political conflict. The political frame is locked by the voices. Projects fill in the world inside that frame.

**Format:** Same as voices — IDENTITY.md + one prompt with the voice decision as context. No packets. Keep it bounded.

**Prompt structure:**
```
The [voice decision] has been made. Your job is to describe what happens next operationally.
- What does this look like on the ground?
- What details emerge from implementation? (names, places, timelines, specifics)
- What would a reporter see if they visited the site/office/event?

You may invent operational details — tenant names, facility descriptions, program specifics, staff assignments. These become canon. Keep them consistent with the world.
```

**Output:** Same JSON format to `output/civic-voice/{project}_c{XX}.json`. These details feed into the desk packets as source material — not as articles, but as the world-building that gives reporters something concrete to write about.

**Project agents:**
- `civic-project-stabilization-fund` — disbursement logistics, applicant experiences, community impact details
- `civic-project-oari` — dispatch protocols, responder profiles, first-call scenarios
- `civic-project-health-center` — design details, architect specifics, community meeting texture
- `civic-project-transit-hub` — CBA framework details, construction support specifics, displacement measures
- `civic-office-baylight-authority` — stadium naming, tenant announcements, construction milestones, workforce details

**Not every project runs every cycle.** Only run projects whose initiatives had a voice decision this cycle.

## Step 5.5: City Clerk (Closer/Verifier)

City Clerk runs LAST. Not a participant — a closer. Checks:
- Did tracker updates save correctly?
- Did all voice outputs land in `output/civic-voice/`?
- Did project agent outputs land?
- Is the production log complete?
- Is the media handoff ready? (voice + project outputs organized for desk agents to find)

Output: `output/city-civic-database/clerk_audit_c{XX}.json` — pass/fail per check, issues flagged.

If everything passed, city hall is closed. If something failed, flag it and fix before closing.

## Step 6: Review All Decisions

Show Mike a summary of voices AND projects:

| Voice | Initiative | Decision | Consequence |
|-------|-----------|----------|-------------|
| Mayor | ... | ... | ... |
| ... | ... | ... | ... |

Flag any contradictions between voices (e.g., Mayor orders X, Chief refuses X).

## Step 6: Apply Tracker Updates

Write decision files to `output/city-civic-database/initiatives/{initiative}/decisions_c{XX}.json` with `trackerUpdates` field:

```json
{
  "initiative": "INIT-XXX",
  "initiativeId": "INIT-XXX",
  "cycle": XX,
  "trackerUpdates": {
    "ImplementationPhase": "new-phase",
    "MilestoneNotes": "C{XX}: What happened this cycle.",
    "MayoralAction": "action-taken",
    "MayoralActionCycle": XX,
    "NextScheduledAction": "what's next",
    "NextActionCycle": XX
  }
}
```

Dry run first:
```bash
node scripts/applyTrackerUpdates.js {cycle}
```

Show output. **USER APPROVAL GATE.** Then:
```bash
node scripts/applyTrackerUpdates.js {cycle} --apply
```

This also generates `output/civic_sentiment_c{XX}.json` — aggregate voice sentiment from all decisions. The engine reads this in Phase 2 and compounds it with edition coverage ratings. Positive civic decisions + positive civic media coverage = amplified city confidence. Negative both ways = compounding pressure.

## Step 7: Close City Hall — Write Media Handoff

Update production log with final state. Add the **Media Handoff** section at the bottom — this is the plain language summary of what happened in government this cycle.

**The production log IS the civic sift document.** When `/write-edition` runs later, Mags reads this log first. It tells her:
- What decisions were made and by whom
- What's dramatic (conflicts, surprises, timing collisions)
- What moved on the tracker
- What project details were hallucinated (stadium names, tenant lists, protocol specifics)

**This data is locked canon once written.** The voice decisions, the project details, the tracker updates — all of it becomes the truth of what happened in city government this cycle. The edition reports FROM this document. No desk agent overrides it, reinterprets it, or invents additional civic decisions.

**Media Handoff format:**
```
## Media Handoff
[2-4 sentences: what happened, what's dramatic, what moved]
[Topic assignments: which desk owns which story if covered]
[Project details available: what world-building specifics the desks can use]
```

**Save location:** `output/production_log_city_hall_c{XX}.md` — this file persists. It survives compaction, session changes, and context loss. The edition pipeline reads it.

**City hall is done. Edition is a separate session.**

## What This Replaces

These scripts are no longer part of the city-hall flow:
- `buildInitiativePackets.js` — too much data, voices don't need it
- `buildInitiativeWorkspaces.js` — replaced by hand-written pending decisions
- `buildCivicVoicePackets.js` — 7 tabs of noise
- `buildVoiceWorkspaces.js` — replaced by IDENTITY.md + pending_decisions.md
- `buildDecisionQueue.js` — BLOCKER_MAP conditions go stale, Mags writes decisions instead

These scripts still work and the code is there if needed for reference. They're just not in the pipeline.

## Things to Consider

- **City hall is a simulation layer, not a media step.** This has nothing to do with the newspaper. These characters are governing the city — making decisions that change the world state. Whether the edition covers any of it is a separate question decided later by the editor.
- **The tracker is the output.** ImplementationPhase and MilestoneNotes changing — that's the world changing. The voice statements are how we get there. The tracker update is what matters.
- **Civic stories can lead newspapers.** When the edition runs, civic decisions may be the front page or they may be a 5-line ticker. That's an editorial call, not a city-hall call. City hall just governs.
- **The order matters.** Mayor first, then everyone else. Mayor's decisions cascade.
- **Mara directives are input, not instructions.** Mara sees the whole board and wants to direct traffic. The voices make their own calls. Use Mara's intel as pressure context, not as orders.
- **Some cycles have nothing for city hall.** If no initiative has a NextScheduledAction due, and Mike doesn't have pressure to apply, skip city-hall. Not every cycle needs government decisions.
