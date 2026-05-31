---
name: city-hall-prep
description: Prepare all inputs for city-hall voice agents. Reads tracker, approvals, world summary, engine review, coverage ratings, previous log, canon, Mara directive. Writes pending decisions per voice.
version: "1.3"
updated: 2026-05-23
tags: [civic, active]
effort: high
disable-model-invocation: true
argument-hint: "[cycle-number]"
---

# /city-hall-prep — Civic Government Preparation

## Purpose

Assemble everything the voice agents need before city-hall runs. Each voice represents a neighborhood or city function and looks at different data. This skill gathers it all, routes the right data to the right voice, then Mags writes targeted pending decisions.

When this is done right, `/city-hall` runs clean — voices wake, decide, done.

## Inputs

### From disk (produced by earlier skills)

1. **World summary** — `output/world_summary_c{XX}.md` (from `/build-world-summary`)
2. **Engine review** — `output/engine_review_c{XX}.md` (from `/engine-review`) — ailments that need civic response, stuck initiatives, recurring crises
3. **Previous cycle log** — `output/production_log_c{XX-1}.md` §/city-hall section — what was promised last cycle, what cascaded. (Legacy fallback during transition: `output/production_log_city_hall_c{XX-1}.md` if the unified prior-cycle log is absent — pipeline.32 item (d); drop after 3+ clean cycles.)
4. **Previous voice outputs** — `output/civic-voice/{office}_c{XX-1}.json` — exact quotes, positions, tracker updates from last cycle per voice. Continuity source.
5. **Mara directive** — `output/mara-directives/mara_directive_c{XX}.txt` (if exists) — Mara's editorial pressure for this cycle

### From sheets (via service account)

6. **Initiative_Tracker** — ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle, AffectedNeighborhoods, PolicyDomain, Budget
7. **Civic_Office_Ledger** — all seats, approval ratings, district, faction
8. **Edition_Coverage_Ratings** — did the Tribune cover civic topics positively or negatively last cycle? Voices should know if the city noticed.

### From MCP + Supermemory

9. **GodWorld MCP** — `get_council_member(district)` per voice for live approval + faction data. `lookup_initiative(name)` per active initiative. `get_neighborhood(name)` for affected neighborhoods.
10. **Bay-tribune canon** — `search_canon(initiative_name)` per active initiative. What has the Tribune published about each initiative? What was promised in coverage? What did citizens say? Grounds decisions in published history.

## Voice Data Routing

Each voice looks at different data. Route the right inputs to the right pending decision.

**Agent topology (G-10, S192 — 11 actual agents, NOT 17).** Only Mayor / Chief / DA have individual agents. The 9 council members are grouped into 3 faction-bloc agents (`opp-faction`, `crc-faction`, `ind-swing`). One pending_decisions.md per agent — bloc agents speak for all members in their bloc within one file. The 5 project agents (Baylight / OARI / Stab Fund / Health Center / Transit Hub) are individual.

