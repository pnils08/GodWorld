---
name: city-hall
description: Run the civic government — voice agents make decisions, tracker updates, canon output. Mags sifts, agents decide.
version: "2.1"
updated: 2026-05-11
tags: [civic, active]
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
related_skills: [city-hall-prep, sift, post-publish]
sources:
  - docs/EDITION_PIPELINE.md
  - .claude/agents/civic-office-mayor/IDENTITY.md
  - docs/media/citizen_selection.md
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

Append a `## /city-hall` section to `output/production_log_c{XX}.md` — the unified one-true-cycle log `/city-hall-prep` opened (per `docs/media/production_log_template.md`). Do NOT create a separate civic file; the civic state is a named section of the one cycle log. (Legacy fallback during transition: if the unified log is absent — e.g. city-hall-prep didn't run — open it yourself, item (d) pipeline.32; drop after 3+ clean cycles.)

```markdown
## /city-hall (S{NNN}) — {timestamp}
**Cycle:** {XX}
**Pressure from Mike:** {what he said needs to happen}

### Tracker State (before voices)
{read Initiative_Tracker — ImplementationPhase + MilestoneNotes only}

### Voice Decisions
{filled in as voices return}

### Tracker Updates Applied
{filled in after --apply}
```

Update this section at every step. This is how you survive compaction.

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

**IMPORTANT: Use the Write tool to create these files, not bash `cat >`.** Agents need the file path in the system's read history to find it reliably.

**What goes in:**
- The situation in plain language — what's stuck, what moved, what's due
- 2-3 predefined options with real consequences
- **Always include an open option:** "Your call. You see something nobody else sees. Make your own move. State what you're doing and why. The consequences are yours." This is where emergent behavior comes from — a Tran who introduces an amendment nobody planned, an Ashford who breaks with CRC, a Rivers who backs down. The bounded trait system controls how often each voice takes the open path vs the safe path. High independence + high risk tolerance = more rogue. High faction loyalty = stays on the menu.
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

**Output schema — require this from every voice agent:**
```json
{
  "statementId": "STMT-{cycle}-{office}-001",
  "cycle": 91,
  "office": "mayor",
  "speaker": "Avery Santana",
  "type": "policy_position",
  "topic": "...",
  "quote": "...",
  "fullStatement": "...",
  "trackerUpdates": {
    "ImplementationPhase": "...",
    "MilestoneNotes": "C{XX}: ...",
    "NextScheduledAction": "...",
    "NextActionCycle": 92
  }
}
```
**Every voice must include `trackerUpdates` if their decision changes an initiative's state.** This is how the tracker gets updated — no manual extraction.

**`ImplementationPhase` values + lifecycle + add-procedure live in [[../../../docs/mara-vance/INITIATIVE_TRACKER_CONTRACT|INITIATIVE_TRACKER_CONTRACT.md]] — read it, do not invent (civic.14 Phase 1).** The `ImplementationPhase` field in `trackerUpdates` MUST be one of the 20 canonical phases (contract §2); a free-formed phase the engine doesn't recognize is **silently zeroed** — the initiative goes dark, then false-flags "stuck" next cycle (the C96 root cause). If a voice's real-world phase isn't in the vocabulary, map it to the nearest canonical phase in the same arc (contract §5 variant map) — do not write the novel string. (Read-pointer only; the emit/enforce mechanism is civic.14 Phase 3.)

**statementId is opaque; route on `office` (S215, closes G-R3).** S193 ran six voices with four different statementId prefix conventions (`STMT-93-MAYOR-001`, `STMT-93-OPD-001`, `STMT-93-IND-VEGA-001`, `STMT-93-baylight_authority-001`). Downstream tooling (applyTrackerUpdates, civic_sentiment aggregator, future analytics) should NOT parse the prefix — they route on the `office` field, which is consistent. Voice agents may use any statementId convention they like as long as it's unique within their own JSON; the field is for traceability, not dispatch. Document only — no need to enforce a single prefix shape across agents.

## Step 3: Run Mayor FIRST (Layer 1)

Launch `civic-office-mayor` agent. Mayor gets:
- `.claude/agents/civic-office-mayor/IDENTITY.md`
- `output/civic-voice-workspace/civic-office-mayor/current/pending_decisions.md`

Output: `output/civic-voice/mayor_c{XX}.json`

**Wait for Mayor to complete.** Read her decisions. The Mayor's positions cascade down — every subsequent voice needs to know what the Mayor decided before they decide.

**After Mayor returns:**
1. Read the Mayor's output JSON
2. For each voice that runs next, **update their pending_decisions.md** with the Mayor's relevant decisions. Add a section: `## MAYOR'S DECISIONS THIS CYCLE` with the decisions that affect that voice.
3. This is the cascade. Mayor speaks → voices hear what she said → they react.

## Step 4: Run Remaining Voices (Layer 2 — Parallel)

Launch remaining voice agents in parallel. Each gets:
- Their IDENTITY.md
- Their pending_decisions.md **(updated with Mayor's cascade)**

The voices know what the Mayor decided. They react to it, support it, oppose it, or go rogue.

**Voice agents (all output to `output/civic-voice/{name}_c{XX}.json`):**
- `civic-office-okoro` → `okoro_c{XX}.json` — Deputy Mayor; speaks on Stab Fund / Community Dev / ED-coverage operations. Absence-of-statement is meaningful; don't force a run (S215 civic.5)
- `civic-office-police-chief` → `police_chief_c{XX}.json`
- `civic-office-opp-faction` → `opp_faction_c{XX}.json`
- `civic-office-crc-faction` → `crc_faction_c{XX}.json`
- `civic-office-ind-swing` → `ind_swing_c{XX}.json`
- `civic-office-district-attorney` → only if relevant this cycle

**Note (S229 G-R3):** `civic-office-baylight-authority` is **NOT** a Layer-2 cabinet voice — she runs at Layer-3 with the other project directors (see §Step 5). The `civic-office-*` path prefix is a legacy naming artifact; per her RULES.md §Pre-Write Constraint + §Layer routing note, she is a project director who receives full Layer-2 cascade context before reporting.

**Wait for all voices to complete.** Read their decisions.

## Step 5: Run Project Agents (Layer 3 — After Voices)

Project agents run AFTER voice decisions are final. They receive the **full political picture** — Mayor's decisions + all voice decisions. They don't govern — they populate the world inside the political frame that's already locked.

**The cascade:** Mayor decided → voices reacted → now project agents know the whole landscape and invent the operational reality.

**What they do:** Take the political decisions as given and invent what happens on the ground. If Mayor says Baylight Phase II should accommodate an NBA arena, Ramos figures out where it goes, what it holds, who the anchor tenants are. If OARI data is released, Tran-Muñoz describes what the numbers show — call types, response times, neighborhoods served.

**What they don't do:** Override voice decisions. Stall initiatives. Create political conflict. The political frame is locked.

**Each project agent gets:**
- Their IDENTITY.md
- A prompt that includes: (1) Mayor's relevant decisions, (2) Voice decisions that affect their initiative, (3) Their operational question

**Prompt structure:**
```
Here is what city hall decided this cycle:

MAYOR: [summary of Mayor's relevant decisions]
VOICES: [summary of voice decisions affecting this initiative]

Your job: describe what happens next operationally.
- What does this look like on the ground?
- What details emerge from implementation?
- What would a reporter see if they visited?

You may invent operational details — names, places, timelines, specifics. These become canon.

Include trackerUpdates in your output JSON.
```

**Output:** `output/civic-voice/{project}_c{XX}.json` — same schema as voices, must include `trackerUpdates`.

**Project agents may NOT pre-write Step 6 artifacts (S215 G-R5 → S229 G-R2 structural close).** S193 Baylight Authority agent wrote both its voice JSON AND `output/city-civic-database/initiatives/baylight/decisions_c93.json` (Step 6 artifact) within its tool call. Content was correct but ordering violated the user-approval gate that protects Step 6. **S215 close was documentation-only — the constraint asserted here was never actually added to the per-agent RULES.md files, and C94 G-R2 reproduced the failure (Baylight + OARI both pre-wrote despite explicit prompt warnings).** S229 closed the structural gap: §Pre-Write Constraint sections added to all 5 project-agent RULES.md (`civic-project-{oari,health-center,stabilization-fund,transit-hub}` + `civic-office-baylight-authority`) explicitly forbidding `decisions_c{XX}.json` pre-write at Step 5, plus tool-call schedule entries rewritten from "Write decisions JSON" → "DO NOT write decisions JSON". `output/city-civic-database/initiatives/{name}/decisions_c{XX}.json` is assembled by `scripts/assembleDecisions.js` (S197 G-R14) at Step 6, NOT by the agent. If a project agent still pre-writes the Step 6 artifact, treat as a skill-fidelity violation, surface to Mike before approving tracker apply, AND check whether that agent's RULES.md §Pre-Write Constraint was inadvertently removed.

**Project agents:**
- `civic-project-stabilization-fund` — disbursement logistics, applicant experiences, processing numbers
- `civic-project-oari` — dispatch data, responder reports, call scenarios, expansion planning
- `civic-project-health-center` — design details, architect specifics, community meeting texture
- `civic-project-transit-hub` — CBA framework details, construction support, displacement measures
- `civic-office-baylight-authority` — construction milestones, workforce data, Phase II planning

**Not every project runs every cycle.** Only run projects whose initiatives had a voice decision this cycle.

## Step 5.5: Collect and Verify All Outputs

Before running the Clerk or applying tracker updates, verify every voice produced output:

```bash
for name in mayor police_chief opp_faction ind_swing crc_faction baylight_authority oari stabilization_fund transit_hub; do
  [ -f "output/civic-voice/${name}_c{XX}.json" ] && echo "OK: $name" || echo "MISSING: $name"
done
```

For any MISSING voice, relaunch with a simpler prompt that explicitly names the output path. Common failure: agent searches for files that don't exist instead of reading the pending_decisions.md.

## Step 5.6: City Clerk (Closer/Verifier)

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

The production log is the ONLY civic document sift reads. If a voice quote, decision, or project detail isn't in the media handoff, sift won't see it. Be thorough.

```
## Media Handoff
[2-4 sentences: what happened, what's dramatic, what moved]

## Voice Decisions (summary with key quotes)
| Voice | Decision | Key Quote |
|-------|----------|-----------|
| Mayor Santana | [what she decided] | "[best quote]" |
| ... | ... | ... |

## Tracker Updates
| Initiative | Phase Change | What Moved |
|-----------|-------------|------------|
| ... | ... | ... |

## Topic Assignments for Media
[which desk/reporter owns which civic story if covered]

## Project Details Available
[world-building specifics the desks can use — operational details, names, places invented by project agents]
```

**Save location:** the `## /city-hall` section of `output/production_log_c{XX}.md` — the unified cycle log persists. It survives compaction, session changes, and context loss. The edition pipeline reads this section.

## Gap log (S212 — see [[../../docs/plans/GAP_LOG_TEMPLATE]])

At skill close, capture friction observed during the city-hall run as a gap log. /city-hall is a heavy skill at the **civic generator terminal**; sidecar gap logs catch inefficiency the skill couldn't catch while running.

**Destination (RB-1/RB-2 — one-true gap log, closes G-R1):** append a leg to the cycle's single gap log `output/production_log_run_cycle_c{XX}_gaps.md` (the file the engine cycle audit opens each cycle). Do **not** write a separate `_city_hall_run_gaps.md` sidecar — that split convention is retired (the C96 G-R1 finding was exactly this: city-hall gaps landing in their own file instead of the one-true-log). Open the leg with the fixed header the gate greps for:

```
## LEG: /city-hall (G-R)
```

Then the G-R entries below it — or `No gaps this run.` on a clean run. The header must be present either way.

**Gap prefix:** **G-R\*** (e.g., G-R1, G-R8 — for `/city-hall` *run* gaps. /city-hall-prep uses G-PREP\*.)

**Common categories for /city-hall gaps:**
- pipeline-fragility (script/file/handoff drift, `assembleDecisions.js` bridging gap)
- canon-fidelity (council-roster fabrication by project agents, faction-bloc misalignment)
- process-gap (vote not triggering — only N of 9 voices have initiative on desk; date/year leakage)
- reviewer-side (City Clerk reads quarantine directory, audit JSON malformed, applyTrackerUpdates dry-run gate)

**Discipline:** write the gap log even on clean runs. File a ROLLOUT row in `civic.<n>` pointing at the gap log per ADR-0005 §How to add work. Promote individual HIGH gaps to standalone work items as bandwidth allows.

**Close gate (mechanical — RB-1, G-S1).** The final action of /city-hall is:

```bash
node scripts/gapLogGate.js --cycle <XX> --skill city-hall
```

It exits non-zero until the `## LEG: /city-hall (G-R)` leg exists in the cycle gap log; skill close is defined as this exit 0. A Stop-hook backstop (`gapLogGate.js --stop-gate`) blocks **session** close for the same reason if this step is skipped. Deliberate bypass: `GAPLOG_GATE_OFF=1`.

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