| Agent (write pending_decisions to) | Speaks for | District/Scope | Data They Need |
|-------------------------------------|-----------|----------------|----------------|
| `civic-office-mayor` | Mayor Santana | Citywide | All initiatives, all approval ratings, engine review ailments, Mara directive, coverage feedback across all domains |
| `civic-office-okoro` | Deputy Mayor Brenda Okoro | Community Dev + Stab Fund + ED (Osei coverage) | Stab Fund processing trends + district equity + portfolio-load impact; speaks when Stab Fund anomaly, Mara directive names her, oversight checkpoint approaches, or Mayor cascade lands on her portfolios. Absence-of-statement is meaningful — don't force a statement (S215 civic.5). |
| `civic-office-police-chief` | Chief Montez | Public Safety | Crime metrics, OARI data, safety-related engine ailments, safety coverage ratings |
| `civic-office-district-attorney` | DA Dane | Legal framework | Only runs when legal dimension exists this cycle |
| `civic-office-opp-faction` | Rivers (D5) + Delgado (D3) + Carter (D1) + Mobley (D9) | OPP bloc — 4 council members | Per-member district data: D5 East Oakland (OARI + displacement), D3 Fruitvale (Transit Hub + OARI), D1 Jack London/W Oakland (Baylight + Stab Fund), D9 district state. Bloc-level political alignment + each member's approval + vulnerability flags |
| `civic-office-crc-faction` | Ashford (D7) + Crane (D6) + Chen (D8) | CRC bloc — 3 council members (Mobley D9 is OPP, not CRC) | D7 fiscal-oversight scope (Baylight audits, Transit Hub cost caps), D6 district state, D8 Lake Merritt process/environmental-review scope, each member's approval. CRC fiscal-conservative framing |
| `civic-office-ind-swing` | Vega (D4 Council President) + Tran (D2) | IND swing — 2 council members | Vega: Stab Fund oversight + procedural matters + Council Pres role. Tran: OARI expansion demand + D2 state (no active initiatives in D2). Each speaks for himself — not a bloc, no coordination |
| `civic-office-baylight-authority` | Director Keisha Ramos | Construction project | Baylight initiative state, construction milestones, workforce data |
| `civic-project-oari` | Director Vanessa Tran-Muñoz | Crisis response program | OARI initiative state, dispatch data, expansion planning |
| `civic-project-stabilization-fund` | Director Marcus Webb | Disbursement program | Stab Fund initiative state, processing numbers, applicant queue |
| `civic-project-health-center` | Director Bobby Chen-Ramirez | Facility project | Health Center initiative state, construction planning, health ailments from engine review |
| `civic-project-transit-hub` | Lead Elena Soria Dominguez | Transit project | Transit Hub initiative state, CBA framework, transit metrics |

**Council canonical roster (per `Civic_Office_Ledger`):** D1 Carter (OPP), D2 Tran (IND), D3 Delgado (OPP), D4 Vega (IND, Council Pres), D5 Rivers (OPP, Progressive Caucus Lead), D6 Crane (CRC), D7 Ashford (CRC), D8 Chen (CRC), D9 Mobley (OPP). **Faction split: OPP 4 (Carter/Delgado/Rivers/Mobley), CRC 3 (Crane/Ashford/Chen), IND 2 (Vega/Tran).** Chen D8 = CRC per truesource (`output/desk-packets/truesource_reference.json` + `buildCivicVoicePackets.js` FACTION_DISTRICTS + the CRC agent's own IDENTITY/LENS) — the earlier "corrected S195/S197 to OPP" annotation was itself the error and never matched the operational data; reverted S246 (G-PREP1).

**Why the bloc topology matters (G-R11 from S193 city-hall run gap log):** When an initiative reaches `vote-ready` phase with NextActionCycle = current cycle, the prep MUST route that initiative to the relevant faction-bloc agents to surface positions for ALL 9 council members — otherwise the vote can't tally and the project agent silently invents council positions (G-R6/R7/R10). Single-member routing (e.g., only Vega had Transit Hub on his desk in C93) is the structural cause of vote-not-trigger + fabrication failures.

## Prerequisites (from /run-cycle)

Verify these exist before starting:
- `output/world_summary_c{XX}.md` — from `/build-world-summary`
- `output/engine_review_c{XX}.md` — from `/engine-review`

If either is missing, `/run-cycle` didn't complete. Don't proceed.

## Memory Fence (Phase 40.6 Layer 2)

`pending_decisions_*.md` packets and voice briefings are consumed by voice agents — a downstream model context. Any content pulled from prior logs, `search_canon`, or Supermemory results that lands in a packet must be wrapped before the voice agent sees it.

```javascript
const { wrap } = require('/root/GodWorld/lib/memoryFence');
const fencedCanon = wrap(canonExcerpt, 'bay-tribune');
```

Full convention: [[SUPERMEMORY]] §Memory Fence. Covers the threat model and when *not* to fence.

## Steps

### Step 0: Production Log

Create/open `output/production_log_c{XX}.md` — the unified one-true-cycle source every cycle-active skill appends a named section to (per `docs/media/production_log_template.md`). Write the §Cycle Header (timestamp, cycle, sim day) + §Carry-Forward, then append this skill's `## /city-hall-prep` section with Mike's pressure. (Until the `pipeline.35` cycle-init admin skill ships, `/city-hall-prep` is the log opener; afterward it becomes an appender.)

**Mike's pressure auto-derive (S215, closes G-5).** "Pressure from Mike" defaults to the synthesis of: engine review HIGH-severity ailments (`output/engine_review_c{XX}.md` §Ailments / §Stuck Initiatives), Mara directive content (`output/mara-directives/mara_directive_c{XX}.txt` if present), and active civic items in `docs/engine/ROLLOUT_PLAN.md` §civic.*. Compute the default, write it into the production log, then ask Mike to confirm or override. Mike-override fires only when his read of the cycle differs from those engine signals (e.g., front-page-rotation pressure, audit follow-up ask, off-rubric editorial direction) — anomaly-only escalation, not always-on.

**Mara additive only (S215, closes G-9).** Mara directive is a check-against frame to compare and reconcile, NOT a starting point to defer to. Mags-and-engine-review drive topic assignments; Mara's directive becomes a `## Mara cross-check` block at the bottom of the production log header — "Did our topic assignments answer her questions? Where do they differ?" Don't treat the directive as primary input. This was Mike's explicit correction during S192 ("this is your space not hers"); without it written into the skill, the framing re-drifts every session.

**Mara directive auto-derivation (S215, closes G-4).** When Mara's directive is absent (some cycles don't get one), derive a default `output/mara-directives/mara_directive_c{XX}_AUTO.txt` from: (1) engine review HIGH-severity ailments, (2) prior-cycle Initiative_Tracker `MilestoneNotes` deltas, (3) prior-cycle voice JSON gaps (questions raised in voice statements that no agent answered), (4) C92-style per-voice "missing answer" framing. Voice prep then uses the AUTO directive as the Mara cross-check input; Mara's manual version overrides if she files one later. This converts an optional input into an always-on input without requiring claude.ai turnaround on every cycle.

**Mara directive Drive discovery (S229 G-PREP3).** Mara files her directives manually through claude.ai → Drive; the disk-side path is not always populated even when she filed one. Before AUTO-derivation, check Drive for a manually-filed directive:

1. Check Drive folder `mara-directives/` (or the cycle's Drive folder if a per-cycle convention is set in `docs/media/DRIVE_MANIFEST.md` — verify path on each cycle until convention regularizes) for `mara_directive_c{XX}.{txt,md}`.
2. If found, download via `node scripts/downloadDriveFile.js <fileId> output/mara-directives/mara_directive_c{XX}.txt`.
3. If absent on Drive AND absent on disk, fall back to AUTO-derivation per S215 G-4 with explicit "no manual Mara directive this cycle" warning logged to the production log header.

This converts "operator-side institutional knowledge (Mike hands me the Drive file ID via chat)" into a skill-level step. The Drive folder ID for the `mara-directives/` folder is the canonical pointer; until that ID is hard-coded here or the folder convention regularizes (Mara writes directly to disk via service-account), use Drive search or fall back to AUTO.

**Mara ESCALATION override (S229 G-PREP8).** ESCALATION-tagged Mara directives override absence-of-statement defaults. If Mara filed an ESCALATION directive on a voice agent who is normally treated as absence-meaningful (Okoro per civic.5 — "absence-of-statement is meaningful, don't force a statement"), the voice MUST be assigned a topic. ESCALATION signals Mara already gave that voice one cycle of pass; a second cycle of pass would be canonical drift. Tag the voice's pending_decisions packet with `MARA ESCALATION — voice must respond` so the agent's identity layer sees the override at execution time. Default behavior is override; if Mara explicitly tags `ESCALATION — absence acceptable` (escape clause), the absence-of-statement default holds.

### Step 1: Read All Inputs

Read all 10 inputs above. For each:

**Disk (PRIMARY — G-13, S192).** Read in this order, treat as authoritative:
1. `output/world_summary_c{XX}.md` — snapshots Civic_Office_Ledger (approval ratings + factions) + Initiative_Tracker (phase + MilestoneNotes) post-cycle. This is the canonical pre-civic state input.
2. `output/engine_review_c{XX}.md` — derives from Initiative_Tracker; surfaces ailments + remedy-firing patterns.
3. Previous `output/production_log_c{XX-1}.md` — last cycle's voice outputs + tracker updates + dramatic moments. **Graceful fallback (S225 pipeline.23, closes G-PREP2):** if `production_log_c{XX-1}.md` is missing (early-life cycles, manual intervention, or a /post-publish run that didn't finalize), fall back in this order: (a) split-form historical `output/production_log_edition_c{XX-1}.md` from prior pre-S195 cycles; (b) `output/production_log_city_hall_c{XX-1}.md` (civic-side only — partial context, but better than zero); (c) document the absence in the production log §Step 1 entry and continue without prior-cycle context. Don't silently no-op — surface the missing baseline.
4. Mara directive — the cycle's editorial pressure (citizen accountability questions).
5. **Prior-cycle published canon** (G-15, S192). `editions/cycle_pulse_*_c{XX-1}_*.txt` + `output/reporters/*/articles/c{XX-1}_*.md` — interviews, dispatches, supplementals from prior cycle. Cross-reference each against active topic-assignment initiatives. If interview/dispatch text mentions an active initiative, the voice agents owning that initiative MUST see the canon excerpt in their pending_decisions.md (memory-fenced). Without this, prep ships stale framing — C92's Mayor interview answered 6 OARI/admin questions that voices would otherwise re-litigate.

**Sheets (VERIFICATION — drop unless world-summary is stale).** Sheet reads of Initiative_Tracker / Civic_Office_Ledger / Edition_Coverage_Ratings are redundant if world summary is fresh — every cell that matters is already in the disk inputs above. Run sheet reads ONLY when world_summary mtime is older than the city-hall start time, or when verifying a specific cell. Routine prep reads disk first, sheet second-and-rarely.

**MCP (LOOKUP).** Run `get_council_member` for each district with an active voice — returns live approval/faction (cross-checks world_summary). Run `lookup_initiative` for each active initiative — returns Initiative_Tracker row with MilestoneNotes (cross-checks world_summary phase). Run `get_neighborhood` / `get_neighborhood_state` for affected neighborhoods (S183 wd-neighborhood layer; the latter is narrower). Full tool inventory: [[../../../docs/SUPERMEMORY|SUPERMEMORY]] §Search/save matrix.

**Canon.** Run `search_canon` per active initiative to find what the Tribune has published — promises made, citizen reactions, coverage tone.

Log tracker state, approval ratings, and key findings in the production log.

**Council Roster Reconciliation (BUNDLE-PREP-A, S246 — closes the class that produced G-PREP1).** The MCP `get_council_member` call above returns each district's live faction from truesource; that signal is wasted unless it's reconciled against this skill's static roster. The Chen D8 mis-routing (a stale "S195 correction" that flipped her CRC→OPP in the skill text + 8 agent roster tables while truesource kept her CRC) survived multiple cycles precisely because nobody compared the two. Run the reconciliation every prep:

```bash
# Truesource faction per district (the authority — the same source the MCP wraps):
node -e "require('./output/desk-packets/truesource_reference.json').council.forEach(m=>console.log(m.district+': '+m.faction+' ('+m.name+')'))"
```

(In-session, the `mcp__godworld__get_council_member` tool returns the same per-district faction — either source works; both read truesource. `scripts/godworld-mcp.py` is an MCP stdio server, not a CLI, so don't shell out to it.)

`get_council_member` also returns each seat's **status** (`active` / `recovering` / `vacant`). Reconcile status too: a `recovering` member (D6 Crane this window) must be carried in the 9-seat roster as a NAMED absentee with the active-voter denominator reduced — world_summary historically drops non-`active` seats, so verify the recovering/vacant seats against truesource here and feed them into every vote-math tally. Full enum + vote-math mapping: [[../../../.claude/rules/civic.md|civic.md]] §Council member status enum.

Compare each district's truesource faction against (a) the **Council canonical roster** in §Voice Data Routing above, and (b) the per-district roster tables in the civic-office agent RULES.md files. **Any mismatch is a HIGH anomaly** — surface it to Mike and do NOT proceed past Step 1 until the static roster is corrected to match truesource (`truesource_reference.json` + `buildCivicVoicePackets.js` FACTION_DISTRICTS are the operational source; static skill/agent text is the thing that drifts). Truesource wins; the text gets fixed forward. Faction membership is load-bearing for the entire cascade — a mis-routed member means the wrong faction agent speaks for them and vote-math attribution is wrong.

**World summary stale-civic-decisions framing (S215, closes G-7).** The world summary's §Civic Decisions section can read stale if the current cycle's `/city-hall` hasn't run yet — it presents the prior-cycle cascade as if locked, with a small disclaimer reader has to notice. When ingesting world_summary at Step 1, treat any §Civic Decisions data as "Last Locked (C{XX-1})" until the current cycle produces new voice JSONs. Don't propagate stale framing into pending_decisions packets — voice agents must see explicit "C{XX-1} canon, C{XX} not yet decided" labeling. Engine-side fix is filed at pipeline.14 (world_summary auto-rebuild after /city-hall); until that ships, the disclaimer-respect rule lives here.

**Auto-investigate engine-flagged initiatives (S216, closes civic.11).** Engine review can false-flag a phase-advanced initiative as `mitigator-stuck` or `remedy-not-firing` — civic.7's INIT-005 C93 case was a Scenario C engine-auditor bug where `cyclesInPhase` walked priors, found a phase mismatch, and triggered the cold-start fallback. Before propagating any engine-review ailment of class `mitigator-stuck` or `remedy-not-firing` into topic assignments, run the MilestoneNotes reader for each affected initiative:

```bash
node scripts/readInitiativeMilestoneNotes.js <INIT-ID> {XX}
```

Capture the output to the production log. Three dispositions:

- **MilestoneNotes contains a C{XX} entry naming concrete progress** → engine auditor likely false-flagged (Scenario C, phase advanced this cycle). Drop the ailment from the topic-assignment surface; note "engine auditor false positive verified via MilestoneNotes" in the production log. Don't burn voice cycles re-litigating phase advances that happened.
- **MilestoneNotes has no C{XX} entry** → real signal (Scenario A — commitment slipped, or B — writeback bug). Surface the highlighted history to the owning voice's topic assignment with the missing-entry note ("no C{XX} milestone yet — voice owes a commitment-status update").
- **MilestoneNotes has a C{XX} entry that contradicts the engine flag** (e.g., "delayed pending council approval") → real but reframed. Surface to topic assignment with the contradicting note attached so the voice agent sees the documented reason and can respond against it.
- **Scenario D — the paradox: remedy-overshot AND phase-duration-stuck (G-PREP3).** The engine flags an initiative `phase-duration-stuck` while its remedy is simultaneously *overshooting* — the program is demonstrably working but hasn't advanced phase. C95 OARI is the canonical case: `ViolentCrimeIndex -1 observed vs -0.05 expected` (remedy fired ~20× target) yet 13 cycles in `pilot_evaluation`. This is NOT a stuck-and-failing story and must not generate manufactured stuck-drama — the engine-side fix (ES-4, `bc3b893` — vote-passed initiatives exit stuck-drama detection) removes most of these at source, but when the paradox still surfaces, route it to the **Mayor** with the paradox named and one of three skill-canonical public frames as the decision options:
  1. **Success-declare / scale** — the overshoot proves the pilot worked; advance phase on the strength of results (expand scope, move to next stage).
  2. **Calibrate-and-hold** — the overshoot signals the intervention is over-sized for the target; right-size before advancing. The held phase is deliberate diligence, not failure.
  3. **Steady-state transition** — reframe from active-pilot to ongoing-program; the phase isn't "stuck," it matured into operations and the duration flag is a category error.
  Surface all three as the Mayor's pending-decision options (real consequences each); the faction blocs then react to the Mayor's chosen frame per the cascade. Do not let the auto-investigate drop the ailment silently (it's real signal) nor propagate it as a stuck-crisis (it's a success the engine mislabeled).

Runs at Step 1, before Step 2 builds topic assignments. The auto-investigation prevents a cycle of voice work being wasted on phantom-stuck initiatives like INIT-005 was in C93. Plan + Scenario C trace: [[../../../docs/plans/2026-05-11-civic-7-init-005-investigation]].

**Anomaly-only present-to-Mike gate (S215, closes G-6 Step 1 side).** Previous convention: always present Step 1 input summary to Mike. New convention: compute input completeness automatically (all expected files present, all approval ratings reasonable, all initiatives accounted for) and surface to Mike ONLY on anomaly:

- **Council roster reconciliation mismatch** — any district whose truesource faction differs from the static roster (BUNDLE-PREP-A; HIGH, blocks past Step 1)
- Approval shift >5pts on any council member from prior cycle
- HIGH-severity engine ailment unaddressed (no topic assignment in §Topic Assignments for it)
- New initiative phase change since prior cycle (vote-ready, design-active, etc.)
- Missing C{XX-1} voice output for an agent expected to speak this cycle
- World summary mtime older than city-hall start (G-7 staleness condition)

If none of those fire, Step 1 completes silently with one-line "no anomalies — proceeding to Step 2" log entry. Operator escalates to Mike's review only on actual anomaly.

### Step 2: Topic Assignments

Based on tracker state + Mike's pressure + engine review ailments + Mara directive, determine:
- Which voices have decisions this cycle
- Which initiative/topic each voice owns (atomic checkout — no overlap)
- Cascade order (Mayor always first, then who reacts to Mayor)
- Engine review ailments auto-assign to relevant voices (Temescal health → Health Center + whoever owns health policy)

Log assignments in the production log:
```
## Topic Assignments
- OARI: Mayor (political) → Montez (operational) → Tran-Muñoz (project)
- Stabilization Fund: Mayor (enforcement) → Vega (oversight)
- [ENGINE AILMENT] Temescal health 4-cycle: Health Center (Chen-Ramirez) + Mayor
```

### Step 3: Write Pending Decisions

For each voice with a decision, write `output/civic-voice-workspace/{office}/current/pending_decisions.md`.

**Each pending decision includes:**
- The situation in plain language
- 2-3 predefined options with real consequences
- An open option ("Your call. Make your own move.")
- Who's watching
- Their current approval rating and vulnerability
- Their district's neighborhoods and how initiatives affect them
- Coverage feedback — did the Tribune cover their domain positively or negatively
- Engine review context — is an ailment in their domain recurring or worsening
- What they said last cycle (from previous voice output JSON) — continuity
- What the Tribune published about their initiatives (from canon search) — public record
- Mara directive pressure if relevant
- "No decision is not an option this cycle."

**Each pending decision does NOT include:**
- Citizen lists
- Raw neighborhood demographics
- Full crime data dumps
- Full initiative packets
- Anything from buildInitiativePackets.js

### Step 4: Verify Prep Outputs (anomaly-only gate, S215 G-6)

Check all files exist:
- Production log created with tracker state + approvals + topic assignments
- Pending decisions written for each assigned voice
- Previous cycle context loaded and referenced
- Any pending_decisions referencing a council member matches the canonical 9-member roster (D1-D9 per Civic_Office_Ledger)
- Vote-trigger detection: any initiative at `vote-ready` phase with NextActionCycle = current cycle is routed to all 9 council voices via faction-bloc agents (G-R11 pre-condition)

**Anomaly-only present-to-Mike (S215, closes G-6 Step 4 side).** City Clerk pre-flight pass verifies voice files exist for assigned voices, content matches assignments, no canon violations. If Clerk passes clean, Step 4 completes silently with one-line "prep verified — running /city-hall" log entry. Mike's review fires only when Clerk flags a structural issue:

- Pending_decisions packet references a non-canonical council member (e.g., wrong district)
- Vote-ready initiative not routed to faction-bloc agents
- Missing pending_decisions for a voice expected to speak (per topic assignments)
- Approval ratings inconsistent between disk inputs and pending_decisions packet
- Quarantine subdirs accidentally re-included in canon scope (G-R12 — see city-clerk RULES.md)

Default outcome: silent pass. Mike-review outcome: anomaly named + suggested fix proposed before `/city-hall` runs.

## Output Files

| File | Purpose |
|------|---------|
| `output/production_log_c{XX}.md` | Opened — §Cycle Header + §Carry-Forward + `## /city-hall-prep` section (Steps 0-2 complete, tracker state, approvals, topic assignments) |
| `output/civic-voice-workspace/{office}/current/pending_decisions.md` | One per voice with decisions this cycle |

## Handoff to /city-hall

When this skill completes, `/city-hall` picks up by reading:

| File | What city-hall does with it |
|------|---------------------------|
| `output/production_log_c{XX}.md` | Appends its `## /city-hall` section to this log — voice decisions, tracker updates, media handoff |
| `output/civic-voice-workspace/{office}/current/pending_decisions.md` | Each voice agent reads ONLY this file + their IDENTITY.md. Nothing else. |

`/city-hall` does NOT re-read sheets, MCP, or Supermemory. Everything it needs is in the files this skill produced. If the prep is right, city-hall is mechanical.

## What This Skill Does NOT Do

- Launch voice agents — that's `/city-hall`
- Apply tracker updates — that's `/city-hall`
- Run project agents — that's `/city-hall`
- Run the City Clerk — that's `/city-hall`
- Pick edition stories — that's `/sift`

## Where This Sits

After `/run-cycle` (which produces world summary and engine review). Before `/city-hall`.

## Sheet Access

Service account via `lib/sheets.js`. Spreadsheet ID from `.env`.
GodWorld MCP for structured lookups. Supermemory `bay-tribune` for canon search.

## Gap log (S212 — see [[../../docs/plans/GAP_LOG_TEMPLATE]])

At skill close, capture friction observed during prep as a gap log. /city-hall-prep is a heavy skill at the **civic generator terminal**; sidecar gap logs catch inefficiency the skill couldn't catch while running.

**Output path:** `output/production_log_city_hall_c<XX>_gaps.md` (sidecar to `output/production_log_city_hall_c<XX>.md`).

**Gap prefix:** **G-PREP\*** (e.g., G-PREP1, G-PREP15. /city-hall *run* uses G-R\*.)

**Common categories for /city-hall-prep gaps:**
- pipeline-fragility (MCP outage on `lookup_initiative` / `get_council_member`, derivative-doc staleness)
- user-soft (between-cycle published-canon ingestion, voice routing surprises)
- process-gap (skill-vs-actual-practice drift, sheet-read steps demoted because world summary already snapshots)
- canon-risk (faction-bloc topology in voice routing table — Mara-additive framing, faction-vs-individual confusion)

**Discipline:** write the gap log even on clean runs. File a ROLLOUT row in `civic.<n>` pointing at the gap log per ADR-0005 §How to add work. Promote individual HIGH gaps as bandwidth allows.

## Changelog

- 2026-04-17 — v1.0 initial (S156). Voice routing table listed 17 voices including 9 individual council members.
- 2026-05-03 — v1.1 (S197, engine-sheet executing research-build Wave 1 plan per [[../../../docs/plans/2026-05-03-c93-gap-triage-execution]]). **G-10 Voice Data Routing rewritten:** table now shows the 11 actual agent rows (Mayor + Chief + DA + 3 faction-bloc agents speaking for the 9 council members + 5 project agents) instead of misleading reader into expecting 17 individual agents. Faction membership per Civic_Office_Ledger; previous text mis-listed Chen D8 as CRC, corrected to OPP. **[SUPERSEDED S246 G-PREP1 — this "corrected to OPP" was itself the error; truesource (`truesource_reference.json` + `buildCivicVoicePackets.js`) has Chen as CRC all along. Reverted forward; see roster above.]** **G-13 Step 1 sheet reads demoted to verification:** Disk inputs (world_summary + engine_review + prior production log + prior published canon) are PRIMARY; sheet reads run ONLY when world_summary is stale. Captures actual S192 working practice (sheet reads were skipped because world_summary already snapshotted everything that mattered). Companion entry on G-15 (between-cycle published canon ingestion) added to Step 1 as Disk source #5.
- 2026-05-12 — v1.2 (S216, research-build closing civic.11). **Step 1 — Auto-investigate engine-flagged initiatives:** wired `scripts/readInitiativeMilestoneNotes.js` for `mitigator-stuck` / `remedy-not-firing` ailments. Three dispositions (Scenario A / B / C) computed before Step 2 topic-assignment build, capturing the civic.7 INIT-005 false-positive case as a routine prep-time disambiguation rather than a same-cycle wasted voice cycle. Plan: [[../../../docs/plans/2026-05-11-civic-7-init-005-investigation]].
